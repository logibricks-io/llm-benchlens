import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";

/**
 * The scheduled audit endpoint is the only route on this site that a machine
 * calls unattended, so its access control and its failure semantics matter more
 * than its happy path: a wrong status code makes the platform retry a rejection
 * three times.
 */
function mockRes() {
  const out: { status: number; body: unknown } = { status: 200, body: null };
  const res = {
    status(code: number) {
      out.status = code;
      return this;
    },
    json(body: unknown) {
      out.body = body;
      return this;
    },
  } as unknown as Response;
  return { res, out };
}

function mockReq(cookie?: string): Request {
  return {
    originalUrl: "/api/scheduled/auditData",
    headers: cookie ? { cookie } : {},
  } as unknown as Request;
}

describe("scheduled auditData handler", () => {
  it("rejects anonymous callers with 403, not 500", async () => {
    const { auditDataHandler } = await import("./scheduled");
    const { res, out } = mockRes();

    await auditDataHandler(mockReq(), res);

    // 5xx would make the platform retry a request that can never succeed.
    expect(out.status).toBe(403);
    expect(out.body).toEqual({ error: "cron-only" });
  });

  it("rejects authenticated non-cron users", async () => {
    vi.resetModules();
    vi.doMock("./_core/sdk", () => ({
      sdk: {
        authenticateRequest: async () => ({ id: 7, openId: "real-user", isCron: false }),
      },
    }));

    const { auditDataHandler } = await import("./scheduled");
    const { res, out } = mockRes();
    await auditDataHandler(mockReq("app_session_id=x"), res);

    expect(out.status).toBe(403);
    vi.doUnmock("./_core/sdk");
    vi.resetModules();
  });

  it("returns a health summary for a genuine cron caller", async () => {
    vi.resetModules();
    vi.doMock("./_core/sdk", () => ({
      sdk: {
        authenticateRequest: async () => ({
          id: -1,
          openId: "cron_abc",
          isCron: true,
          taskUid: "task_123",
        }),
      },
    }));

    const { auditDataHandler } = await import("./scheduled");
    const { res, out } = mockRes();
    await auditDataHandler(mockReq("app_session_id=x"), res);

    expect(out.status).toBe(200);
    const body = out.body as {
      ok: boolean;
      benchmarks: number;
      scoreRows: number;
      coveragePct: number;
      missingProvenance: number;
      freshness: { fresh: number; aging: number; stale: number };
    };

    expect(body.ok).toBe(true);
    expect(body.benchmarks).toBeGreaterThan(50);
    expect(body.scoreRows).toBeGreaterThan(100);
    // The provenance gate is the product's core promise; it must hold.
    expect(body.missingProvenance).toBe(0);
    const f = body.freshness;
    expect(f.fresh + f.aging + f.stale).toBe(body.scoreRows);

    vi.doUnmock("./_core/sdk");
    vi.resetModules();
  });
});
