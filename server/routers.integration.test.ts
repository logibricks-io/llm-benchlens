import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/** Public procedures only need a minimal context. */
function publicCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

const caller = appRouter.createCaller(publicCtx());

describe("benchmarks.list", () => {
  it("returns the loaded meta-model rows with numeric derived fields", async () => {
    const rows = await caller.benchmarks.list();
    expect(rows.length).toBeGreaterThanOrEqual(80);
    for (const r of rows.slice(0, 20)) {
      expect(typeof r.difficultyCoefficient).toBe("number");
      expect(typeof r.utilityScore).toBe("number");
      expect(r.difficultyCoefficient).toBeGreaterThan(0.5);
      expect(r.difficultyCoefficient).toBeLessThan(2.5);
      expect(r.trustScore).toBeGreaterThanOrEqual(0);
      expect(r.trustScore).toBeLessThanOrEqual(100);
    }
  });

  it("exposes a low CI disclosure rate, matching the surveyed reality", async () => {
    const o = await caller.meta.overview();
    expect(o.benchmarks).toBeGreaterThanOrEqual(80);
    expect(o.ciDisclosureRate).toBeLessThan(40);
    expect(o.saturated + o.contested + o.frontier).toBe(o.benchmarks);
  });
});

describe("models.matrix", () => {
  it("decorates every score with provenance and normalization", async () => {
    const rows = await caller.models.matrix();
    expect(rows.length).toBeGreaterThan(100);
    for (const r of rows) {
      expect(r.sourceUrl, `missing sourceUrl for ${r.modelSlug}/${r.benchmarkSlug}`).toBeTruthy();
      expect(["fresh", "recent", "aging", "stale"]).toContain(r.freshness);
      expect(r.normalized).toBeGreaterThanOrEqual(0);
      expect(r.normalized).toBeLessThanOrEqual(100);
      expect(r.commonScale).toBeGreaterThanOrEqual(0);
      expect(r.commonScale).toBeLessThanOrEqual(100);
    }
  });

  it("scales Elo scores onto the common 0-100 scale rather than leaving them raw", async () => {
    const rows = await caller.models.matrix();
    const elo = rows.filter(r => r.scoreForm === "elo");
    if (elo.length === 0) return;
    for (const r of elo) {
      expect(r.rawScore).toBeGreaterThan(100);
      expect(r.commonScale).toBeLessThanOrEqual(100);
    }
  });
});

describe("benchmarks.detail", () => {
  it("returns leaderboard sorted by common scale and a version ledger", async () => {
    const list = await caller.benchmarks.list();
    const withScores = list.find(b => b.scoreCount >= 3);
    if (!withScores) return;
    const detail = await caller.benchmarks.detail({ slug: withScores.slug });
    expect(detail.benchmark.slug).toBe(withScores.slug);
    for (let i = 1; i < detail.leaderboard.length; i++) {
      expect(detail.leaderboard[i - 1].commonScale).toBeGreaterThanOrEqual(detail.leaderboard[i].commonScale);
    }
    const total = detail.versions.reduce((a, v) => a + v.count, 0);
    expect(total).toBe(detail.leaderboard.length);
  });

  it("throws NOT_FOUND for an unknown slug", async () => {
    await expect(caller.benchmarks.detail({ slug: "does-not-exist-xyz" })).rejects.toThrow();
  });
});

describe("models.compare", () => {
  it("reports only genuinely shared benchmarks", async () => {
    const models = await caller.models.list();
    const top = models.filter(m => m.coverage >= 3).slice(0, 2);
    if (top.length < 2) return;
    const res = await caller.models.compare({ slugs: top.map(m => m.slug) });
    expect(res.models).toHaveLength(2);
    for (const slug of res.sharedBenchmarks) {
      const forSlug = new Set(res.rows.filter(r => r.benchmarkSlug === slug).map(r => r.modelSlug));
      expect(forSlug.size).toBe(2);
    }
  });
});

describe("recommend.byScenario", () => {
  it("ranks by fit score and attaches supporting evidence with provenance", async () => {
    const res = await caller.recommend.byScenario({ scenario: "agentic_coding" });
    expect(res.scenario.key).toBe("agentic_coding");
    for (let i = 1; i < res.results.length; i++) {
      expect(res.results[i - 1].fitScore).toBeGreaterThanOrEqual(res.results[i].fitScore);
    }
    for (const r of res.results) {
      expect(r.evidence.length).toBeGreaterThan(0);
      expect(r.evidenceCount).toBeGreaterThanOrEqual(2);
      for (const e of r.evidence) {
        expect(e.weight).toBeGreaterThan(0);
        expect(e.normalized).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("honours the open-weight constraint", async () => {
    const res = await caller.recommend.byScenario({ scenario: "agentic_coding", openWeightOnly: true });
    for (const r of res.results) expect(r.license).toBe("open");
  });

  it("honours the output price ceiling", async () => {
    const res = await caller.recommend.byScenario({ scenario: "agentic_coding", maxOutputPrice: 12 });
    for (const r of res.results) {
      if (r.priceOutput !== null) expect(r.priceOutput).toBeLessThanOrEqual(12);
    }
  });

  it("rejects an unknown scenario", async () => {
    await expect(caller.recommend.byScenario({ scenario: "not_a_scenario" })).rejects.toThrow();
  });
});

describe("benchmarks.filters", () => {
  it("returns facet counts that sum to the total benchmark count", async () => {
    const f = await caller.benchmarks.filters();
    expect(f.total).toBeGreaterThanOrEqual(80);
    for (const key of [
      "capabilityDomain",
      "saturationStatus",
      "issuerStance",
      "scoringMechanism",
      "strictness",
      "contaminationRisk",
    ] as const) {
      const facet = f[key];
      expect(facet.length).toBeGreaterThan(0);
      const sum = facet.reduce((a, o) => a + o.count, 0);
      expect(sum, `facet ${key} should cover every benchmark`).toBe(f.total);
      // Facets must arrive pre-sorted by count so the UI can trust the order.
      for (let i = 1; i < facet.length; i++) {
        expect(facet[i - 1].count).toBeGreaterThanOrEqual(facet[i].count);
      }
    }
  });
});

describe("admin.refresh", () => {
  it("is access-controlled and rejects anonymous callers", async () => {
    await expect(caller.admin.refreshLog()).rejects.toThrow();
    await expect(caller.admin.refreshData({ scope: "all" })).rejects.toThrow();
  });

  it("rejects a signed-in non-admin user", async () => {
    const userCaller = appRouter.createCaller({
      ...publicCtx(),
      user: {
        id: 2,
        openId: "plain-user",
        email: null,
        name: "Plain User",
        loginMethod: "manus",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
    } as TrpcContext);
    await expect(userCaller.admin.refreshData({ scope: "all" })).rejects.toThrow(/FORBIDDEN|forbidden/i);
  });
});
