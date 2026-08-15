import { InfoHint, SaturationBadge, SourceBadge } from "@/components/MetaBadges";
import { WorkbenchLayout } from "@/components/WorkbenchLayout";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { AlertTriangle, ChevronRight, Compass, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

export default function Decide() {
  const scenarios = trpc.meta.scenarios.useQuery();
  const [scenario, setScenario] = useState("agentic_coding");
  const [openOnly, setOpenOnly] = useState(false);
  const [currentOnly, setCurrentOnly] = useState(false);
  const [priceInput, setPriceInput] = useState("");

  const maxOutputPrice = priceInput.trim() === "" ? null : Number(priceInput);
  const rec = trpc.recommend.byScenario.useQuery({
    scenario,
    openWeightOnly: openOnly,
    currentOnly,
    maxOutputPrice: Number.isFinite(maxOutputPrice) ? maxOutputPrice : null,
  });

  const list = scenarios.data ?? [];
  const results = rec.data?.results ?? [];
  const active = rec.data?.scenario;

  return (
    <WorkbenchLayout
      title="场景决策"
      subtitle="按落地场景加权指标证据，输出带依据的模型排序"
    >
      <div className="grid gap-5 xl:grid-cols-[268px_1fr]">
        {/* Scenario picker + constraints */}
        <div className="space-y-4">
          <div className="panel overflow-hidden">
            <div className="border-b border-border px-3 py-2 text-[11px] tracking-wide text-muted-foreground uppercase">
              落地场景
            </div>
            <div className="p-1.5">
              {list.map(s => (
                <button
                  key={s.key}
                  onClick={() => setScenario(s.key)}
                  className={cn(
                    "group flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left transition-colors duration-150",
                    scenario === s.key ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/50",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate text-xs font-medium">{s.title}</span>
                  <ChevronRight
                    className={cn("size-3.5 shrink-0 transition-transform duration-150", scenario === s.key && "text-primary")}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="panel p-3">
            <div className="mb-2.5 text-[11px] tracking-wide text-muted-foreground uppercase">部署约束</div>
            <div className="space-y-3">
              <label className="flex items-center justify-between gap-2">
                <span className="text-xs">仅开放权重</span>
                <Switch checked={openOnly} onCheckedChange={setOpenOnly} className="scale-90" />
              </label>
              <label className="flex items-center justify-between gap-2">
                <span className="text-xs">仅当前世代</span>
                <Switch checked={currentOnly} onCheckedChange={setCurrentOnly} className="scale-90" />
              </label>
              <div>
                <div className="mb-1.5 flex items-center gap-1 text-xs">
                  输出价格上限
                  <InfoHint>单位为美元 / 百万 output token。留空表示不限制；价格未公开的模型不会被此约束排除。</InfoHint>
                </div>
                <Input
                  value={priceInput}
                  onChange={e => setPriceInput(e.target.value)}
                  placeholder="例如 15"
                  inputMode="decimal"
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Ranked recommendations */}
        <div className="min-w-0 space-y-4">
          {active && (
            <div className="panel p-4">
              <div className="flex items-start gap-2">
                <Compass className="mt-0.5 size-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <h3 className="text-[13px] font-semibold">{active.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{active.summary}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">重点指标</span>
                    {active.emphasisSlugs.map(s => (
                      <Link
                        key={s}
                        href={`/benchmarks/${s}`}
                        className="rounded border border-border bg-secondary/50 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground transition-colors duration-150 hover:border-primary/40 hover:text-primary"
                      >
                        {s}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {rec.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[120px] w-full rounded-lg" />)}
            </div>
          ) : results.length === 0 ? (
            <div className="grid-canvas flex h-[280px] items-center justify-center rounded-lg border border-border">
              <div className="panel max-w-sm px-6 py-5 text-center">
                <p className="text-sm font-medium">没有模型满足当前约束</p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  该场景要求至少 2 条相关指标证据。放宽价格上限或关闭「仅开放权重」再试。
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {results.map((r, idx) => (
                <div key={r.modelSlug} className="panel overflow-hidden">
                  <div className="flex items-start gap-3 p-4">
                    <span
                      className={cn(
                        "tnum mt-0.5 grid size-6 shrink-0 place-items-center rounded-md text-[11px] font-semibold",
                        idx === 0
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground",
                      )}
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="text-[13px] font-semibold">{r.modelName}</span>
                        <span className="text-[11px] text-muted-foreground">{r.provider}</span>
                        {r.license === "open" && (
                          <span className="rounded border border-[color:var(--signal-good)]/35 px-1 text-[9px] text-[color:var(--signal-good)]">
                            开放权重
                          </span>
                        )}
                        {r.status === "superseded" && (
                          <span className="text-[9px] text-muted-foreground/70">已被取代</span>
                        )}
                        <span className="ml-auto flex items-baseline gap-1">
                          <span className="tnum text-lg leading-none font-semibold text-primary">{r.fitScore}</span>
                          <span className="text-[10px] text-muted-foreground">契合度</span>
                        </span>
                      </div>

                      {/* Evidence: the recommendation must show its work. */}
                      <div className="mt-2.5 space-y-1">
                        {r.evidence.map(e => (
                          <div key={e.benchmarkSlug} className="flex items-center gap-2 text-[11px]">
                            <Link
                              href={`/benchmarks/${e.benchmarkSlug}`}
                              className="w-[168px] shrink-0 truncate text-muted-foreground hover:text-primary"
                            >
                              {e.benchmarkName}
                            </Link>
                            <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary/60"
                                style={{ width: `${Math.max(2, Math.min(100, e.normalized))}%` }}
                              />
                            </div>
                            <span className="tnum w-9 shrink-0 text-right">{e.normalized}</span>
                            <span className="tnum w-14 shrink-0 text-right text-muted-foreground/70">
                              权重 {e.weight.toFixed(2)}
                            </span>
                            <SourceBadge sourceType={e.sourceType} className="shrink-0" />
                            {e.sourceUrl && (
                              <a
                                href={e.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="shrink-0 text-muted-foreground transition-colors duration-150 hover:text-primary"
                              >
                                <ExternalLink className="size-3" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-border pt-2">
                        <span className="tnum text-[10px] text-muted-foreground">
                          共 {r.evidenceCount} 条相关证据
                        </span>
                        {r.priceOutput !== null && (
                          <span className="tnum text-[10px] text-muted-foreground">输出 ${r.priceOutput}/M</span>
                        )}
                        {r.caveats.map(c => (
                          <span
                            key={c}
                            className="inline-flex items-center gap-1 rounded border border-[color:var(--signal-caution)]/35 bg-[color:var(--signal-caution)]/10 px-1.5 py-0.5 text-[10px] text-[color:var(--signal-caution)]"
                          >
                            <AlertTriangle className="size-2.5" />
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-[11px] leading-relaxed text-muted-foreground">
            契合度不是绝对能力分，而是「该模型在这个场景相关的、可信且未饱和的指标上，归一化后的加权表现」。
            权重会放大场景重点指标、智能体类任务与含负向断言的评测，并按出处强度打折——厂商自报数据的权重低于第三方复跑。
          </p>
        </div>
      </div>
    </WorkbenchLayout>
  );
}
