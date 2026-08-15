import {
  FreshnessDot,
  InfoHint,
  NORMALIZED_EXPLAIN,
  SaturationBadge,
  SourceBadge,
} from "@/components/MetaBadges";
import { WorkbenchLayout } from "@/components/WorkbenchLayout";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { CAPABILITY_LABELS, type CapabilityDomain } from "@shared/metaModel";
import { ExternalLink, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";

const PALETTE = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

export default function Compare() {
  const params = new URLSearchParams(window.location.search);
  const initial = [params.get("a"), params.get("b")].filter((v): v is string => Boolean(v));

  const models = trpc.models.list.useQuery();
  const [selected, setSelected] = useState<string[]>(initial.length > 0 ? initial : []);
  const [sharedOnly, setSharedOnly] = useState(true);

  const compare = trpc.models.compare.useQuery(
    { slugs: selected },
    { enabled: selected.length > 0 },
  );

  const all = models.data ?? [];
  const rows = compare.data?.rows ?? [];
  const shared = compare.data?.sharedBenchmarks ?? [];

  /** Build one row per benchmark with a cell per selected model. */
  const table = useMemo(() => {
    const byBenchmark = new Map<
      string,
      {
        slug: string;
        name: string;
        domain: string;
        saturation: string;
        difficulty: number;
        cells: Map<string, (typeof rows)[number]>;
      }
    >();
    for (const r of rows) {
      const cur =
        byBenchmark.get(r.benchmarkSlug) ??
        {
          slug: r.benchmarkSlug,
          name: r.benchmarkName,
          domain: r.capabilityDomain,
          saturation: r.saturationStatus,
          difficulty: r.difficultyCoefficient,
          cells: new Map<string, (typeof rows)[number]>(),
        };
      cur.cells.set(r.modelSlug, r);
      byBenchmark.set(r.benchmarkSlug, cur);
    }
    let list = Array.from(byBenchmark.values());
    if (sharedOnly && selected.length > 1) list = list.filter(b => shared.includes(b.slug));
    return list.sort((a, b) => a.domain.localeCompare(b.domain) || a.name.localeCompare(b.name));
  }, [rows, sharedOnly, shared, selected.length]);

  const picked = compare.data?.models ?? [];

  return (
    <WorkbenchLayout
      title="对战台"
      subtitle={
        selected.length === 0
          ? "选择 2–4 个模型进行同尺对比"
          : `${picked.length} 个模型 · ${table.length} 个可比指标`
      }
      actions={
        selected.length > 1 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5">
                <Switch checked={sharedOnly} onCheckedChange={setSharedOnly} className="scale-90" />
                <span className="text-xs font-medium whitespace-nowrap">仅共同指标</span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-[300px] text-xs leading-relaxed">
              只有所有被选模型都测过的指标才构成真正的对比。关闭后会显示全部指标，但缺失格不代表能力弱，
              只代表没有公开记录。
            </TooltipContent>
          </Tooltip>
        )
      }
    >
      {/* Model slots */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {selected.map((slug, i) => {
          const m = all.find(x => x.slug === slug);
          return (
            <div
              key={slug}
              className="panel flex items-center gap-2 px-3 py-2"
              style={{ borderColor: `color-mix(in oklch, ${PALETTE[i]} 40%, transparent)` }}
            >
              <span className="size-2 shrink-0 rounded-full" style={{ background: PALETTE[i] }} />
              <div className="min-w-0">
                <div className="truncate text-[13px] font-medium">{m?.name ?? slug}</div>
                <div className="truncate text-[10px] text-muted-foreground">{m?.provider ?? ""}</div>
              </div>
              <button
                onClick={() => setSelected(selected.filter(s => s !== slug))}
                className="ml-1 rounded p-0.5 text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </div>
          );
        })}
        {selected.length < 4 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-[52px] gap-1.5 border-dashed px-4 text-xs">
                <Plus className="size-3.5" />
                添加模型
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0" align="start">
              <Command>
                <CommandInput placeholder="搜索模型…" className="text-xs" />
                <CommandList>
                  <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">未找到模型</CommandEmpty>
                  <CommandGroup>
                    {all
                      .filter(m => !selected.includes(m.slug) && m.coverage > 0)
                      .map(m => (
                        <CommandItem
                          key={m.slug}
                          value={`${m.name} ${m.provider}`}
                          onSelect={() => setSelected([...selected, m.slug])}
                          className="text-xs"
                        >
                          <div className="flex w-full items-center justify-between gap-2">
                            <span className="truncate">{m.name}</span>
                            <span className="tnum shrink-0 text-[10px] text-muted-foreground">
                              {m.coverage} 条
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {selected.length === 0 ? (
        <div className="grid-canvas flex h-[320px] items-center justify-center rounded-lg border border-border">
          <div className="panel max-w-md px-6 py-5 text-center">
            <p className="text-sm font-medium">从上方添加模型开始对比</p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              对战台只在共同测过的指标上做比较，并对每个数值标注出处与采集时间。
              跨指标的总分差异会用归一化口径消除量纲影响。
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Composite summary */}
          <div className="mb-4 grid gap-3" style={{ gridTemplateColumns: `repeat(${picked.length}, minmax(0, 1fr))` }}>
            {picked.map((m, i) => (
              <div key={m.slug} className="panel p-4">
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ background: PALETTE[i] }} />
                  <span className="truncate text-xs text-muted-foreground">{m.provider}</span>
                </div>
                <div className="mt-1.5 truncate text-[13px] font-semibold">{m.name}</div>
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <div className="tnum text-2xl leading-none font-semibold" style={{ color: PALETTE[i] }}>
                      {m.compositeScore ?? "—"}
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                      综合分
                      <InfoHint>{NORMALIZED_EXPLAIN}</InfoHint>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="tnum text-sm">{m.coverage}</div>
                    <div className="text-[10px] text-muted-foreground">证据条数</div>
                  </div>
                </div>
                {m.priceOutput !== null && (
                  <div className="mt-2 border-t border-border pt-2 text-[10px] text-muted-foreground">
                    输出 ${m.priceOutput} / 百万 token
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Per-benchmark comparison */}
          <div className="panel overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-[11px] tracking-wide text-muted-foreground uppercase">
                  <th className="px-4 py-2 text-left font-medium">指标</th>
                  {picked.map((m, i) => (
                    <th key={m.slug} className="px-3 py-2 text-right font-medium">
                      <span style={{ color: PALETTE[i] }}>{m.name}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.map(b => {
                  const vals = picked.map(m => b.cells.get(m.slug)?.normalized ?? null);
                  const best = Math.max(...vals.filter((v): v is number => v !== null), -1);
                  return (
                    <tr key={b.slug} className="border-b border-border/60 last:border-0 hover:bg-secondary/30">
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-[13px]">{b.name}</div>
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                              <span>{CAPABILITY_LABELS[b.domain as CapabilityDomain] ?? b.domain}</span>
                              <span className="tnum">×{b.difficulty.toFixed(2)}</span>
                            </div>
                          </div>
                          <SaturationBadge status={b.saturation} className="ml-auto shrink-0" />
                        </div>
                      </td>
                      {picked.map((m, i) => {
                        const cell = b.cells.get(m.slug);
                        if (!cell) {
                          return (
                            <td key={m.slug} className="px-3 py-2 text-right">
                              <span className="text-xs text-muted-foreground/30">无记录</span>
                            </td>
                          );
                        }
                        const isBest = cell.normalized === best && vals.filter(v => v !== null).length > 1;
                        return (
                          <td key={m.slug} className="px-3 py-2 text-right">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="inline-flex cursor-help items-center justify-end gap-1.5">
                                  <FreshnessDot freshness={cell.freshness} />
                                  <span
                                    className={cn("tnum text-[13px]", isBest && "font-semibold")}
                                    style={isBest ? { color: PALETTE[i] } : undefined}
                                  >
                                    {cell.normalized}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="w-[260px] space-y-1 text-xs">
                                <div className="grid grid-cols-2 gap-x-3 text-muted-foreground">
                                  <span>原始分</span>
                                  <span className="tnum text-right text-foreground">{cell.rawScore}</span>
                                  <span>归一化</span>
                                  <span className="tnum text-right text-foreground">{cell.normalized}</span>
                                  <span>采集</span>
                                  <span className="tnum text-right text-foreground">{cell.measuredAt ?? "未标注"}</span>
                                </div>
                                <div className="pt-0.5">
                                  <SourceBadge sourceType={cell.sourceType} />
                                </div>
                                {cell.sourceUrl && (
                                  <a href={cell.sourceUrl} target="_blank" rel="noreferrer"
                                    className="flex items-center gap-1 text-primary hover:underline">
                                    <ExternalLink className="size-3" />
                                    <span className="truncate">{cell.sourceName ?? "出处"}</span>
                                  </a>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {table.length === 0 && (
              <div className="px-4 py-8 text-center">
                <p className="text-sm font-medium">这些模型没有共同测过的指标</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  关闭「仅共同指标」可查看各自的记录，但请注意那不构成直接对比。
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </WorkbenchLayout>
  );
}
