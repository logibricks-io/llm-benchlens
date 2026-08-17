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
import { useT } from "@/i18n";
import type { ScenarioKey } from "@shared/metaModel";

export default function Decide() {
  const t = useT();
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
      title={t.decide.title}
      subtitle={t.decide.subtitle}
      readNext={[
        { href: "/compare", label: t.nav.compare, why: t.decide.readNextCompareWhy },
        { href: "/benchmarks", label: t.nav.benchmarks, why: t.decide.readNextBenchmarksWhy },
      ]}
    >
      <div className="grid gap-5 xl:grid-cols-[268px_1fr]">
        {/* Scenario picker + constraints */}
        <div className="space-y-4">
          <div className="hair-t">
            <div className="hair-b px-3 py-2 text-[12px] tracking-wide text-ink-500 uppercase">
              {t.decide.scenarioLabel}
            </div>
            <div className="p-1.5">
              {list.map(s => (
                <button
                  key={s.key}
                  onClick={() => setScenario(s.key)}
                  className={cn(
                    "group flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-left transition-colors duration-150",
                    scenario === s.key ? "bg-frost-mist/60 text-ink-900" : "text-ink-500 hover:bg-frost-mist/50",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate text-xs">
                    {t.scenario[s.key as ScenarioKey] ?? s.key}
                  </span>
                  <ChevronRight
                    className={cn("size-3.5 shrink-0 transition-transform duration-150", scenario === s.key && "text-frost-qing")}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="hair-t p-3">
            <div className="mb-2.5 text-[12px] tracking-wide text-ink-500 uppercase">{t.decide.deploymentConstraints}</div>
            <div className="space-y-3">
              <label className="flex items-center justify-between gap-2">
                <span className="text-xs">{t.decide.openWeightOnly}</span>
                <Switch checked={openOnly} onCheckedChange={setOpenOnly} className="scale-90" />
              </label>
              <label className="flex items-center justify-between gap-2">
                <span className="text-xs">{t.decide.currentGenerationOnly}</span>
                <Switch checked={currentOnly} onCheckedChange={setCurrentOnly} className="scale-90" />
              </label>
              <div>
                <div className="mb-1.5 flex items-center gap-1 text-xs">
                  {t.decide.maxOutputPrice}
                  <InfoHint>{t.decide.maxOutputPriceHint}</InfoHint>
                </div>
                <Input
                  value={priceInput}
                  onChange={e => setPriceInput(e.target.value)}
                  placeholder={t.decide.pricePlaceholder}
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
            <div className="hair-t p-4">
              <div className="flex items-start gap-2">
                <Compass className="mt-0.5 size-4 shrink-0 text-frost-qing" />
                <div className="min-w-0">
                  <h3 className="text-[13px]">{t.scenario[active.key as ScenarioKey] ?? active.key}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-ink-500">
                    {t.scenarioSummary[active.key as ScenarioKey] ?? ""}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    <span className="text-[12px] text-ink-500">{t.decide.emphasisMetrics}</span>
                    {active.emphasisSlugs.map(s => (
                      <Link
                        key={s}
                        href={`/benchmarks/${s}`}
                        className="rounded hair-all bg-frost-mist/50 px-1.5 py-0.5 font-mono text-[12px] text-ink-500 transition-colors duration-150 hover:border-frost-qing/40 hover:text-frost-qing"
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
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[120px] w-full rounded-sm" />)}
            </div>
          ) : results.length === 0 ? (
            <div className="flex h-[280px] items-center justify-center rounded-sm hair-all">
              <div className="hair-t max-w-sm px-6 py-5 text-center">
                <p className="text-sm">{t.decide.noModelsMatch}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-500">
                  {t.decide.noModelsMatchHint}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {results.map((r, idx) => (
                <div key={r.modelSlug} className="hair-t">
                  <div className="flex items-start gap-3 p-4">
                    <span
                      className={cn(
                        "tnum mt-0.5 grid size-6 shrink-0 place-items-center rounded-sm text-[12px]",
                        idx === 0
                          ? "bg-frost-qing text-paper"
                          : "bg-frost-mist/60 text-ink-500",
                      )}
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="text-[13px]">{r.modelName}</span>
                        <span className="text-[12px] text-ink-500">{r.provider}</span>
                        {r.license === "open" && (
                          <span className="rounded border border-[color:var(--signal-good)]/35 px-1 text-[12px] text-good">
                            {t.decide.openWeight}
                          </span>
                        )}
                        {r.status === "superseded" && (
                          <span className="text-[12px] text-ink-400">{t.decide.superseded}</span>
                        )}
                        <span className="ml-auto flex items-baseline gap-1">
                          <span className="tnum text-lg leading-none text-frost-qing">{r.fitScore}</span>
                          <span className="text-[12px] text-ink-500">{t.decide.fitScore}</span>
                        </span>
                      </div>

                      {/* Evidence: the recommendation must show its work. */}
                      <div className="mt-2.5 space-y-1">
                        {r.evidence.map(e => (
                          <div key={e.benchmarkSlug} className="flex items-center gap-2 text-[12px]">
                            <Link
                              href={`/benchmarks/${e.benchmarkSlug}`}
                              className="w-[168px] shrink-0 truncate text-ink-500 hover:text-frost-qing"
                            >
                              {e.benchmarkName}
                            </Link>
                            <div className="h-1 flex-1 overflow-hidden rounded-full bg-frost-mist/50">
                              <div
                                className="h-full rounded-full bg-frost-qing/60"
                                style={{ width: `${Math.max(2, Math.min(100, e.normalized))}%` }}
                              />
                            </div>
                            <span className="tnum w-9 shrink-0 text-right">{e.normalized}</span>
                            <span className="tnum w-14 shrink-0 text-right text-ink-400">
                              {t.decide.weight.replace("{weight}", e.weight.toFixed(2))}
                            </span>
                            <SourceBadge sourceType={e.sourceType} className="shrink-0" />
                            {e.sourceUrl && (
                              <a
                                href={e.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="shrink-0 text-ink-500 transition-colors duration-150 hover:text-frost-qing"
                              >
                                <ExternalLink className="size-3" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="mt-2.5 flex flex-wrap items-center gap-2 hair-t pt-2">
                        <span className="tnum text-[12px] text-ink-500">
                          {t.decide.evidenceCount.replace("{count}", String(r.evidenceCount))}
                        </span>
                        {r.priceOutput !== null && (
                          <span className="tnum text-[12px] text-ink-500">
                            {t.decide.outputPrice.replace("{price}", String(r.priceOutput))}
                          </span>
                        )}
                        {r.caveats.map(c => (
                          <span
                            key={c}
                            className="inline-flex items-center gap-1 rounded border border-[color:var(--signal-caution)]/35 bg-[color:var(--signal-caution)]/10 px-1.5 py-0.5 text-[12px] text-caution"
                          >
                            <AlertTriangle className="size-2.5" />
                            {t.caveat[c]}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-[12px] leading-relaxed text-ink-500">
            {t.decide.fitScoreExplain}
          </p>
        </div>
      </div>
    </WorkbenchLayout>
  );
}
