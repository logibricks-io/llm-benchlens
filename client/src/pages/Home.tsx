import { WorkbenchLayout } from "@/components/WorkbenchLayout";
import { TrustScatter } from "@/components/TrustScatter";
import { InfoHint } from "@/components/MetaBadges";
import { MiniRuler, ProjectionRuler } from "@/components/Ruler";
import { Scatter, type ScatterPoint } from "@/components/Scatter";
import { ProviderMark, Rank, ScoreBar } from "@/components/ScoreBar";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { formatPrice, providerColor } from "@/lib/series";
import { formatContextWindow } from "@shared/formatContext";
import { type CapabilityDomain } from "@shared/metaModel";
import { normalizedScore } from "@shared/metaModel";
import { useT } from "@/i18n";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";

/**
 * The landing page.
 *
 * v2 opened with a four-viewport argument that scores are not comparable, and
 * only offered data at the very bottom. The argument is correct but it is the
 * wrong opening: a visitor arrives with "which model should I use", and every
 * reference leaderboard answers that within the first screen.
 *
 * v3 therefore leads with answers — a champion row, then the ranked board with
 * three views — and keeps the methodology narrative below it, where it now reads
 * as an explanation of the numbers just shown rather than a prerequisite for
 * seeing any.
 */

/** Reveal on first scroll into view. Motion here has an explanatory job. */
function useInView<T extends HTMLElement>(threshold = 0.25) {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) setSeen(true);
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen, threshold]);
  return [ref, seen] as const;
}

/** Section marker: a numeral and a rule, in the manner of a journal section. */
function Marker({ n, label }: { n: string; label: string }) {
  return (
    <div className="mb-7 flex items-baseline gap-3">
      <span className="tnum text-ink-400 text-[13px]">{n}</span>
      <span className="ui text-ink-500 text-[13px]">{label}</span>
      <span className="hair-b mb-1 min-w-0 flex-1" />
    </div>
  );
}

type View = "table" | "scatter" | "bars";

export default function Home() {
  const t = useT();
  const [, navigate] = useLocation();
  const overview = trpc.meta.overview.useQuery();
  const champions = trpc.meta.champions.useQuery();
  /* Named domainRanks, not byDomain: this file already has a local `byDomain`
     Map counting benchmarks per domain, and shadowing it broke that block. */
  const domainRanks = trpc.meta.byDomain.useQuery();
  const models = trpc.models.list.useQuery();
  const benchmarks = trpc.benchmarks.list.useQuery();

  const o = overview.data;
  const bms = benchmarks.data ?? [];
  const [view, setView] = useState<View>("table");

  /* Ranked board. Only models with real evidence are ranked; the rest are
     reachable from the model library, where the thin-evidence caveat is shown. */
  const ranked = useMemo(() => {
    const rows = (models.data ?? []).filter(m => m.coverage >= 3 && m.compositeScore !== null);
    return rows
      .sort((a, b) => (b.compositeScore ?? 0) - (a.compositeScore ?? 0))
      .slice(0, 15);
  }, [models.data]);

  const scatterPoints = useMemo<ScatterPoint[]>(() => {
    return (models.data ?? [])
      .filter(
        m =>
          m.coverage >= 3 &&
          m.compositeScore !== null &&
          m.priceOutput !== null &&
          Number(m.priceOutput) > 0,
      )
      .map(m => ({
        slug: m.slug,
        label: m.name,
        provider: m.provider,
        x: Number(m.priceOutput),
        y: Number(m.compositeScore),
      }));
  }, [models.data]);

  const totalRanked = useMemo(
    () => (models.data ?? []).filter(m => m.coverage >= 3 && m.compositeScore !== null).length,
    [models.data],
  );

  const byDomain = new Map<string, number>();
  for (const b of bms)
    byDomain.set(b.capabilityDomain, (byDomain.get(b.capabilityDomain) ?? 0) + 1);
  const domainRows = Array.from(byDomain.entries()).sort((a, b) => b[1] - a[1]);

  const withEvidence = bms.filter(b => b.scoreCount > 0);
  const topUtility = [...withEvidence].sort((a, b) => b.utilityScore - a.utilityScore).slice(0, 6);
  const lowUtility = [...withEvidence].sort((a, b) => a.utilityScore - b.utilityScore).slice(0, 6);

  /*
   * Pick the real extremes of the corpus for the demonstration: the strictest
   * and most lenient rules actually in the library, so the demo is an
   * observation rather than an illustration.
   */
  const measured = bms.filter(b => b.difficultyCoefficient > 0);
  const strictest = measured.reduce<(typeof measured)[number] | null>(
    (acc, b) => (!acc || b.difficultyCoefficient > acc.difficultyCoefficient ? b : acc),
    null,
  );
  const loosest = measured.reduce<(typeof measured)[number] | null>(
    (acc, b) => (!acc || b.difficultyCoefficient < acc.difficultyCoefficient ? b : acc),
    null,
  );

  const [demoRef, demoSeen] = useInView<HTMLDivElement>(0.3);

  const DEMO_RAW = 60;
  const demoRows =
    strictest && loosest
      ? ([strictest, loosest] as const).map((b, i) => ({
          label: b.name,
          difficulty: b.difficultyCoefficient,
          raw: DEMO_RAW,
          normalized: normalizedScore(DEMO_RAW, {
            scoreForm: "percentage",
            difficultyCoefficient: b.difficultyCoefficient,
            trustScore: b.trustScore,
            discriminativePower: b.discriminativePower,
            saturationStatus: b.saturationStatus,
          }),
          tone: i === 0 ? ("good" as const) : ("caution" as const),
        }))
      : [];

  const champLabel: Record<string, string> = {
    overall: t.home.champOverall,
    value: t.home.champValue,
    openWeight: t.home.champOpenWeight,
    longContext: t.home.champLongContext,
    budget: t.home.champBudget.replace(
      "{price}",
      champions.data?.medianPrice ? String(champions.data.medianPrice) : "—",
    ),
    newest: t.home.champNewest,
  };

  const champMetric = (unit: string, metric: number | null): string => {
    if (metric === null) return "—";
    switch (unit) {
      case "score":
        return metric.toFixed(1);
      case "perDollar":
        return String(metric);
      case "usdPerM":
        return formatPrice(metric) ?? "—";
      case "tokens":
        return formatContextWindow(metric) ?? String(metric);
      case "date":
        return new Date(metric).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      default:
        return String(metric);
    }
  };

  return (
    <WorkbenchLayout title={t.nav.home} subtitle="" bare wide>
      <div className="mx-auto max-w-[1320px] px-4 pb-24 sm:px-6">
        {/* ───────────── answers first ───────────── */}
        <section className="pt-9 pb-8">
          <h2 className="display text-ink-950 max-w-[24ch] text-[38px] leading-[1.06] tracking-tight sm:text-[46px]">
            {t.home.heroTitle}
          </h2>
          {/* While the counts are in flight, a skeleton bar rather than the
              sentence with em-dashes punched into it — "— models, — benchmarks"
              reads as a failure, not as loading. */}
          {o ? (
            <p className="text-ink-600 mt-4 max-w-[80ch] text-[15px] leading-[1.75]">
              {t.home.heroSub
                .replace("{models}", String(o.models))
                .replace("{benchmarks}", String(o.benchmarks))
                .replace("{scores}", String(o.scores))}
            </p>
          ) : (
            <div className="mt-5 h-[15px] w-full max-w-[52ch] animate-pulse rounded bg-frost-mist/40" />
          )}
        </section>

        {/* champion row */}
        <section className="pb-10">
          <div className="mb-3 flex items-baseline justify-between gap-4">
            <h3 className="ui text-ink-800 text-[15px] font-medium">{t.home.championsTitle}</h3>
            {champions.data && (
              <span className="ui text-ink-500 text-[13px]">
                {t.home.championsNote
                  .replace("{min}", String(champions.data.minEvidence))
                  .replace("{n}", String(champions.data.eligibleCount))}
              </span>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {champions.isLoading || !champions.data
              ? Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-[104px] rounded" />
                ))
              : champions.data.cards.map((c, i) => (
                  <Link
                    key={c.kind}
                    href={`/models?q=${encodeURIComponent(c.name)}`}
                    className="anim-rise group block"
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    <div
                      className="bg-surface hover:bg-surface-2 flex h-full flex-col rounded border-l-2 px-3.5 py-3 transition-colors duration-120"
                      style={{ borderLeftColor: providerColor(c.provider) }}
                    >
                      <div className="ui text-ink-500 text-[13px]">{champLabel[c.kind] ?? c.kind}</div>
                      {/* Single line: a wrapped model name pushed the figure out of
                          alignment with the neighbouring cards. */}
                      <div
                        className="text-ink-950 mt-1.5 truncate text-[15px] leading-tight font-medium"
                        title={c.name}
                      >
                        {c.name}
                      </div>
                      <div className="mt-auto flex flex-wrap items-baseline gap-x-1.5 pt-1.5">
                        <span className="tnum text-ink-900 text-[19px] leading-none">
                          {champMetric(c.unit, c.metric)}
                        </span>
                        {c.unit === "perDollar" && (
                          <span className="ui text-ink-500 text-[13px]">{t.home.champPerDollar}</span>
                        )}
                      </div>
                      <div className="ui text-ink-400 mt-1.5 text-[13px]">
                        {c.provider} · {t.home.champEvidence.replace("{n}", String(c.coverage))}
                      </div>
                    </div>
                  </Link>
                ))}
          </div>
        </section>

        {/* ───────────── the board ───────────── */}
        <section className="hair-t py-9">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3">
            <div className="min-w-0">
              <h3 className="display text-ink-950 text-[28px] leading-none">
                {t.home.leaderboardTitle}
              </h3>
              <p className="ui text-ink-500 mt-2 max-w-[78ch] text-[13px] leading-relaxed">
                {t.home.leaderboardNote}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {(["table", "scatter", "bars"] as View[]).map(v => (
                <button
                  key={v}
                  type="button"
                  className="chip"
                  data-on={view === v}
                  onClick={() => setView(v)}
                  aria-pressed={view === v}
                >
                  {v === "table" ? t.home.viewTable : v === "scatter" ? t.home.viewScatter : t.home.viewBars}
                </button>
              ))}
            </div>
          </div>

          {models.isLoading && ranked.length === 0 ? (
            <Skeleton className="h-[420px] rounded" />
          ) : view === "scatter" ? (
            <div>
              <Scatter
                points={scatterPoints}
                xLabel={t.home.scatterX}
                yLabel={t.home.scatterY}
                onPick={slug => navigate(`/models?q=${encodeURIComponent(slug)}`)}
              />
              <p className="ui text-ink-500 mt-2 text-[13px] leading-relaxed">
                {t.home.scatterNote
                  .replace("{n}", String(scatterPoints.length))
                  .replace("{total}", String(totalRanked))}
              </p>
            </div>
          ) : view === "bars" ? (
            <div className="space-y-1.5">
              {ranked.map((m, i) => (
                <div key={m.slug} className="flex items-center gap-3">
                  <span className="tnum text-ink-400 w-6 shrink-0 text-right text-[13px]">
                    {i + 1}
                  </span>
                  <Link
                    href={`/models?q=${encodeURIComponent(m.name)}`}
                    className="text-ink-800 hover:text-ink-950 w-[210px] shrink-0 truncate text-[14px] transition-colors duration-120"
                  >
                    {m.name}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div
                      className="relative h-[18px] overflow-hidden rounded-sm"
                      style={{ background: "var(--bar-track)" }}
                    >
                      <div
                        className="anim-bar absolute inset-y-0 left-0 rounded-sm"
                        style={{
                          width: `${m.compositeScore}%`,
                          background: providerColor(m.provider),
                          opacity: 0.85,
                          animationDelay: `${i * 22}ms`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="tnum text-ink-900 w-11 shrink-0 text-right text-[14px]">
                    {m.compositeScore?.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse">
                <thead>
                  <tr className="hair-b">
                    <th className="ui text-ink-700 w-10 pb-2.5 text-left text-[14px] font-semibold">
                      {t.home.colRank}
                    </th>
                    <th className="ui text-ink-700 pb-2.5 text-left text-[14px] font-semibold">
                      {t.home.colModel}
                    </th>
                    <th className="ui text-ink-700 pb-2.5 text-left text-[14px] font-semibold">
                      {t.home.colScore}
                    </th>
                    <th className="ui text-ink-700 pb-2.5 text-right text-[14px] font-semibold">
                      {t.home.colEvidence}
                    </th>
                    <th className="ui text-ink-700 pb-2.5 text-right text-[14px] font-semibold">
                      {t.home.colPriceOut}
                    </th>
                    <th className="ui text-ink-700 pb-2.5 text-right text-[14px] font-semibold">
                      {t.home.colContext}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((m, i) => (
                    <tr key={m.slug} className="hair-row hover:bg-surface transition-colors duration-120">
                      <td className="py-2.5 pr-2">
                        <Rank n={i + 1} />
                      </td>
                      <td className="py-2.5 pr-4">
                        <Link href={`/models?q=${encodeURIComponent(m.name)}`} className="group flex items-center gap-2">
                          <ProviderMark provider={m.provider} size={17} />
                          <span className="text-ink-900 group-hover:text-ink-950 text-[14px]">
                            {m.name}
                          </span>
                          <span className="ui text-ink-400 text-[13px]">{m.provider}</span>
                        </Link>
                      </td>
                      <td className="py-2.5 pr-4">
                        <ScoreBar value={m.compositeScore} provider={m.provider} delay={i} />
                      </td>
                      <td className="tnum text-ink-600 py-2.5 pr-4 text-right text-[14px]">
                        {m.coverage}
                      </td>
                      <td className="tnum text-ink-700 py-2.5 pr-4 text-right text-[14px]">
                        {formatPrice(m.priceOutput) ?? <span className="text-ink-400">—</span>}
                      </td>
                      <td className="tnum text-ink-700 py-2.5 text-right text-[14px]">
                        {m.contextTokens ? (
                          formatContextWindow(m.contextTokens)
                        ) : (
                          <span className="text-ink-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4">
            <Link
              href="/models"
              className="text-ink-600 hover:text-ink-950 inline-flex items-center gap-1.5 text-[14px] transition-colors duration-120"
            >
              {t.home.seeAll.replace("{n}", String(o?.models ?? "—"))}
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>

        {/* ───────────── leadership is domain-specific ───────────── */}
        <section className="hair-t py-9">
          <div className="mb-5">
            <h3 className="ui text-ink-800 text-[15px] font-medium">{t.home.byDomainTitle}</h3>
            <p className="text-ink-500 mt-1 max-w-[68ch] text-[14px] leading-relaxed">
              {t.home.byDomainNote}
            </p>
          </div>
          {domainRanks.isLoading || !domainRanks.data ? (
            <div className="grid gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-[164px] w-full" />
              ))}
            </div>
          ) : (
            <div className="grid gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
              {domainRanks.data.groups.map((g, gi) => (
                <div key={g.domain} className="anim-rise min-w-0" style={{ animationDelay: `${gi * 40}ms` }}>
                  <div className="hair-b flex items-baseline justify-between pb-1.5">
                    <h4 className="text-ink-900 truncate text-[14px] font-medium">
                      {t.capability[g.domain as CapabilityDomain] ?? g.domain}
                    </h4>
                    <span className="tnum text-ink-500 shrink-0 pl-2 text-[13px] tabular-nums">
                      {g.contenders}
                    </span>
                  </div>
                  <ol className="mt-2 space-y-1.5">
                    {g.leaders.map((m, i) => (
                      <li key={m.slug} className="flex items-center gap-2">
                        <span className="tnum text-ink-400 w-[13px] shrink-0 text-[13px] tabular-nums">
                          {i + 1}
                        </span>
                        <Link
                          href={`/models/${m.slug}`}
                          className="text-ink-800 hover:text-ink-950 min-w-0 flex-1 truncate text-[14px] transition-colors duration-120"
                          title={`${m.name} · ${m.provider}`}
                        >
                          {m.name}
                        </Link>
                        <span className="w-[76px] shrink-0">
                          <ScoreBar value={m.score} provider={m.provider} delay={i} />
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ───────────── then the argument ───────────── */}
        <section className="hair-t py-14">
          <Marker n={t.home.metaModel} label={t.home.methodTitle} />
          <div className="grid gap-12 lg:grid-cols-[minmax(0,6fr)_minmax(0,6fr)]">
            <div>
              <h2 className="display text-ink-950 text-[34px] leading-[1.06] tracking-tight">
                {t.home.scoresNotComparable}{" "}
                <span className="text-brand-qing-display">
                  {t.home.scoresNotComparableHighlight}
                </span>
              </h2>
              <p className="text-ink-700 mt-5 max-w-[54ch] text-[15px] leading-[1.8]">
                {t.home.scoresNotComparableP1}
                <span className="text-ink-950 font-medium">
                  {t.home.scoresNotComparableP1Highlight}
                </span>
              </p>
              <p className="text-ink-600 mt-3 max-w-[54ch] text-[14px] leading-[1.8]">
                {t.home.scoresNotComparableP2}
              </p>
            </div>

            <div>
              {overview.isLoading || !o ? (
                <div className="space-y-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 rounded" />
                  ))}
                </div>
              ) : (
                <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                  <Figure
                    value={String(o.benchmarks)}
                    label={t.home.includedBenchmarks}
                    note={t.home.frontierBenchmarks.replace("{n}", String(o.frontier))}
                  />
                  <Figure
                    value={String(o.scores)}
                    label={t.home.evidenceCount}
                    note={t.home.evidenceCoverage
                      .replace("{b}", String(o.coveredBenchmarks))
                      .replace("{m}", String(o.models))}
                  />
                  <Figure
                    value={`${o.ciDisclosureRate}%`}
                    label={t.home.ciDisclosure}
                    note={t.home.ciDisclosedCount.replace("{n}", String(o.ciDisclosed))}
                    tone="danger"
                    hint={t.home.ciHint}
                  />
                  <Figure
                    value={String(o.saturated)}
                    label={t.home.saturatedBenchmarks}
                    note={t.home.saturatedNote}
                    tone="danger"
                    hint={t.home.saturatedHint}
                  />
                </dl>
              )}
            </div>
          </div>
        </section>

        {/* the demonstration */}
        <section ref={demoRef} className="hair-t py-14">
          <Marker n={t.home.demoMarker} label={t.home.demoLabel} />
          <div className="grid gap-12 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
            <div>
              <h3 className="display text-ink-950 text-[28px] leading-tight">
                {t.home.demoTitle1.replace("{n}", String(DEMO_RAW))}
                <br />
                {t.home.demoTitle2}
              </h3>
              <p className="text-ink-700 mt-5 text-[14px] leading-[1.85]">
                {t.home.demoP1}
                <span className="text-ink-950 font-medium">{t.home.demoP1Highlight}</span>
                {t.home.demoP1Suffix}
              </p>
              <p className="text-ink-600 mt-3 text-[14px] leading-[1.8]">{t.home.demoP2}</p>
            </div>
            <div className="lg:pt-3">
              {demoRows.length === 0 ? (
                <Skeleton className="h-[190px] rounded" />
              ) : (
                <ProjectionRuler rows={demoRows} animate={demoSeen} />
              )}
            </div>
          </div>
        </section>

        {/* which rules still measure */}
        <section className="hair-t py-14">
          <Marker n={t.home.evidenceMarker} label={t.home.evidenceLabel} />
          <div className="grid gap-x-10 gap-y-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            <div>
              {benchmarks.isLoading && bms.length === 0 ? (
                <Skeleton className="h-[300px] rounded" />
              ) : (
                <TrustScatter points={bms} />
              )}
            </div>

            <aside className="hair-l pl-6">
              <div className="ui text-ink-500 mb-4 text-[13px]">{t.home.marginalNotes}</div>
              <div className="space-y-7">
                <UtilityList
                  title={t.home.mostUseful}
                  rows={topUtility}
                  tone="good"
                  trustAbbr={t.home.trustAbbr}
                  discAbbr={t.home.discAbbr}
                />
                <UtilityList
                  title={t.home.leastUseful}
                  rows={lowUtility}
                  tone="danger"
                  note={t.home.leastUsefulNote}
                  trustAbbr={t.home.trustAbbr}
                  discAbbr={t.home.discAbbr}
                />
              </div>
            </aside>
          </div>

          <div className="hair-t mt-12 grid gap-x-10 gap-y-6 pt-7 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <div>
              <div className="ui text-ink-500 mb-4 text-[13px]">{t.home.methodologyVitals}</div>
              {overview.isLoading || !o ? (
                <div className="space-y-4">
                  <Skeleton className="h-6 rounded" />
                  <Skeleton className="h-6 rounded" />
                </div>
              ) : (
                <div className="space-y-4">
                  <VitalRow label={t.home.avgTrust} value={o.avgTrust} />
                  <VitalRow
                    label={t.home.avgDiscriminative}
                    value={o.avgDiscriminative}
                    tone="neutral"
                  />
                </div>
              )}
              <p className="text-ink-600 mt-6 text-[14px] leading-[1.8]">
                {t.home.normalizationBasis.replace("{explain}", t.metricExplain.normalized)}
              </p>
              {o && (
                <p className="text-ink-500 mt-2 text-[13px] leading-[1.8]">
                  {t.home.freshnessStats
                    .replace("{fresh}", String(o.freshness.fresh))
                    .replace("{recent}", String(o.freshness.recent))
                    .replace("{aging}", String(o.freshness.aging))
                    .replace("{stale}", String(o.freshness.stale))}
                </p>
              )}
            </div>

            <div>
              <div className="ui text-ink-500 mb-4 text-[13px]">{t.home.domainCoverage}</div>
              <div className="grid gap-x-8 gap-y-1.5 sm:grid-cols-2">
                {benchmarks.isLoading && domainRows.length === 0
                  ? Array.from({ length: 10 }).map((_, i) => (
                      <Skeleton key={i} className="h-4 rounded" />
                    ))
                  : domainRows.map(([domain, count]) => {
                      const max = domainRows[0]?.[1] ?? 1;
                      return (
                        <Link
                          key={domain}
                          href={`/benchmarks?domain=${domain}`}
                          className="group flex items-baseline gap-2.5 py-0.5"
                        >
                          <span className="text-ink-600 group-hover:text-ink-950 w-[104px] shrink-0 truncate text-[14px] transition-colors duration-120">
                            {t.capability[domain as CapabilityDomain] ?? domain}
                          </span>
                          <MiniRuler
                            value={(count / max) * 100}
                            tone="neutral"
                            width={68}
                            className="shrink-0"
                          />
                          <span className="tnum text-ink-700 w-5 shrink-0 text-right text-[14px]">
                            {count}
                          </span>
                        </Link>
                      );
                    })}
              </div>
            </div>
          </div>
        </section>
      </div>
    </WorkbenchLayout>
  );
}

function Figure({
  value,
  label,
  note,
  tone,
  hint,
}: {
  value: string;
  label: string;
  note: string;
  tone?: "danger";
  hint?: string;
}) {
  return (
    <div className="hair-b pb-4">
      <div className="flex items-baseline gap-3">
        <dd
          className={cn(
            "tnum text-[32px] leading-none",
            tone === "danger" ? "text-danger" : "text-ink-950",
          )}
        >
          {value}
        </dd>
        <dt className="ui text-ink-600 flex items-center gap-1 text-[14px]">
          {label}
          {hint && <InfoHint>{hint}</InfoHint>}
        </dt>
      </div>
      <div className="ui text-ink-500 mt-2 text-[13px] leading-relaxed">{note}</div>
    </div>
  );
}

function VitalRow({ label, value, tone }: { label: string; value: number; tone?: "neutral" }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="ui text-ink-600 w-[84px] shrink-0 text-[14px]">{label}</span>
      <MiniRuler value={value} tone={tone ?? "good"} width={120} className="shrink-0" />
      <span className="tnum text-ink-900 text-[14px]">{value}</span>
    </div>
  );
}

function UtilityList({
  title,
  rows,
  tone,
  note,
  trustAbbr,
  discAbbr,
}: {
  title: string;
  rows: Array<{
    slug: string;
    name: string;
    utilityScore: number;
    trustScore: number;
    discriminativePower: number;
  }>;
  tone: "good" | "danger";
  note?: string;
  /* Passed in rather than read via useT: keeps this a pure presentational leaf. */
  trustAbbr: string;
  discAbbr: string;
}) {
  return (
    <div>
      <div className={cn("ui mb-2.5 text-[14px]", tone === "good" ? "text-good" : "text-danger")}>
        {title}
      </div>
      <div className="space-y-1.5">
        {rows.length === 0
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-4 rounded" />)
          : rows.map(b => (
              <Link key={b.slug} href={`/benchmarks/${b.slug}`} className="group block">
                <div className="flex items-baseline gap-2.5">
                  <span
                    className={cn(
                      "tnum w-8 shrink-0 text-[14px]",
                      tone === "good" ? "text-good" : "text-danger",
                    )}
                  >
                    {b.utilityScore}
                  </span>
                  <span className="text-ink-700 group-hover:text-ink-950 min-w-0 flex-1 truncate text-[14px] transition-colors duration-120">
                    {b.name}
                  </span>
                </div>
                <div className="tnum text-ink-500 mt-0.5 pl-[42px] text-[13px]">
                  {trustAbbr} {b.trustScore} · {discAbbr} {b.discriminativePower}
                </div>
              </Link>
            ))}
      </div>
      {note && <p className="text-ink-500 mt-3 text-[13px] leading-[1.8]">{note}</p>}
    </div>
  );
}
