import { InfoHint } from "@/components/MetaBadges";
import { WorkbenchLayout } from "@/components/WorkbenchLayout";
import { TrustScatter } from "@/components/TrustScatter";
import { MiniRuler, ProjectionRuler, Ruler } from "@/components/Ruler";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { type CapabilityDomain } from "@shared/metaModel";
import { normalizedScore } from "@shared/metaModel";
import { useT } from "@/i18n";
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";

/**
 * The overview, rebuilt as a scroll narrative rather than a dashboard.
 *
 * A dashboard presents every number at once and leaves the reader to work out
 * what matters. This page instead makes an argument in four viewports: the
 * claim, the demonstration, the evidence, then the doors into the data. The
 * ruler motif carries the demonstration, so the core idea is shown before it is
 * explained.
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
      <span className="tnum text-ink-400 text-[12px]">{n}</span>
      <span className="ui text-ink-500 text-[12px] tracking-[0.16em] uppercase">{label}</span>
      <span className="hair-b mb-1 min-w-0 flex-1" />
    </div>
  );
}

export default function Home() {
  const t = useT();
  const overview = trpc.meta.overview.useQuery();
  const benchmarks = trpc.benchmarks.list.useQuery();

  const o = overview.data;
  const bms = benchmarks.data ?? [];

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
  const strictest = measured.reduce<typeof measured[number] | null>(
    (acc, b) => (!acc || b.difficultyCoefficient > acc.difficultyCoefficient ? b : acc),
    null,
  );
  const loosest = measured.reduce<typeof measured[number] | null>(
    (acc, b) => (!acc || b.difficultyCoefficient < acc.difficultyCoefficient ? b : acc),
    null,
  );

  const [demoRef, demoSeen] = useInView<HTMLDivElement>(0.3);

  /*
   * The same reading of 60 taken on each of those two rules, rescaled by the
   * production normaliser rather than an illustrative formula — a demo that
   * disagreed with the matrix would undermine the entire argument.
   */
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

  return (
    <WorkbenchLayout title={t.nav.home} subtitle="" bare wide>
      <div className="mx-auto max-w-[1180px] px-7 pb-24">
        {/* ───────────── viewport 1: the claim ───────────── */}
        <section className="pt-14 pb-20">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            <div>
              <div className="ui text-ink-400 mb-6 text-[12px] tracking-[0.16em] uppercase">
                {t.home.metaModel}
              </div>
              {/* Type as the design: the claim is the largest object on screen. */}
              <h2 className="display text-ink-900 text-[54px] leading-[1.04] tracking-tight">
                {t.home.scoresNotComparable}
                <br />
                <span className="text-frost-qing-display">{t.home.scoresNotComparableHighlight}</span>
              </h2>
              <p className="text-ink-600 mt-7 max-w-[46ch] text-[14px] leading-[1.95]">
                {t.home.scoresNotComparableP1}
                <span className="text-ink-900">{t.home.scoresNotComparableP1Highlight}</span>
              </p>
              <p className="text-ink-500 mt-4 max-w-[46ch] text-[13px] leading-[1.95]">
                {t.home.scoresNotComparableP2}
              </p>
            </div>

            {/* Figures hang in the right column, unboxed, aligned to a rule. */}
            <div className="lg:pt-16">
              {overview.isLoading || !o ? (
                <div className="space-y-8">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 rounded" />
                  ))}
                </div>
              ) : (
                <dl className="space-y-7">
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

        {/* ───────────── viewport 2: the demonstration ───────────── */}
        <section ref={demoRef} className="hair-t py-20">
          <Marker n={t.home.demoMarker} label={t.home.demoLabel} />
          <div className="grid gap-12 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
            <div>
              <h3 className="display text-ink-900 text-[27px] leading-tight">
                {t.home.demoTitle1.replace("{n}", String(DEMO_RAW))}
                <br />
                {t.home.demoTitle2}
              </h3>
              <p className="text-ink-600 mt-5 text-[13px] leading-[1.95]">
                {t.home.demoP1}
                <span className="text-ink-900">{t.home.demoP1Highlight}</span>
                {t.home.demoP1Suffix}
              </p>
              <p className="text-ink-500 mt-3 text-[12px] leading-[1.9]">
                {t.home.demoP2}
              </p>
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

        {/* ───────────── viewport 3: the evidence ───────────── */}
        <section className="hair-t py-20">
          <Marker n={t.home.evidenceMarker} label={t.home.evidenceLabel} />
          <div className="grid gap-x-10 gap-y-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            <div>
              {benchmarks.isLoading && bms.length === 0 ? (
                <Skeleton className="h-[300px] rounded" />
              ) : (
                <TrustScatter points={bms} />
              )}
            </div>

            {/* Marginal notes hang outside the main column — the "designed" signal. */}
            <aside className="hair-l pl-6">
              <div className="ui text-ink-400 mb-4 text-[12px] tracking-[0.16em] uppercase">
                {t.home.marginalNotes}
              </div>
              <div className="space-y-7">
                <UtilityList title={t.home.mostUseful} rows={topUtility} tone="good" trustAbbr={t.home.trustAbbr} discAbbr={t.home.discAbbr} />
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

          {/* Vitals stated as a running footnote rather than gauges. */}
          <div className="hair-t mt-14 grid gap-x-10 gap-y-6 pt-7 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <div>
              <div className="ui text-ink-400 mb-4 text-[12px] tracking-[0.16em] uppercase">
                {t.home.methodologyVitals}
              </div>
              {overview.isLoading || !o ? (
                <div className="space-y-4">
                  <Skeleton className="h-6 rounded" />
                  <Skeleton className="h-6 rounded" />
                </div>
              ) : (
                <div className="space-y-4">
                  <VitalRow label={t.home.avgTrust} value={o.avgTrust} />
                  <VitalRow label={t.home.avgDiscriminative} value={o.avgDiscriminative} tone="neutral" />
                </div>
              )}
              <p className="text-ink-500 mt-6 text-[12px] leading-[1.9]">
                {t.home.normalizationBasis.replace("{explain}", t.metricExplain.normalized)}
              </p>
              {o && (
                <p className="text-ink-500 mt-2 text-[12px] leading-[1.9]">
                  {t.home.freshnessStats
                    .replace("{fresh}", String(o.freshness.fresh))
                    .replace("{recent}", String(o.freshness.recent))
                    .replace("{aging}", String(o.freshness.aging))
                    .replace("{stale}", String(o.freshness.stale))}
                </p>
              )}
            </div>

            <div>
              <div className="ui text-ink-400 mb-4 text-[12px] tracking-[0.16em] uppercase">
                {t.home.domainCoverage}
              </div>
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
                          <span className="text-ink-500 group-hover:text-ink-900 w-[86px] shrink-0 truncate text-[12px] transition-colors duration-150">
                            {t.capability[domain as CapabilityDomain] ?? domain}
                          </span>
                          <MiniRuler
                            value={(count / max) * 100}
                            tone="neutral"
                            width={68}
                            className="shrink-0"
                          />
                          <span className="tnum text-ink-700 w-5 shrink-0 text-right text-[12px]">
                            {count}
                          </span>
                        </Link>
                      );
                    })}
              </div>
            </div>
          </div>
        </section>

        {/* ───────────── viewport 4: the doors ───────────── */}
        <section className="hair-t py-20">
          <Marker n={t.home.doorsMarker} label={t.home.doorsLabel} />
          {/* Deliberately unequal weights: the matrix is the product. */}
          <div className="grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            <Link href="/matrix" className="group block">
              <div className="recessed px-7 py-8 transition-colors duration-200">
                <div className="ui text-ink-400 text-[12px] tracking-[0.16em] uppercase">
                  {t.home.matrixNum}
                </div>
                <div className="display text-ink-900 mt-3 text-[30px] leading-none">
                  {t.home.matrixTitle}
                </div>
                <div className="ui text-ink-500 mt-3 text-[12px]">
                  {o
                    ? t.home.matrixNote
                        .replace("{b}", String(o.benchmarks))
                        .replace("{m}", String(o.models))
                    : t.home.matrixNoteFallback}
                </div>
                <div className="mt-6">
                  <Ruler difficulty={2.03} height={16} ticks={20} />
                </div>
              </div>
            </Link>
            <div className="grid content-start gap-4">
              <DoorLink href="/decide" n={t.home.decideNum} label={t.home.decideTitle} note={t.home.decideNote} />
              <DoorLink href="/compare" n={t.home.compareNum} label={t.home.compareTitle} note={t.home.compareNote} />
              <DoorLink href="/benchmarks" n={t.home.benchmarksNum} label={t.home.benchmarksTitle} note={t.home.benchmarksNote} />
              <DoorLink href="/radar" n={t.home.radarNum} label={t.home.radarTitle} note={t.home.radarNote} />
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
    <div className="hair-b pb-5">
      <div className="flex items-baseline gap-3">
        <dd
          className={cn(
            "tnum text-[38px] leading-none",
            tone === "danger" ? "text-danger" : "text-ink-900",
          )}
        >
          {value}
        </dd>
        <dt className="ui text-ink-500 flex items-center gap-1 text-[12px]">
          {label}
          {hint && <InfoHint>{hint}</InfoHint>}
        </dt>
      </div>
      <div className="ui text-ink-400 mt-2 text-[12px] leading-relaxed">{note}</div>
    </div>
  );
}

function VitalRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "neutral";
}) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="ui text-ink-500 w-[68px] shrink-0 text-[12px]">{label}</span>
      <MiniRuler value={value} tone={tone ?? "good"} width={120} className="shrink-0" />
      <span className="tnum text-ink-800 text-[13px]">{value}</span>
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
      <div
        className={cn(
          "ui mb-2.5 text-[12px]",
          tone === "good" ? "text-good" : "text-danger",
        )}
      >
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
                      "tnum w-8 shrink-0 text-[12px]",
                      tone === "good" ? "text-good" : "text-danger",
                    )}
                  >
                    {b.utilityScore}
                  </span>
                  <span className="text-ink-600 group-hover:text-ink-900 min-w-0 flex-1 truncate text-[12px] transition-colors duration-150">
                    {b.name}
                  </span>
                </div>
                <div className="tnum text-ink-400 mt-0.5 pl-[42px] text-[11px]">
                  {trustAbbr} {b.trustScore} · {discAbbr} {b.discriminativePower}
                </div>
              </Link>
            ))}
      </div>
      {note && <p className="text-ink-500 mt-3 text-[12px] leading-[1.8]">{note}</p>}
    </div>
  );
}

function DoorLink({
  href,
  n,
  label,
  note,
}: {
  href: string;
  n: string;
  label: string;
  note: string;
}) {
  return (
    <Link href={href} className="group hair-b block pb-3.5">
      <div className="flex items-baseline gap-3">
        <span className="tnum text-ink-400 text-[12px]">{n}</span>
        <span className="text-ink-800 group-hover:text-ink-900 text-[15px] transition-colors duration-150">
          {label}
        </span>
      </div>
      <div className="ui text-ink-400 mt-1 pl-[26px] text-[12px]">{note}</div>
    </Link>
  );
}
