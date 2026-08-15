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
      <dt className="flex w-[92px] shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
        {label}
        {hint && <InfoHint>{hint}</InfoHint>}
      </dt>
      <dd className="min-w-0 flex-1 text-xs leading-relaxed">{value}</dd>
    </div>
  );
}

export default function BenchmarkDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading, error } = trpc.benchmarks.detail.useQuery({ slug });

  if (isLoading) {
    return (
      <WorkbenchLayout title="指标详情">
        <div className="space-y-4">
          <Skeleton className="h-[220px] w-full rounded-lg" />
          <Skeleton className="h-[320px] w-full rounded-lg" />
        </div>
      </WorkbenchLayout>
    );
  }

  if (error || !data) {
    return (
      <WorkbenchLayout title="指标详情">
        <div className="panel p-6 text-center">
          <p className="text-sm font-medium">未找到该指标</p>
          <Link href="/benchmarks" className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">
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
          <Link href="/benchmarks" className="hover:text-foreground">指标库</Link>
          <span className="text-muted-foreground/40">/</span>
          <span>{CAPABILITY_LABELS[b.capabilityDomain as CapabilityDomain] ?? b.capabilityDomain}</span>
          {b.version && <><span className="text-muted-foreground/40">/</span><span>{b.version}</span></>}
        </span>
      }
      actions={
        <div className="flex items-center gap-2">
          {b.officialUrl && (
            <a href={b.officialUrl} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs transition-colors duration-150 hover:bg-secondary">
              <ExternalLink className="size-3" />官方
            </a>
          )}
          {b.paperUrl && (
            <a href={b.paperUrl} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs transition-colors duration-150 hover:bg-secondary">
              <BookOpen className="size-3" />论文
            </a>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {/* Credibility rating card — the most prominent element on the page. */}
        <div className="panel p-5">
          <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap gap-1.5">
                <SaturationBadge status={b.saturationStatus} />
                <StrictnessBadge strictness={b.strictness} />
                <MechanismBadge mechanism={b.scoringMechanism} />
                <StanceBadge stance={b.issuerStance} />
                <ContaminationBadge risk={b.contaminationRisk} />
                {b.isAgentic && (
                  <span className="rounded-md border border-border bg-secondary/60 px-1.5 py-0.5 text-[11px]">智能体任务</span>
                )}
                {b.hasNegativeAssertions && (
                  <span className="rounded-md border border-[color:var(--signal-caution)]/35 px-1.5 py-0.5 text-[11px] text-[color:var(--signal-caution)]">
                    含负向断言
                  </span>
                )}
                {b.isOpenSource && (
                  <span className="rounded-md border border-[color:var(--signal-good)]/35 px-1.5 py-0.5 text-[11px] text-[color:var(--signal-good)]">
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
                      <span className="inline-flex items-center gap-1 text-[color:var(--signal-caution)]">
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
            <div className="space-y-3 rounded-lg border border-border bg-background/40 p-4">
              <div className="flex items-baseline justify-between">
                <span className="flex items-center gap-1 text-[11px] tracking-wide text-muted-foreground uppercase">
                  效用分
                  <InfoHint>{UTILITY_EXPLAIN}</InfoHint>
                </span>
                <span className="tnum text-2xl leading-none font-semibold text-primary">{b.utilityScore}</span>
              </div>
              <div className="space-y-2.5 border-t border-border pt-3">
                <ScoreMeter value={b.trustScore} label="可信度" explain={TRUST_EXPLAIN} />
                <ScoreMeter value={b.discriminativePower} label="分辨力" explain={DISC_EXPLAIN} tone="violet" />
                <div className="flex items-baseline justify-between pt-1">
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    难度系数
                    <InfoHint>{DIFFICULTY_EXPLAIN}</InfoHint>
                  </span>
                  <span className="tnum text-sm font-semibold text-[color:var(--signal-caution)]">
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
              <div className="panel border-[color:var(--signal-caution)]/25 p-4">
                <div className="mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="size-3.5 text-[color:var(--signal-caution)]" />
                  <h3 className="text-[13px] font-semibold">解读警示</h3>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">{b.interpretationCaveat}</p>
              </div>
            )}
            {b.scenarioMapping && (
              <div className="panel p-4">
                <div className="mb-2 flex items-center gap-1.5">
                  <Target className="size-3.5 text-primary" />
                  <h3 className="text-[13px] font-semibold">对应落地场景</h3>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">{b.scenarioMapping}</p>
              </div>
            )}
          </div>
        )}

        {b.notes && (
          <div className="panel flex gap-2 p-4">
            <Info className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            <p className="text-xs leading-relaxed text-muted-foreground">{b.notes}</p>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[1fr_282px]">
          {/* Leaderboard */}
          <div className="panel min-w-0 overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <div className="flex items-center gap-1.5">
                <Users className="size-3.5 text-muted-foreground" />
                <h3 className="text-[13px] font-semibold">分数记录</h3>
                <span className="tnum text-[11px] text-muted-foreground">{rows.length}</span>
              </div>
              <InfoHint>{NORMALIZED_EXPLAIN}</InfoHint>
            </div>
            {rows.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-sm font-medium">尚无收录的分数记录</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  该指标已纳入元模型库，但还没有可追溯出处的模型成绩。
                </p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-[11px] tracking-wide text-muted-foreground uppercase">
                    <th className="w-8 px-3 py-2 text-right font-medium">#</th>
                    <th className="px-3 py-2 text-left font-medium">模型</th>
                    <th className="px-3 py-2 text-right font-medium">原始分</th>
                    <th className="px-3 py-2 text-right font-medium">归一化</th>
                    <th className="px-3 py-2 text-left font-medium">出处</th>
                    <th className="px-4 py-2 text-right font-medium">采集</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/30">
                      <td className="tnum px-3 py-2 text-right text-[11px] text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-[13px]">{r.modelName}</span>
                          {r.license === "open" && (
                            <span className="shrink-0 rounded border border-[color:var(--signal-good)]/35 px-1 text-[9px] text-[color:var(--signal-good)]">
                              开放
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {r.provider}
                          {r.benchmarkVersion ? ` · ${r.benchmarkVersion}` : ""}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className="tnum text-[13px]">{r.rawScore}</span>
                        {r.rawScoreSecondary !== null && (
                          <div className="tnum text-[10px] text-muted-foreground">
                            {r.rawScoreSecondary} ({r.secondaryLabel})
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <div className="hidden h-1 w-14 overflow-hidden rounded-full bg-muted sm:block">
                            <div
                              className="h-full rounded-full bg-primary/60"
                              style={{ width: `${Math.max(2, Math.min(100, (r.commonScale / Math.max(top, 1)) * 100))}%` }}
                            />
                          </div>
                          <span className="tnum text-[13px] font-medium">{r.normalized}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <SourceBadge sourceType={r.sourceType} />
                          {r.sourceUrl && (
                            <a href={r.sourceUrl} target="_blank" rel="noreferrer"
                              title={r.sourceName ?? undefined}
                              className="text-muted-foreground transition-colors duration-150 hover:text-primary">
                              <ExternalLink className="size-3" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <FreshnessDot freshness={r.freshness} />
                          <span className="tnum text-[11px] text-muted-foreground">{r.measuredAt ?? "—"}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Version history */}
          <div className="panel h-fit p-4">
            <div className="mb-3 flex items-center gap-1.5">
              <GitBranch className="size-3.5 text-muted-foreground" />
              <h3 className="text-[13px] font-semibold">版本谱系</h3>
            </div>
            {data.versions.length === 0 ? (
              <p className="text-xs text-muted-foreground">暂无版本记录。</p>
            ) : (
              <div className="space-y-2">
                {data.versions.map(v => (
                  <div key={v.version} className="rounded-md border border-border bg-background/40 px-2.5 py-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className={cn("truncate font-mono text-[11px]", v.version === "未标注版本" && "text-muted-foreground")}>
                        {v.version}
                      </span>
                      <span className="tnum shrink-0 text-[10px] text-muted-foreground">{v.count} 条</span>
                    </div>
                    {(v.firstSeen || v.lastSeen) && (
                      <div className="tnum mt-0.5 text-[10px] text-muted-foreground/70">
                        {v.firstSeen} → {v.lastSeen}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <p className="mt-3 border-t border-border pt-2.5 text-[10px] leading-relaxed text-muted-foreground">
              版本号即难度。同一评测的不同版本通常刻意提高了难度上限，跨版本的分数不可直接比较——
              把 v2.1 的 88% 与 v3.0 的 26% 并列是典型误读。
            </p>
          </div>
        </div>
      </div>
    </WorkbenchLayout>
  );
}
