import {
  ContaminationBadge,
  DIFFICULTY_EXPLAIN,
  DISC_EXPLAIN,
  FreshnessDot,
  InfoHint,
  MechanismBadge,
  NORMALIZED_EXPLAIN,
  SaturationBadge,
  ScoreMeter,
  SourceBadge,
  StanceBadge,
  StrictnessBadge,
  TRUST_EXPLAIN,
  UTILITY_EXPLAIN,
} from "@/components/MetaBadges";
import { WorkbenchLayout } from "@/components/WorkbenchLayout";
import { Ruler, MAX_DIFFICULTY, parseLeadingNumber, toneForScore } from "@/components/Ruler";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { CAPABILITY_LABELS, type CapabilityDomain } from "@shared/metaModel";
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

function Field({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex gap-3 py-1.5">
      <dt className="flex w-[92px] shrink-0 items-center gap-1 text-[11px] text-ink-500">
        {label}
        {hint && <InfoHint>{hint}</InfoHint>}
      </dt>
      <dd className="min-w-0 flex-1 text-xs leading-relaxed">{value}</dd>
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
}: {
  difficulty: number;
  sota: string | null;
  rows: Array<{ modelName: string; rawScore: number; normalized: number }>;
}) {
  /*
   * Top scores are usually within a point or two of each other, so three marks
   * on one baseline collide into an unreadable smear. Keep a mark only if it is
   * far enough along the rule to be legible beside the previous one.
   */
  const MIN_GAP = 9;
  const plottable: Array<{ modelName: string; rawScore: number; normalized: number }> = [];
  for (const r of rows) {
    if (r.rawScore < 0 || r.rawScore > 100) continue;
    if (plottable.some(p => Math.abs(p.rawScore - r.rawScore) < MIN_GAP)) continue;
    plottable.push(r);
    if (plottable.length === 3) break;
  }
  const sotaNum = parseLeadingNumber(sota);
  const sotaOnScale = sotaNum !== null && sotaNum >= 0 && sotaNum <= 100;
  const lengthPct = Math.round((Math.min(difficulty, MAX_DIFFICULTY) / MAX_DIFFICULTY) * 100);

  return (
    <section className="hair-b pb-7">
      <div className="mb-5 flex flex-wrap items-baseline gap-x-6 gap-y-1">
        <span className="ui text-ink-400 text-[10px] tracking-[0.16em] uppercase">
          这把尺 · this rule
        </span>
        <span className="ui text-ink-500 text-[11px]">
          长度为满尺的 <span className="tnum text-ink-800">{lengthPct}%</span>
          <span className="text-ink-400">（难度 ×{difficulty.toFixed(2)}，语料最严为 ×{MAX_DIFFICULTY}）</span>
        </span>
        {!sotaOnScale && sota && (
          <span className="ui text-ink-500 text-[11px]">
            当前最优 <span className="tnum">{sota}</span>
            <span className="text-ink-400">（非百分制，不画在尺上）</span>
          </span>
        )}
      </div>

      {plottable.length === 0 ? (
        <div className="py-2">
          <Ruler difficulty={difficulty} height={40} ticks={20} labelBelow />
          <p className="ui text-ink-400 mt-2 text-[11px]">
            尺已画出，但尚无可追溯的百分制成绩落在上面。
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
              title: `原始分 ${r.rawScore} · 归一化 ${r.normalized}`,
            }))}
          />
          <p className="ui text-ink-400 mt-1 text-[11px]">
            尺上是<span className="text-ink-600">原始分</span>；跨指标比较请看下表的归一化列。
            {plottable.length < Math.min(3, rows.length) && (
              <span>　只画出彼此可分辨的读数，其余成绩见下表。</span>
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

  if (isLoading) {
    return (
      <WorkbenchLayout title="指标详情">
        <div className="space-y-4">
          <Skeleton className="h-[220px] w-full rounded-sm" />
          <Skeleton className="h-[320px] w-full rounded-sm" />
        </div>
      </WorkbenchLayout>
    );
  }

  if (error || !data) {
    return (
      <WorkbenchLayout title="指标详情">
        <div className="hair-t p-6 text-center">
          <p className="text-sm">未找到该指标</p>
          <Link href="/benchmarks" className="mt-2 inline-flex items-center gap-1 text-xs text-frost-qing hover:underline">
            <ArrowLeft className="size-3" />
            返回指标库
          </Link>
        </div>
      </WorkbenchLayout>
    );
  }

  const b = data.benchmark;
  const rows = data.leaderboard;
  const top = rows[0]?.commonScale ?? 0;

  return (
    <WorkbenchLayout
      title={b.name}
      subtitle={
        <span className="flex items-center gap-2">
          <Link href="/benchmarks" className="hover:text-ink-900">指标库</Link>
          <span className="text-ink-400">/</span>
          <span>{CAPABILITY_LABELS[b.capabilityDomain as CapabilityDomain] ?? b.capabilityDomain}</span>
          {b.version && <><span className="text-ink-400">/</span><span>{b.version}</span></>}
        </span>
      }
      actions={
        <div className="flex items-center gap-2">
          {b.officialUrl && (
            <a href={b.officialUrl} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-sm hair-all px-2.5 py-1.5 text-xs transition-colors duration-150 hover:bg-frost-mist/50">
              <ExternalLink className="size-3" />官方
            </a>
          )}
          {b.paperUrl && (
            <a href={b.paperUrl} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-sm hair-all px-2.5 py-1.5 text-xs transition-colors duration-150 hover:bg-frost-mist/50">
              <BookOpen className="size-3" />论文
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
                  <span className="rounded-sm hair-all bg-frost-mist/50 px-1.5 py-0.5 text-[11px]">智能体任务</span>
                )}
                {b.hasNegativeAssertions && (
                  <span className="rounded-sm border border-[color:var(--signal-caution)]/35 px-1.5 py-0.5 text-[11px] text-caution">
                    含负向断言
                  </span>
                )}
                {b.isOpenSource && (
                  <span className="rounded-sm border border-[color:var(--signal-good)]/35 px-1.5 py-0.5 text-[11px] text-good">
                    开源可复现
                  </span>
                )}
              </div>

              <dl className="divide-y divide-border/60">
                <Field label="出题方" value={b.issuer} />
                <Field label="任务规模" value={b.taskCount} />
                <Field label="度量单位" value={b.metricUnit} />
                <Field
                  label="人类基线"
                  value={b.humanBaseline}
                  hint="有绝对人类参照的指标才能回答「模型是否已达到专业水平」这类问题。缺少基线时，分数只能横向比较。"
                />
                <Field label="当前最优" value={b.currentSotaScore} />
                <Field
                  label="置信区间"
                  value={
                    b.ciDisclosed ? (
                      b.confidenceInterval
                    ) : (
                      <span className="inline-flex items-center gap-1 text-caution">
                        <AlertTriangle className="size-3" />
                        未披露
                      </span>
                    )
                  }
                  hint="未披露置信区间时，榜单上 1–2 个百分点的差距无法判断是否为噪声。全库仅约 13% 的指标公布了误差范围。"
                />
              </dl>
            </div>

            {/* Rating meters */}
            <div className="space-y-3 rounded-sm hair-all bg-background p-4">
              <div className="flex items-baseline justify-between">
                <span className="flex items-center gap-1 text-[11px] tracking-wide text-ink-500 uppercase">
                  效用分
                  <InfoHint>{UTILITY_EXPLAIN}</InfoHint>
                </span>
                <span className="tnum text-2xl leading-none text-frost-qing">{b.utilityScore}</span>
              </div>
              <div className="space-y-2.5 hair-t pt-3">
                <ScoreMeter value={b.trustScore} label="可信度" explain={TRUST_EXPLAIN} />
                <ScoreMeter value={b.discriminativePower} label="分辨力" explain={DISC_EXPLAIN} tone="violet" />
                <div className="flex items-baseline justify-between pt-1">
                  <span className="flex items-center gap-1 text-[11px] text-ink-500">
                    难度系数
                    <InfoHint>{DIFFICULTY_EXPLAIN}</InfoHint>
                  </span>
                  <span className="tnum text-sm text-caution">
                    ×{b.difficultyCoefficient.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Interpretation caveat — placed before the leaderboard on purpose. */}
        {(b.interpretationCaveat || b.scenarioMapping) && (
          <div className="grid gap-3 lg:grid-cols-2">
            {b.interpretationCaveat && (
              <div className="hair-t border-[color:var(--signal-caution)]/25 p-4">
                <div className="mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="size-3.5 text-caution" />
                  <h3 className="text-[13px]">解读警示</h3>
                </div>
                <p className="text-xs leading-relaxed text-ink-500">{b.interpretationCaveat}</p>
              </div>
            )}
            {b.scenarioMapping && (
              <div className="hair-t p-4">
                <div className="mb-2 flex items-center gap-1.5">
                  <Target className="size-3.5 text-frost-qing" />
                  <h3 className="text-[13px]">对应落地场景</h3>
                </div>
                <p className="text-xs leading-relaxed text-ink-500">{b.scenarioMapping}</p>
              </div>
            )}
          </div>
        )}

        {b.notes && (
          <div className="hair-t flex gap-2 p-4">
            <Info className="mt-0.5 size-3.5 shrink-0 text-ink-500" />
            <p className="text-xs leading-relaxed text-ink-500">{b.notes}</p>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[1fr_282px]">
          {/* Leaderboard */}
          <div className="hair-t min-w-0 overflow-hidden">
            <div className="flex items-center justify-between hair-b px-4 py-2.5">
              <div className="flex items-center gap-1.5">
                <Users className="size-3.5 text-ink-500" />
                <h3 className="text-[13px]">分数记录</h3>
                <span className="tnum text-[11px] text-ink-500">{rows.length}</span>
              </div>
              <InfoHint>{NORMALIZED_EXPLAIN}</InfoHint>
            </div>
            {rows.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-sm">尚无收录的分数记录</p>
                <p className="mt-1 text-xs text-ink-500">
                  该指标已纳入元模型库，但还没有可追溯出处的模型成绩。
                </p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="hair-b text-[11px] tracking-wide text-ink-500 uppercase">
                    <th className="w-8 px-3 py-2 text-right">#</th>
                    <th className="px-3 py-2 text-left">模型</th>
                    <th className="px-3 py-2 text-right">原始分</th>
                    <th className="px-3 py-2 text-right">归一化</th>
                    <th className="px-3 py-2 text-left">出处</th>
                    <th className="px-4 py-2 text-right">采集</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.id} className="hair-b last:border-0 hover:bg-frost-mist/40">
                      <td className="tnum px-3 py-2 text-right text-[11px] text-ink-500">{i + 1}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-[13px]">{r.modelName}</span>
                          {r.license === "open" && (
                            <span className="shrink-0 rounded border border-[color:var(--signal-good)]/35 px-1 text-[9px] text-good">
                              开放
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-ink-500">
                          {r.provider}
                          {r.benchmarkVersion ? ` · ${r.benchmarkVersion}` : ""}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className="tnum text-[13px]">{r.rawScore}</span>
                        {r.rawScoreSecondary !== null && (
                          <div className="tnum text-[10px] text-ink-500">
                            {r.rawScoreSecondary} ({r.secondaryLabel})
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <div className="hidden h-1 w-14 overflow-hidden rounded-full bg-frost-mist/50 sm:block">
                            <div
                              className="h-full rounded-full bg-frost-qing/60"
                              style={{ width: `${Math.max(2, Math.min(100, (r.commonScale / Math.max(top, 1)) * 100))}%` }}
                            />
                          </div>
                          <span className="tnum text-[13px]">{r.normalized}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <SourceBadge sourceType={r.sourceType} />
                          {r.sourceUrl && (
                            <a href={r.sourceUrl} target="_blank" rel="noreferrer"
                              title={r.sourceName ?? undefined}
                              className="text-ink-500 transition-colors duration-150 hover:text-frost-qing">
                              <ExternalLink className="size-3" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <FreshnessDot freshness={r.freshness} />
                          <span className="tnum text-[11px] text-ink-500">{r.measuredAt ?? "—"}</span>
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
              <h3 className="text-[13px]">版本谱系</h3>
            </div>
            {data.versions.length === 0 ? (
              <p className="text-xs text-ink-500">暂无版本记录。</p>
            ) : (
              <div className="space-y-2">
                {data.versions.map(v => (
                  <div key={v.version} className="rounded-sm hair-all bg-background px-2.5 py-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className={cn("truncate font-mono text-[11px]", v.version === "未标注版本" && "text-ink-500")}>
                        {v.version}
                      </span>
                      <span className="tnum shrink-0 text-[10px] text-ink-500">{v.count} 条</span>
                    </div>
                    {(v.firstSeen || v.lastSeen) && (
                      <div className="tnum mt-0.5 text-[10px] text-ink-400">
                        {v.firstSeen} → {v.lastSeen}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <p className="mt-3 hair-t pt-2.5 text-[10px] leading-relaxed text-ink-500">
              版本号即难度。同一评测的不同版本通常刻意提高了难度上限，跨版本的分数不可直接比较——
              把 v2.1 的 88% 与 v3.0 的 26% 并列是典型误读。
            </p>
          </div>
        </div>
      </div>
    </WorkbenchLayout>
  );
}
