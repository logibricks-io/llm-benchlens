import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  evidenceWeight,
  freshnessOf,
  normalizedScore,
  SCENARIOS,
  scenarioByKey,
  scenarioWeight,
  toCommonScale,
} from "../shared/metaModel";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";

/** Row shape returned by db.listScores(), with decimals coerced to numbers. */
type ScoreRow = Awaited<ReturnType<typeof db.listScores>>[number];

function num(v: unknown): number {
  return typeof v === "number" ? v : Number(v ?? 0);
}

function decorate(row: ScoreRow) {
  const bm = {
    slug: row.benchmarkSlug,
    scoreForm: row.scoreForm,
    difficultyCoefficient: num(row.difficultyCoefficient),
    trustScore: row.trustScore,
    discriminativePower: row.discriminativePower,
    saturationStatus: row.saturationStatus,
    capabilityDomain: row.capabilityDomain,
    isAgentic: row.isAgentic,
    hasNegativeAssertions: row.hasNegativeAssertions,
  };
  const raw = num(row.rawScore);
  return {
    ...row,
    rawScore: raw,
    rawScoreSecondary: row.rawScoreSecondary === null ? null : num(row.rawScoreSecondary),
    priceInput: row.priceInput === null ? null : num(row.priceInput),
    priceOutput: row.priceOutput === null ? null : num(row.priceOutput),
    difficultyCoefficient: num(row.difficultyCoefficient),
    commonScale: toCommonScale(raw, row.scoreForm),
    normalized: normalizedScore(raw, bm),
    evidenceWeight: evidenceWeight(bm, row.sourceType),
    freshness: freshnessOf(row.measuredAt),
  };
}

type DecoratedScore = ReturnType<typeof decorate>;

type Weighted = { r: DecoratedScore; w: number };

/**
 * Explicit shape for the benchmark list endpoint. Declaring this keeps the
 * decimal-column coercion from collapsing the inferred client type.
 */
export type BenchmarkListItem = {
  id: number;
  slug: string;
  name: string;
  version: string | null;
  issuer: string | null;
  issuerStance: string;
  capabilityDomain: string;
  taskCount: string | null;
  scoringMechanism: string;
  strictness: string;
  metricUnit: string | null;
  scoreForm: string;
  humanBaseline: string | null;
  currentSotaScore: string | null;
  saturationStatus: string;
  contaminationRisk: string;
  usesLlmJudge: boolean;
  hasNegativeAssertions: boolean;
  isAgentic: boolean;
  isOpenSource: boolean;
  reportsCost: boolean;
  ciDisclosed: boolean;
  confidenceInterval: string | null;
  trustScore: number;
  discriminativePower: number;
  difficultyCoefficient: number;
  utilityScore: number;
  scenarioMapping: string | null;
  interpretationCaveat: string | null;
  notes: string | null;
  officialUrl: string | null;
  paperUrl: string | null;
  scoreCount: number;
};

export type BenchmarkDetailPayload = {
  benchmark: Omit<BenchmarkListItem, "scoreCount">;
  leaderboard: DecoratedScore[];
  versions: Array<{ version: string; count: number; firstSeen: string | null; lastSeen: string | null }>;
};

function toBenchmark<T extends { difficultyCoefficient: unknown; utilityScore: unknown }>(b: T) {
  return {
    ...b,
    difficultyCoefficient: num(b.difficultyCoefficient),
    utilityScore: num(b.utilityScore),
  };
}

/** Aggregate a model's standing from its measurements, weighted by evidence. */
function aggregate(rows: DecoratedScore[], weightOf: (r: DecoratedScore) => number) {
  let wsum = 0;
  let acc = 0;
  for (const r of rows) {
    const w = weightOf(r);
    if (w <= 0) continue;
    wsum += w;
    acc += w * r.normalized;
  }
  return { score: wsum > 0 ? Math.round((acc / wsum) * 10) / 10 : null, weightSum: Math.round(wsum * 100) / 100 };
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  meta: router({
    /** Global coverage + freshness summary for the header and dashboards. */
    overview: publicProcedure.query(async () => {
      const [stats, all] = await Promise.all([db.coverageStats(), db.listScores()]);
      const decorated = all.map(decorate);
      const buckets = { fresh: 0, recent: 0, aging: 0, stale: 0 };
      for (const r of decorated) buckets[r.freshness]++;
      const bms = await db.listBenchmarks();
      const ciDisclosed = bms.filter(b => b.ciDisclosed).length;
      return {
        ...stats,
        freshness: buckets,
        ciDisclosed,
        ciDisclosureRate: bms.length ? Math.round((ciDisclosed / bms.length) * 1000) / 10 : 0,
        saturated: bms.filter(b => b.saturationStatus === "saturated").length,
        contested: bms.filter(b => b.saturationStatus === "contested").length,
        frontier: bms.filter(b => b.saturationStatus === "frontier").length,
        avgTrust: bms.length ? Math.round((bms.reduce((a, b) => a + b.trustScore, 0) / bms.length) * 10) / 10 : 0,
        avgDiscriminative: bms.length
          ? Math.round((bms.reduce((a, b) => a + b.discriminativePower, 0) / bms.length) * 10) / 10
          : 0,
      };
    }),
    scenarios: publicProcedure.query(() =>
      SCENARIOS.map(s => ({ key: s.key, title: s.title, summary: s.summary, emphasisSlugs: s.emphasisSlugs })),
    ),
  }),

  benchmarks: router({
    list: publicProcedure.query(async (): Promise<BenchmarkListItem[]> => {
      const [bms, all] = await Promise.all([db.listBenchmarks(), db.listScores()]);
      const counts = new Map<number, number>();
      for (const s of all) counts.set(s.benchmarkId, (counts.get(s.benchmarkId) ?? 0) + 1);
      return bms.map(b => ({
        ...b,
        difficultyCoefficient: num(b.difficultyCoefficient),
        utilityScore: num(b.utilityScore),
        scoreCount: counts.get(b.id) ?? 0,
      }));
    }),

    detail: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }): Promise<BenchmarkDetailPayload> => {
        const bm = await db.getBenchmarkBySlug(input.slug);
        if (!bm) throw new TRPCError({ code: "NOT_FOUND", message: "Benchmark not found" });
      const rows = (await db.listScoresForBenchmark(bm.id)).map(decorate);
      rows.sort((a, b) => b.commonScale - a.commonScale);
      // Version history is derived from the distinct benchmarkVersion values seen
      // across score entries, which is how version drift actually surfaces.
      const versionMap = new Map<string, { version: string; count: number; firstSeen: string | null; lastSeen: string | null }>();
      for (const r of rows) {
        const key = r.benchmarkVersion ?? "未标注版本";
        const cur = versionMap.get(key) ?? { version: key, count: 0, firstSeen: null, lastSeen: null };
        cur.count++;
        if (r.measuredAt) {
          if (!cur.firstSeen || r.measuredAt < cur.firstSeen) cur.firstSeen = r.measuredAt;
          if (!cur.lastSeen || r.measuredAt > cur.lastSeen) cur.lastSeen = r.measuredAt;
        }
        versionMap.set(key, cur);
      }
      return {
        benchmark: {
          ...bm,
          difficultyCoefficient: num(bm.difficultyCoefficient),
          utilityScore: num(bm.utilityScore),
        },
        leaderboard: rows,
        versions: Array.from(versionMap.values()).sort((a, b) => b.count - a.count),
      };
    }),

    /**
     * Filter option sets with live counts, so the UI never renders a facet that
     * would yield an empty result.
     */
    filters: publicProcedure.query(async () => {
      const bms = await db.listBenchmarks();
      const facet = (key: keyof (typeof bms)[number]) => {
        const counts = new Map<string, number>();
        for (const b of bms) {
          const v = String(b[key]);
          counts.set(v, (counts.get(v) ?? 0) + 1);
        }
        return Array.from(counts.entries())
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => b.count - a.count);
      };
      return {
        capabilityDomain: facet("capabilityDomain"),
        saturationStatus: facet("saturationStatus"),
        issuerStance: facet("issuerStance"),
        scoringMechanism: facet("scoringMechanism"),
        strictness: facet("strictness"),
        contaminationRisk: facet("contaminationRisk"),
        total: bms.length,
      };
    }),
  }),

  models: router({
    list: publicProcedure.query(async () => {
      const [ms, all] = await Promise.all([db.listModels(), db.listScores()]);
      const decorated = all.map(decorate);
      const bySlug = new Map<string, DecoratedScore[]>();
      for (const r of decorated) {
        const arr = bySlug.get(r.modelSlug) ?? [];
        arr.push(r);
        bySlug.set(r.modelSlug, arr);
      }
      return ms.map(m => {
        const rows = bySlug.get(m.slug) ?? [];
        const agg = aggregate(rows, r => r.evidenceWeight);
        return {
          ...m,
          priceInput: m.priceInput === null ? null : num(m.priceInput),
          priceOutput: m.priceOutput === null ? null : num(m.priceOutput),
          coverage: rows.length,
          compositeScore: agg.score,
          evidenceWeight: agg.weightSum,
          domains: Array.from(new Set(rows.map((r: DecoratedScore) => r.capabilityDomain))),
        };
      });
    }),

    /** The full matrix, decorated with normalization + provenance + freshness. */
    matrix: publicProcedure.query(async (): Promise<DecoratedScore[]> => {
      const rows = (await db.listScores()).map(decorate);
      return rows;
    }),

    compare: publicProcedure
      .input(z.object({ slugs: z.array(z.string()).min(1).max(4) }))
      .query(async ({ input }) => {
        const rows = (await db.listScoresForModelSlugs(input.slugs)).map(decorate);
        const models = await Promise.all(input.slugs.map(s => db.getModelBySlug(s)));
        const present = models.filter((m): m is NonNullable<typeof m> => Boolean(m));
        if (present.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "No such model" });

        // Only benchmarks measured for every selected model are truly comparable.
        const perModel = new Map<string, Set<string>>();
        for (const r of rows) {
          const set = perModel.get(r.modelSlug) ?? new Set<string>();
          set.add(r.benchmarkSlug);
          perModel.set(r.modelSlug, set);
        }
        const shared = Array.from(perModel.get(input.slugs[0]) ?? new Set<string>()).filter(bs =>
          input.slugs.every(s => perModel.get(s)?.has(bs)),
        );

        return {
          models: present.map(m => {
            const mine = rows.filter(r => r.modelSlug === m.slug);
            const agg = aggregate(mine, r => r.evidenceWeight);
            return {
              ...m,
              priceInput: m.priceInput === null ? null : num(m.priceInput),
              priceOutput: m.priceOutput === null ? null : num(m.priceOutput),
              compositeScore: agg.score,
              coverage: mine.length,
            };
          }),
          rows,
          sharedBenchmarks: shared,
        };
      }),
  }),

  recommend: router({
    /**
     * Scenario decision engine. Returns ranked models with the specific
     * benchmark evidence that drove each ranking, so a recommendation is never
     * an unexplained number.
     */
    byScenario: publicProcedure
      .input(
        z.object({
          scenario: z.string(),
          maxOutputPrice: z.number().nullable().optional(),
          openWeightOnly: z.boolean().optional(),
          currentOnly: z.boolean().optional(),
          minCoverage: z.number().min(1).max(20).optional(),
        }),
      )
      .query(async ({ input }) => {
        const scenario = scenarioByKey(input.scenario);
        if (!scenario) throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown scenario" });
        const rows = (await db.listScores()).map(decorate);

        const grouped = new Map<string, DecoratedScore[]>();
        for (const r of rows) {
          const arr = grouped.get(r.modelSlug) ?? [];
          arr.push(r);
          grouped.set(r.modelSlug, arr);
        }

        const minCoverage = input.minCoverage ?? 2;
        const results: Array<{
          modelSlug: string;
          modelName: string;
          provider: string;
          license: string;
          status: string;
          priceOutput: number | null;
          fitScore: number;
          evidenceCount: number;
          evidence: Array<{
            benchmarkSlug: string;
            benchmarkName: string;
            raw: number;
            normalized: number;
            weight: number;
            saturationStatus: string;
            sourceType: string;
            sourceUrl: string | null;
            measuredAt: string | null;
          }>;
          caveats: string[];
        }> = [];

        for (const [slug, mine] of Array.from(grouped.entries())) {
          const head = mine[0];
          if (input.openWeightOnly && head.license !== "open") continue;
          if (input.currentOnly && head.modelStatus !== "current") continue;
          if (
            input.maxOutputPrice != null &&
            head.priceOutput != null &&
            head.priceOutput > input.maxOutputPrice
          )
            continue;

          const weighted: Weighted[] = mine
            .map((r: DecoratedScore) => ({
              r,
              w: scenarioWeight(
                scenario,
                {
                  slug: r.benchmarkSlug,
                  scoreForm: r.scoreForm,
                  difficultyCoefficient: r.difficultyCoefficient,
                  trustScore: r.trustScore,
                  discriminativePower: r.discriminativePower,
                  saturationStatus: r.saturationStatus,
                  capabilityDomain: r.capabilityDomain,
                  isAgentic: r.isAgentic,
                  hasNegativeAssertions: r.hasNegativeAssertions,
                },
                r.sourceType,
              ),
            }))
            .filter((x: Weighted) => x.w > 0)
            .sort((a: Weighted, b: Weighted) => b.w - a.w);

          if (weighted.length < minCoverage) continue;

          const wsum = weighted.reduce((a: number, x: Weighted) => a + x.w, 0);
          const fit = weighted.reduce((a: number, x: Weighted) => a + x.w * x.r.normalized, 0) / wsum;

          const caveats: string[] = [];
          const selfOnly = weighted.every((x: Weighted) => x.r.sourceType === "self_reported");
          if (selfOnly) caveats.push("全部证据来自厂商自报，缺少独立复跑");
          const saturatedShare =
            weighted.filter((x: Weighted) => x.r.saturationStatus === "saturated").length / weighted.length;
          if (saturatedShare > 0.6) caveats.push("过半证据来自已饱和指标，区分力有限");
          const staleShare =
            weighted.filter((x: Weighted) => x.r.freshness === "stale" || x.r.freshness === "aging").length /
            weighted.length;
          if (staleShare > 0.5) caveats.push("过半证据超过 8 个月未更新");
          if (weighted.length < 4) caveats.push("证据条数偏少，排名不确定性较高");

          results.push({
            modelSlug: slug,
            modelName: head.modelName,
            provider: head.provider,
            license: head.license,
            status: head.modelStatus,
            priceOutput: head.priceOutput,
            fitScore: Math.round(fit * 10) / 10,
            evidenceCount: weighted.length,
            evidence: weighted.slice(0, 6).map((x: Weighted) => ({
              benchmarkSlug: x.r.benchmarkSlug,
              benchmarkName: x.r.benchmarkName,
              raw: x.r.rawScore,
              normalized: x.r.normalized,
              weight: x.w,
              saturationStatus: x.r.saturationStatus,
              sourceType: x.r.sourceType,
              sourceUrl: x.r.sourceUrl,
              measuredAt: x.r.measuredAt,
            })),
            caveats,
          });
        }

        results.sort((a, b) => b.fitScore - a.fitScore);
        return {
          scenario: {
            key: scenario.key,
            title: scenario.title,
            summary: scenario.summary,
            emphasisSlugs: scenario.emphasisSlugs,
            domainWeights: scenario.domainWeights,
          },
          results: results.slice(0, 12),
        };
      }),
  }),

  releases: router({
    feed: publicProcedure.input(z.object({ limit: z.number().min(1).max(50).optional() }).optional()).query(
      async ({ input }) => db.listReleases(input?.limit ?? 20),
    ),
  }),

  admin: router({
    refreshLog: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return db.listRefreshLog();
    }),
    /** Marks tracked score rows as re-verified; the freshness layer reads this. */
    refreshData: protectedProcedure
      .input(z.object({ scope: z.enum(["all", "benchmarks"]), benchmarkSlugs: z.array(z.string()).optional() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const rows = await db.touchScores(input.scope === "benchmarks" ? input.benchmarkSlugs : undefined);
        await db.recordRefresh(
          ctx.user.name ?? ctx.user.openId,
          input.scope,
          rows,
          input.scope === "benchmarks" ? (input.benchmarkSlugs ?? []).join(", ") : "full sweep",
        );
        return { success: true, rowsTouched: rows } as const;
      }),
  }),
});

export type AppRouter = typeof appRouter;
