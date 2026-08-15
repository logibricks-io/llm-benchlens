import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function anonCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as unknown as TrpcContext["res"],
  };
}

/**
 * These guard the property that makes the meta-model trustworthy: our own
 * derived metrics must not exhibit the failure mode we criticise in other
 * leaderboards (ceiling saturation), and "utility" must reflect how usable a
 * benchmark actually is for comparison, not just how nicely it is designed.
 */
describe("derived metric calibration", () => {
  it("keeps every derived metric strictly below its ceiling", async () => {
    const caller = appRouter.createCaller(anonCtx());
    const rows = await caller.benchmarks.list();
    expect(rows.length).toBeGreaterThan(50);

    for (const b of rows) {
      expect(b.trustScore).toBeLessThan(100);
      expect(b.discriminativePower).toBeLessThan(100);
      expect(b.utilityScore).toBeLessThan(100);
      expect(b.utilityScore).toBeGreaterThan(0);
    }
  });

  it("retains spread in utility instead of piling up at the top", async () => {
    const caller = appRouter.createCaller(anonCtx());
    const rows = await caller.benchmarks.list();
    const utils = rows.map(b => b.utilityScore);
    const max = Math.max(...utils);
    const min = Math.min(...utils);

    // A usable ranking signal needs real range.
    expect(max - min).toBeGreaterThan(30);

    // No more than a handful may share the top decile, otherwise the metric
    // has re-saturated and stopped discriminating.
    const topDecile = utils.filter(u => u >= max - (max - min) * 0.1).length;
    expect(topDecile).toBeLessThan(rows.length * 0.15);
  });

  it("discounts benchmarks that have no traceable evidence, holding design quality fixed", async () => {
    const caller = appRouter.createCaller(anonCtx());
    const rows = await caller.benchmarks.list();

    // Comparing zero-evidence rows against ALL measured rows would be the wrong
    // test: many heavily-measured benchmarks (AIME, GPQA) are saturated and
    // legitimately score low. The evidence discount is only meaningful when
    // design quality is held roughly constant, so compare against peers with
    // similar trust AND discriminative power.
    const unmeasured = rows.filter(b => b.scoreCount === 0);
    if (unmeasured.length === 0) return;

    for (const bench of unmeasured) {
      const peers = rows.filter(
        p =>
          p.scoreCount >= 4 &&
          Math.abs(p.trustScore - bench.trustScore) <= 8 &&
          Math.abs(p.discriminativePower - bench.discriminativePower) <= 8,
      );
      if (peers.length === 0) continue;

      const peerAvg = peers.reduce((a, p) => a + p.utilityScore, 0) / peers.length;
      // Same design quality, but nothing measured on it yet => strictly lower utility.
      expect(bench.utilityScore).toBeLessThan(peerAvg);
    }
  });
});
