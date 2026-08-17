import {
  ContaminationBadge,
  FreshnessDot,
  InfoHint,
  MechanismBadge,
  SaturationBadge,
  ScoreMeter,
  SourceBadge,
  StanceBadge,
  StrictnessBadge,
  useMetricExplain,
} from "@/components/MetaBadges";
import { ScoreBar, Rank, ProviderDot } from "@/components/ScoreBar";
import { ScoreSpread } from "@/components/ScoreSpread";
import { WorkbenchLayout } from "@/components/WorkbenchLayout";
import { Ruler, MAX_DIFFICULTY, parseLeadingNumber, toneForScore } from "@/components/Ruler";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { type CapabilityDomain } from "@shared/metaModel";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  ExternalLink,
  GitBranch,
  Info,
  Target,
  Users,
} from "lucide-react";
import { Link, useParams } from "wouter";
import { useT } from "@/i18n";
import { useProse } from "@/i18n/prose";
import type { Dict } from "@/i18n";

function Field({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex gap-3 py-1.5">
      <dt className="flex w-[92px] shrink-0 items-center gap-1 text-[14px] text-ink-500">
        {label}
        {hint && <InfoHint>{hint}</InfoHint>}
      </dt>
      <dd className="min-w-0 flex-1 text-[14px] leading-relaxed">{value}</dd>
    </div>
  );
}

/**
 * The hero: this benchmark drawn as the rule it actually is, spanning the full
 * measure of the page. Its length is the difficulty coefficient, so two detail
 * pages opened side by side disagree in width before you have read a number.
 *
 * Only 0–100 readings go on the rule. Elo benchmarks live on a different scale
 * and are stated as text rather than forced onto a rule they do not share.
 */
function BenchmarkHero({
  difficulty,
  sota,
  rows,
  t,
}: {
  difficulty: number;
  sota: string | null;
  rows: Array<{ modelName: string; rawScore: number; normalized: number }>;
  t: Dict;
}) {
  /*
   * Three marks on one baseline collide into an unreadable smear when the models
   * are close. What matters is distance *along this rule*, not the arithmetic
   * score gap: on a hard benchmark every reading may sit below 13, where a gap
   * of 9 points is still most of the visible span, while on a saturated one a
   * 9-point gap is nothing. Space the marks by the rule's own extent.
   */
  const plottableAll = rows.filter(r => r.rawScore >= 0 && r.rawScore <= 100);
  const span = plottableAll.length > 0
    ? Math.max(...plottableAll.map(r => r.rawScore)) -
      Math.min(...plottableAll.map(r => r.rawScore))
    : 0;
  /* Require a tenth of the drawn span, with a floor so near-ties still separate. */
  const minGap = Math.max(span * 0.1, 1.5);
  const plottable: Array<{ modelName: string; rawScore: number; normalized: number }> = [];
  for (const r of plottableAll) {
    if (plottable.some(p => Math.abs(p.rawScore - r.rawScore) < minGap)) continue;
    plottable.push(r);
    if (plottable.length === 3) break;
  }
  const sotaNum = parseLeadingNumber(sota);
  const sotaOnScale = sotaNum !== null && sotaNum >= 0 && sotaNum <= 100;
  const lengthPct = Math.round((Math.min(difficulty, MAX_DIFFICULTY) / MAX_DIFFICULTY) * 100);

  return (
    <section className="hair-b pb-7">
      <div className="mb-5 flex flex-wrap items-baseline gap-x-6 gap-y-1">
        <span className="ui text-ink-400 text-[14px]">
          {t.benchmarkDetail.thisRule}
        </span>
        <span className="ui text-ink-500 text-[14px]">
          {t.benchmarkDetail.lengthPct.replace("{pct}", String(lengthPct))}
          <span className="text-ink-400">
            {t.benchmarkDetail.difficultyHint
              .replace("{diff}", difficulty.toFixed(2))
              .replace("{max}", String(MAX_DIFFICULTY))}
          </span>
        </span>
        {!sotaOnScale && sota && (
          <span className="ui text-ink-500 text-[14px]">
            {t.benchmarkDetail.currentSota} <span className="tnum">{sota}</span>
            <span className="text-ink-400">{t.benchmarkDetail.sotaNotOnScale}</span>
          </span>
        )}
      </div>

      {plottable.length === 0 ? (
        <div className="py-2">
          <Ruler difficulty={difficulty} height={40} ticks={20} labelBelow />
          <p className="ui text-ink-400 mt-2 text-[14px]">
            {t.benchmarkDetail.noPlottableScores}
          </p>
        </div>
      ) : (
        <div className="py-1">
          <Ruler
            difficulty={difficulty}
            height={54}
            ticks={20}
            animate
            labelBelow
            marks={plottable.map((r, i) => ({
              value: r.rawScore,
              label: `${r.modelName} ${r.rawScore}`,
              tone: i === 0 ? toneForScore(r.rawScore) : "ink",
              emphasis: i === 0,
              title: t.benchmarkDetail.markTitle
                .replace("{raw}", String(r.rawScore))
                .replace("{norm}", String(r.normalized)),
            }))}
          />
          <p className="ui text-ink-400 mt-1 text-[14px]">
            {t.benchmarkDetail.rulerShowsRaw}
            {plottable.length < Math.min(3, rows.length) && (
              <span>{t.benchmarkDetail.rulerOmittedScores}</span>
            )}
          </p>
        </div>
      )}
    </section>
  );
}

export default function BenchmarkDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading, error } = trpc.benchmarks.detail.useQuery({ slug });
  const t = useT();
  const metricExplain = useMetricExplain();
  const prose = useProse();

  if (isLoading) {
    return (
      <WorkbenchLayout title={t.benchmarkDetail.title}>
        <div className="space-y-4">
          <Skeleton className="h-[220px] w-full rounded-sm" />
          <Skeleton className="h-[320px] w-full rounded-sm" />
        </div>
      </WorkbenchLayout>
    );
  }

  if (error || !data) {
    return (
      <WorkbenchLayout title={t.benchmarkDetail.title}>
        <div className="hair-t p-6 text-center">
          <p className="text-[15px]">{t.benchmarkDetail.notFound}</p>
          <Link href="/benchmarks" className="mt-2 inline-flex items-center gap-1 text-[14px] text-frost-qing hover:underline">
            <ArrowLeft className="size-3" />
            {t.benchmarkDetail.backToLibrary}
          </Link>
        </div>
      </WorkbenchLayout>
    );
  }

  const b = data.benchmark;
  // The three prose fields are content, not chrome, so they come from the row's
  // language variant rather than the dictionary.
  const caveat = prose(b, "interpretationCaveat");
  const scenario = prose(b, "scenarioMapping");
  const notes = prose(b, "notes");
  const rows = data.leaderboard;
  const top = rows[0]?.commonScale ?? 0;

  return (
    <WorkbenchLayout
      title={b.name}
      subtitle={
        <span className="flex items-center gap-2">
          <Link href="/benchmarks" className="hover:text-ink-900">{t.nav.benchmarks}</Link>
          <span className="text-ink-400">/</span>
          <span>{t.capability[b.capabilityDomain as CapabilityDomain] ?? b.capabilityDomain}</span>
          {b.version && <><span className="text-ink-400">/</span><span>{b.version}</span></>}
        </span>
      }
      readNext={[
        { href: "/matrix", label: t.nav.matrix, why: t.benchmarkDetail.readNextMatrixWhy },
        { href: "/benchmarks", label: t.nav.benchmarks, why: t.benchmarkDetail.readNextLibraryWhy },
      ]}
      actions={
        <div className="flex items-center gap-2">
          {b.officialUrl && (
            <a href={b.officialUrl} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-sm hair-all px-2.5 py-1.5 text-[14px] transition-colors duration-150 hover:bg-frost-mist/50">
              <ExternalLink className="size-3" />{t.benchmarkDetail.officialLink}
            </a>
          )}
          {b.paperUrl && (
            <a href={b.paperUrl} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-sm hair-all px-2.5 py-1.5 text-[14px] transition-colors duration-150 hover:bg-frost-mist/50">
              <BookOpen className="size-3" />{t.benchmarkDetail.paperLink}
            </a>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        <BenchmarkHero
          difficulty={b.difficultyCoefficient}
          sota={b.currentSotaScore}
          rows={rows}
          t={t}
        />

        {/* Credibility rating card — the most prominent element on the page. */}
        <div className="hair-t p-5">
          <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap gap-1.5">
                <SaturationBadge status={b.saturationStatus} />
                <StrictnessBadge strictness={b.strictness} />
                <MechanismBadge mechanism={b.scoringMechanism} />
                <StanceBadge stance={b.issuerStance} />
                <ContaminationBadge risk={b.contaminationRisk} />
                {b.isAgentic && (
                  <span className="rounded-sm hair-all bg-frost-mist/50 px-1.5 py-0.5 text-[13px]">{t.benchmarkDetail.agenticTask}</span>
                )}
                {b.hasNegativeAssertions && (
                  <span className="rounded-sm border border-[color:var(--signal-caution)]/35 px-1.5 py-0.5 text-[13px] text-caution">
                    {t.benchmarkDetail.negativeAssertions}
                  </span>
                )}
                {b.isOpenSource && (
                  <span className="rounded-sm border border-[color:var(--signal-good)]/35 px-1.5 py-0.5 text-[13px] text-good">
                    {t.benchmarkDetail.openSource}
                  </span>
                )}
              </div>

              <dl className="divide-y divide-border/60">
                <Field label={t.benchmarkDetail.issuer} value={b.issuer} />
                <Field label={t.benchmarkDetail.taskCount} value={b.taskCount} />
                <Field label={t.benchmarkDetail.metricUnit} value={b.metricUnit} />
                <Field
                  label={t.benchmarkDetail.humanBaseline}
                  value={b.humanBaseline}
                  hint={t.benchmarkDetail.humanBaselineHint}
                />
                <Field label={t.benchmarkDetail.currentSota} value={b.currentSotaScore} />
                <Field
                  label={t.benchmarkDetail.confidenceInterval}
                  value={
                    b.ciDisclosed ? (
                      b.confidenceInterval
                    ) : (
                      <span className="inline-flex items-center gap-1 text-caution">
                        <AlertTriangle className="size-3" />
                        {t.benchmarkDetail.notDisclosed}
                      </span>
                    )
                  }
                  hint={t.benchmarkDetail.ciHint}
                />
              </dl>
            </div>

            {/* Rating meters */}
            <div className="space-y-3 rounded-sm hair-all bg-background p-4">
              <div className="flex items-baseline justify-between">
                <span className="flex items-center gap-1 text-[14px] text-ink-500">
                  {t.common.utility}
                  <InfoHint>{metricExplain.utility}</InfoHint>
                </span>
                <span className="tnum text-2xl leading-none text-frost-qing">{b.utilityScore}</span>
              </div>
              <div className="space-y-2.5 hair-t pt-3">
                <ScoreMeter value={b.trustScore} label={t.common.trust} explain={metricExplain.trust} />
                <ScoreMeter value={b.discriminativePower} label={t.common.resolution} explain={metricExplain.discriminative} tone="violet" />
                <div className="flex items-baseline justify-between pt-1">
                  <span className="flex items-center gap-1 text-[14px] text-ink-500">
                    {t.common.difficulty}
                    <InfoHint>{metricExplain.difficulty}</InfoHint>
                  </span>
                  <span className="tnum text-[14px] text-caution">
                    ×{b.difficultyCoefficient.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Interpretation caveat — placed before the leaderboard on purpose. */}
        {(caveat || scenario) && (
          <div className="grid gap-3 lg:grid-cols-2">
            {caveat && (
              <div className="hair-t border-[color:var(--signal-caution)]/25 p-4">
                <div className="mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="size-3.5 text-caution" />
                  <h3 className="text-[14px] font-medium">{t.benchmarkDetail.caveat}</h3>
                </div>
                <p className="text-[14px] leading-relaxed text-ink-500">{caveat}</p>
              </div>
            )}
            {scenario && (
              <div className="hair-t p-4">
                <div className="mb-2 flex items-center gap-1.5">
                  <Target className="size-3.5 text-frost-qing" />
                  <h3 className="text-[14px] font-medium">{t.benchmarkDetail.scenarioMapping}</h3>
                </div>
                <p className="text-[14px] leading-relaxed text-ink-500">{scenario}</p>
              </div>
            )}
          </div>
        )}

        {notes && (
          <div className="hair-t flex gap-2 p-4">
            <Info className="mt-0.5 size-3.5 shrink-0 text-ink-500" />
            <p className="text-[14px] leading-relaxed text-ink-500">{notes}</p>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[1fr_282px]">
          {/* Leaderboard */}
          <div className="hair-t min-w-0 overflow-hidden">
            {/*
             * Spread before ranking. A leaderboard invites the reader to compare
             * row 1 with row 2; on a saturated ruler that difference is noise.
             * Showing the cluster width first states plainly whether the ordering
             * below carries any signal at all.
             */}
            {rows.length >= 2 && (
              <div className="hair-b px-4 py-3.5">
                <div className="mb-2 flex items-center gap-1.5">
                  <h3 className="text-[14px] font-medium">{t.spread.title}</h3>
                  <InfoHint>{t.spread.note}</InfoHint>
                </div>
                <ScoreSpread rows={rows} />
              </div>
            )}
            <div className="flex items-center justify-between hair-b px-4 py-2.5">
              <div className="flex items-center gap-1.5">
                <Users className="size-3.5 text-ink-500" />
                <h3 className="text-[14px] font-medium">{t.benchmarkDetail.scoreRecords}</h3>
                <span className="tnum text-[14px] text-ink-500">{rows.length}</span>
              </div>
              <InfoHint>{metricExplain.normalized}</InfoHint>
            </div>
            {rows.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-[15px] font-medium">{t.benchmarkDetail.noRecordsTitle}</p>
                <p className="mt-1 text-[14px] text-ink-500">
                  {t.benchmarkDetail.noRecordsDesc}
                </p>
              </div>
            ) : (
              <table className="w-full text-[15px]">
                <thead>
                  <tr className="hair-b">
                    <th className="w-8 px-3 py-2 text-right text-[14px] font-semibold text-ink-700">#</th>
                    <th className="px-3 py-2 text-left text-[14px] font-semibold text-ink-700">{t.benchmarkDetail.colModel}</th>
                    <th className="px-3 py-2 text-right text-[14px] font-semibold text-ink-700">{t.common.raw}</th>
                    <th className="px-3 py-2 text-right text-[14px] font-semibold text-ink-700">{t.common.normalized}</th>
                    <th className="px-3 py-2 text-left text-[14px] font-semibold text-ink-700">{t.common.source}</th>
                    <th className="px-4 py-2 text-right text-[14px] font-semibold text-ink-700">{t.common.measured}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.id} className="hair-row hover:bg-surface transition-colors duration-120">
                      <td className="px-3 py-2 text-right"><Rank n={i + 1} /></td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <ProviderDot provider={r.provider} />
                          <span className="truncate text-[14px] text-ink-900">{r.modelName}</span>
                          {r.license === "open" && (
                            <span className="shrink-0 rounded border border-[color:var(--signal-good)]/35 px-1 text-[13px] text-good">
                              {t.benchmarkDetail.openLicense}
                            </span>
                          )}
                        </div>
                        <div className="text-[13px] text-ink-400 ml-3">
                          {r.provider}
                          {r.benchmarkVersion ? ` · ${r.benchmarkVersion}` : ""}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <ScoreBar value={r.rawScore} provider={r.provider} delay={i} />
                        {r.rawScoreSecondary !== null && (
                          <div className="tnum text-[13px] text-ink-500 mt-1">
                            {r.rawScoreSecondary} ({r.secondaryLabel})
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <ScoreBar value={r.normalized} max={top} provider={r.provider} delay={i} />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <SourceBadge sourceType={r.sourceType} />
                          {r.sourceUrl && (
                            <a href={r.sourceUrl} target="_blank" rel="noreferrer"
                              title={r.sourceName ?? undefined}
                              className="text-ink-500 transition-colors duration-150 hover:text-brand-qing">
                              <ExternalLink className="size-3" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <FreshnessDot freshness={r.freshness} />
                          <span className="tnum text-[14px] text-ink-500">{r.measuredAt ?? <span className="text-ink-400">—</span>}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Version history */}
          <div className="hair-t h-fit p-4">
            <div className="mb-3 flex items-center gap-1.5">
              <GitBranch className="size-3.5 text-ink-500" />
              <h3 className="text-[14px] font-medium">{t.benchmarkDetail.versionHistory}</h3>
            </div>
            {data.versions.length === 0 ? (
              <p className="text-[14px] text-ink-500">{t.benchmarkDetail.noVersions}</p>
            ) : (
              <div className="space-y-2">
                {data.versions.map(v => (
                  <div key={v.version} className="rounded-sm hair-all bg-background px-2.5 py-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className={cn("truncate font-mono text-[14px]", v.version === "" && "text-ink-500")}>
                        {v.version === "" ? t.benchmarkDetail.unlabeledVersion : v.version}
                      </span>
                      <span className="tnum shrink-0 text-[14px] text-ink-500">{t.benchmarkDetail.versionCount.replace("{n}", String(v.count))}</span>
                    </div>
                    {(v.firstSeen || v.lastSeen) && (
                      <div className="tnum mt-0.5 text-[14px] text-ink-400">
                        {v.firstSeen} → {v.lastSeen}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <p className="mt-3 hair-t pt-2.5 text-[14px] leading-relaxed text-ink-500">
              {t.benchmarkDetail.versionCaveat}
            </p>
          </div>
        </div>
      </div>
    </WorkbenchLayout>
  );
}
