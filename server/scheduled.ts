import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import * as db from "./db";

/**
 * Heartbeat callback: `/api/scheduled/auditData`.
 *
 * Deliberately NOT a scraper. Fetching 20+ third-party leaderboards, resolving
 * model aliases and re-deriving meta-model fields does not fit a 2-minute,
 * 512 MiB serverless invocation, and silently importing unverified numbers
 * would break the one rule the whole product rests on: every score is
 * traceable to a real source.
 *
 * So the scheduled job owns the part that IS safe to automate — measuring the
 * health of the base and recording it, so staleness becomes visible on its own
 * instead of waiting for someone to look. Collection itself stays an explicit,
 * reviewed act (the wide-research scripts in `scripts/`).
 */
export async function auditDataHandler(req: Request, res: Response) {
  try {
    // An unauthenticated or non-cron caller is a business rejection, not a
    // server fault: it must surface as 4xx so the platform does not retry it
    // three times.
    let user: Awaited<ReturnType<typeof sdk.authenticateRequest>>;
    try {
      user = await sdk.authenticateRequest(req);
    } catch {
      return res.status(403).json({ error: "cron-only" });
    }
    if (!user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only" });
    }

    const [bms, all] = await Promise.all([db.listBenchmarks(), db.listScores()]);

    const covered = new Set(all.map(s => s.benchmarkId));
    const now = Date.now();
    const DAY = 86_400_000;

    let fresh = 0;
    let aging = 0;
    let stale = 0;
    let missingProvenance = 0;

    for (const s of all) {
      if (!s.sourceUrl) missingProvenance++;
      const t = s.measuredAt ? Date.parse(String(s.measuredAt)) : NaN;
      if (!Number.isFinite(t)) {
        stale++;
        continue;
      }
      const age = (now - t) / DAY;
      if (age <= 30) fresh++;
      else if (age <= 240) aging++;
      else stale++;
    }

    const stalePct = all.length ? Math.round((stale / all.length) * 1000) / 10 : 0;
    const coveragePct = bms.length ? Math.round((covered.size / bms.length) * 1000) / 10 : 0;

    const note = [
      `coverage ${covered.size}/${bms.length} (${coveragePct}%)`,
      `evidence ${all.length} rows`,
      `fresh ${fresh} · aging ${aging} · stale ${stale} (${stalePct}%)`,
      `uncovered ${bms.length - covered.size}`,
      missingProvenance > 0
        ? `WARN missing provenance ${missingProvenance}`
        : "provenance complete",
    ].join(" · ");

    await db.recordRefresh("scheduled", "audit", all.length, note);

    return res.json({
      ok: true,
      benchmarks: bms.length,
      coveredBenchmarks: covered.size,
      coveragePct,
      scoreRows: all.length,
      freshness: { fresh, aging, stale, stalePct },
      missingProvenance,
    });
  } catch (error) {
    const err = error as Error;
    return res.status(500).json({
      error: err.message,
      stack: err.stack,
      context: { url: req.originalUrl },
      timestamp: new Date().toISOString(),
    });
  }
}
