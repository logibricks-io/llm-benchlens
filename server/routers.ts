import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  type CaveatCode,
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

/**
 * Aggregate a model's standing from its measurements, weighted by evidence.
 *
 * A raw weighted mean lets a model with one lucky score outrank a model
 * measured on twenty benchmarks, which is the single most common way naive
 * leaderboards mislead. So the mean is shrunk toward the prior (the library-wide
 * midpoint) in proportion to how thin the evidence is: with n measurements the
 * observed mean carries n/(n+K) of the weight. Thin evidence therefore reports
 * a defensible "we don't know yet" instead of a spurious 100.
 */
const SHRINK_K = 4;
const PRIOR = 50;

function aggregate(rows: DecoratedScore[], weightOf: (r: DecoratedScore) => number) {
  let wsum = 0;
  let acc = 0;
  let n = 0;
  for (const r of rows) {
    const w = weightOf(r);
    if (w <= 0) continue;
    wsum += w;
    acc += w * r.normalized;
    n++;
  }
  if (wsum <= 0) return { score: null, weightSum: 0, shrinkage: 0, rawMean: null };
  const rawMean = acc / wsum;
  const confidence = n / (n + SHRINK_K);
  const shrunk = confidence * rawMean + (1 - confidence) * PRIOR;
  return {
    score: Math.round(shrunk * 10) / 10,
    weightSum: Math.round(wsum * 100) / 100,
    /** 0 = fully shrunk to prior, 1 = fully trusted. */
    shrinkage: Math.round(confidence * 1000) / 1000,
    rawMean: Math.round(rawMean * 10) / 10,
  };
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
      /*
       * Keys only, never labels. Returning the Chinese `title`/`summary` here
       * made the picker show Chinese under an English UI, and because the tRPC
       * response is cached it could not react to a language switch at all.
       * Display copy for these keys lives in the client dictionaries.
       */
      SCENARIOS.map(s => ({ key: s.key, emphasisSlugs: s.emphasisSlugs })),
    ),
    /**
     * Headline answers for the landing page.
     *
     * Every reference leaderboard opens with a row of one-line verdicts — best
     * overall, cheapest, longest context, best open-weight — so a visitor gets an
     * answer within seconds instead of reading an argument first.
     *
     * Two rules keep these honest:
     *  - a model needs MIN_EVIDENCE scores to be eligible, otherwise a model with
     *    one lucky result would take the crown
     *  - each card returns the figure it won on, so the claim is auditable
     *
     * Returns keys and numbers only; the card copy lives in the dictionaries.
     */
    champions: publicProcedure.query(async () => {
      const MIN_EVIDENCE = 5;
      const [ms, all] = await Promise.all([db.listModels(), db.listScores()]);
      const decorated = all.map(decorate);
      const bySlug = new Map<string, DecoratedScore[]>();
      for (const r of decorated) {
        const arr = bySlug.get(r.modelSlug) ?? [];
        arr.push(r);
        bySlug.set(r.modelSlug, arr);
      }

      const rows = ms.map(m => {
        const mine = bySlug.get(m.slug) ?? [];
        const agg = aggregate(mine, r => r.evidenceWeight);
        return {
          slug: m.slug,
          name: m.name,
          provider: m.provider,
          license: m.license,
          isReasoning: m.isReasoning,
          coverage: mine.length,
          composite: agg.score,
          priceInput: m.priceInput === null ? null : num(m.priceInput),
          priceOutput: m.priceOutput === null ? null : num(m.priceOutput),
          contextTokens: m.contextTokens ?? null,
          releasedAt: m.releasedAt ?? null,
        };
      });

      const eligible = rows.filter(r => r.coverage >= MIN_EVIDENCE);

      const best = <T,>(list: T[], score: (x: T) => number | null) => {
        let top: T | null = null;
        let topV = -Infinity;
        for (const x of list) {
          const v = score(x);
          if (v === null || !Number.isFinite(v)) continue;
          if (v > topV) {
            topV = v;
            top = x;
          }
        }
        return top;
      };

      const card = (
        kind: string,
        m: (typeof rows)[number] | null,
        metric: number | null,
        unit: string,
      ) =>
        m
          ? {
              kind,
              slug: m.slug,
              name: m.name,
              provider: m.provider,
              composite: m.composite,
              coverage: m.coverage,
              metric,
              unit,
            }
          : null;

      const priced = eligible.filter(r => r.priceOutput !== null && r.priceOutput > 0);
      const sortedPrices = priced.map(r => r.priceOutput as number).sort((a, b) => a - b);
      const medianPrice = sortedPrices.length
        ? sortedPrices[Math.floor(sortedPrices.length / 2)]
        : null;

      /*
       * Six cards must give six different answers, otherwise a slot is wasted.
       * Two earlier attempts were both wrong:
       *   - ranking a "cheapest" card by absolute price picked the same model as
       *     the value card, so the row named one model twice;
       *   - dropping any duplicate left only five cards, which is worse — "best
       *     open-weight model" is a question people actually ask, and silence is
       *     not a better answer than second place.
       *
       * So each dimension is resolved in order against the models still unclaimed.
       * A card therefore reads "best on this axis among models not already shown",
       * which is both non-repeating and always populated.
       */
      const claimed = new Set<string>();
      const pickers: Array<{
        kind: string;
        pool: () => typeof rows;
        rank: (r: (typeof rows)[number]) => number | null;
        metric: (r: (typeof rows)[number]) => number | null;
        unit: string;
      }> = [
        {
          kind: "overall",
          pool: () => eligible,
          rank: r => r.composite,
          metric: r => r.composite,
          unit: "score",
        },
        {
          // Composite per dollar of output price: output dominates real spend.
          kind: "value",
          pool: () => priced,
          rank: r => (r.composite === null ? null : r.composite / (r.priceOutput as number)),
          metric: r =>
            r.composite === null
              ? null
              : Math.round((r.composite / (r.priceOutput as number)) * 10) / 10,
          unit: "perDollar",
        },
        {
          kind: "openWeight",
          pool: () => eligible.filter(r => r.license && /open|apache|mit|llama|gemma/i.test(r.license)),
          rank: r => r.composite,
          metric: r => r.composite,
          unit: "score",
        },
        {
          kind: "longContext",
          pool: () => eligible,
          rank: r => r.contextTokens,
          metric: r => r.contextTokens,
          unit: "tokens",
        },
        {
          // Holds budget fixed and asks what capability it buys.
          kind: "budget",
          pool: () =>
            medianPrice === null ? [] : priced.filter(r => (r.priceOutput as number) <= medianPrice),
          rank: r => r.composite,
          metric: r => r.priceOutput,
          unit: "usdPerM",
        },
        {
          kind: "newest",
          pool: () => eligible.filter(r => r.releasedAt),
          rank: r => (r.releasedAt ? new Date(r.releasedAt).getTime() : null),
          metric: r => (r.releasedAt ? new Date(r.releasedAt).getTime() : null),
          unit: "date",
        },
      ];

      const cards = pickers
        .map(p => {
          const pool = p.pool().filter(r => !claimed.has(r.slug));
          const winner = best(pool, p.rank);
          if (!winner) return null;
          claimed.add(winner.slug);
          return card(p.kind, winner, p.metric(winner), p.unit);
        })
        .filter((c): c is NonNullable<typeof c> => c !== null);

      return { minEvidence: MIN_EVIDENCE, eligibleCount: eligible.length, cards, medianPrice };
    }),
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
        /*
         * Group unlabelled entries under the empty string, not a Chinese label.
         * A display string used as a map key is a sentinel the client has to
         * string-compare against, so translating the label silently broke the
         * comparison. The client renders its own copy when it sees "".
         */
        const key = r.benchmarkVersion ?? "";
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
          rawMean: agg.rawMean,
          confidence: agg.shrinkage,
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
          caveats: CaveatCode[];
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

          /* Codes only — display copy is dictionary data, see CaveatCode. */
          const caveats: CaveatCode[] = [];
          const selfOnly = weighted.every((x: Weighted) => x.r.sourceType === "self_reported");
          if (selfOnly) caveats.push("all_self_reported");
          const saturatedShare =
            weighted.filter((x: Weighted) => x.r.saturationStatus === "saturated").length / weighted.length;
          if (saturatedShare > 0.6) caveats.push("mostly_saturated");
          const staleShare =
            weighted.filter((x: Weighted) => x.r.freshness === "stale" || x.r.freshness === "aging").length /
            weighted.length;
          if (staleShare > 0.5) caveats.push("mostly_stale");
          if (weighted.length < 4) caveats.push("thin_evidence");

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

    /**
     * Data-quality audit. Surfaces exactly the gaps a maintainer can act on:
     * benchmarks with no scores at all, the stalest evidence, and provenance
     * holes. Everything here is derived, never hand-maintained.
     */
    audit: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const [bms, all] = await Promise.all([db.listBenchmarks(), db.listScores()]);
      const decorated = all.map(decorate);

      const byBenchmark = new Map<number, typeof decorated>();
      for (const r of decorated) {
        const list = byBenchmark.get(r.benchmarkId) ?? [];
        list.push(r);
        byBenchmark.set(r.benchmarkId, list);
      }

      const uncovered = bms
        .filter(b => !byBenchmark.has(b.id))
        .map(b => ({ slug: b.slug, name: b.name, utilityScore: num(b.utilityScore) }))
        .sort((a, b) => b.utilityScore - a.utilityScore);

      const thin = bms
        .filter(b => {
          const n = byBenchmark.get(b.id)?.length ?? 0;
          return n > 0 && n < 4;
        })
        .map(b => ({ slug: b.slug, name: b.name, scoreCount: byBenchmark.get(b.id)?.length ?? 0 }))
        .sort((a, b) => a.scoreCount - b.scoreCount);

      const stalest = [...decorated]
        .filter(r => r.freshness === "stale" || r.freshness === "aging")
        .sort((a, b) => (a.measuredAt ?? "").localeCompare(b.measuredAt ?? ""))
        .slice(0, 25)
        .map(r => ({
          benchmarkSlug: r.benchmarkSlug,
          benchmarkName: r.benchmarkName,
          modelName: r.modelName,
          measuredAt: r.measuredAt,
          freshness: r.freshness,
          sourceUrl: r.sourceUrl,
        }));

      const sourceMix: Record<string, number> = {};
      for (const r of decorated) sourceMix[r.sourceType] = (sourceMix[r.sourceType] ?? 0) + 1;

      return {
        totals: {
          benchmarks: bms.length,
          scoreRows: decorated.length,
          coveredBenchmarks: byBenchmark.size,
          coverageRate: bms.length ? Math.round((byBenchmark.size / bms.length) * 1000) / 10 : 0,
          missingProvenance: decorated.filter(r => !r.sourceUrl).length,
          ciDisclosed: bms.filter(b => b.ciDisclosed).length,
        },
        uncovered,
        thin,
        stalest,
        sourceMix,
      };
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
