import {
  FreshnessDot,
  InfoHint,
  SaturationBadge,
  SourceBadge,
} from "@/components/MetaBadges";
import { WorkbenchLayout } from "@/components/WorkbenchLayout";
import { useT } from "@/i18n";
import { NoteBlock } from "@/components/MarginNote";
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
import { type CapabilityDomain } from "@shared/metaModel";
import { ExternalLink, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { providerColor, formatPrice } from "@/lib/series";
import { ScoreBar, Rank, ProviderDot } from "@/components/ScoreBar";

const PALETTE = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

export default function Compare() {
  const t = useT();
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
      title={t.compare.title}
      subtitle={
        selected.length === 0
          ? t.compare.subtitleEmpty
          : t.compare.subtitleSelected.replace("{models}", String(picked.length)).replace("{benchmarks}", String(table.length))
      }
      readNext={[
        { href: "/decide", label: t.compare.readNextDecide, why: t.compare.readNextDecideWhy },
        { href: "/benchmarks", label: t.compare.readNextBenchmarks, why: t.compare.readNextBenchmarksWhy },
      ]}
      aside={
        <>
          <NoteBlock label={t.compare.noteSharedOnlyTitle}>
            <p>
              {t.compare.noteSharedOnlyP1}
              <strong className="text-ink-700">{t.compare.noteSharedOnlyP1Strong}</strong>
            </p>
          </NoteBlock>
          <NoteBlock label={t.compare.noteTraceableTitle}>
            <p>{t.compare.noteTraceableP1}</p>
            <p>{t.compare.noteTraceableP2}</p>
          </NoteBlock>
        </>
      }
      actions={
        selected.length > 1 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 rounded-sm hair-all px-2.5 py-1.5">
                <Switch checked={sharedOnly} onCheckedChange={setSharedOnly} className="scale-90" />
                <span className="text-[14px] whitespace-nowrap">{t.compare.sharedOnly}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-[300px] text-[14px] leading-relaxed">
              {t.compare.sharedOnlyTooltip}
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
              className="hair-t flex items-center gap-2 px-3 py-2"
              style={{ borderColor: `color-mix(in oklch, ${PALETTE[i]} 40%, transparent)` }}
            >
              <span className="size-2 shrink-0 rounded-full" style={{ background: PALETTE[i] }} />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5"><ProviderDot provider={m?.provider} /><div className="truncate text-[14px] text-ink-900">{m?.name ?? slug}</div></div>
                <div className="truncate text-[14px] text-ink-500">{m?.provider ?? ""}</div>
              </div>
              <button
                onClick={() => setSelected(selected.filter(s => s !== slug))}
                className="ml-1 rounded p-0.5 text-ink-500 transition-colors duration-150 hover:bg-surface-2 transition-colors duration-120 hover:text-ink-900"
              >
                <X className="size-3.5" />
              </button>
            </div>
          );
        })}
        {selected.length < 4 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-[52px] gap-1.5 rounded-none border-dashed px-4 text-[14px]"
              >
                <Plus className="size-3.5" />
                {t.common.addModel}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0" align="start">
              <Command>
                <CommandInput placeholder={t.common.searchModel} className="text-[14px]" />
                <CommandList>
                  <CommandEmpty className="py-4 text-center text-[14px] text-ink-500">{t.common.noModelFound}</CommandEmpty>
                  <CommandGroup>
                    {all
                      .filter(m => !selected.includes(m.slug) && m.coverage > 0)
                      .map(m => (
                        <CommandItem
                          key={m.slug}
                          value={`${m.name} ${m.provider}`}
                          onSelect={() => setSelected([...selected, m.slug])}
                          className="text-[14px]"
                        >
                          <div className="flex w-full items-center justify-between gap-2">
                            <span className="truncate">{m.name}</span>
                            <span className="tnum shrink-0 text-[14px] text-ink-500">
                              {t.common.recordsCount.replace("{n}", String(m.coverage))}
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
        <div className="hair-t py-16">
          <div className="max-w-[46ch]">
            <p className="text-ink-800 text-[19px] leading-snug font-medium">
              {t.compare.emptyStateTitle}
            </p>
            <p className="ui text-ink-500 mt-2.5 text-[14px] leading-relaxed">
              {t.compare.emptyStateDesc}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Composite summary */}
          <div className="mb-4 grid gap-3" style={{ gridTemplateColumns: `repeat(${picked.length}, minmax(0, 1fr))` }}>
            {picked.map((m, i) => (
              <div key={m.slug} className="hair-t p-4">
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ background: PALETTE[i] }} />
                  <span className="truncate text-[14px] text-ink-500">{m.provider}</span>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5"><ProviderDot provider={m.provider} /><div className="truncate text-[14px] text-ink-900">{m.name}</div></div>
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <div className="tnum text-2xl leading-none" style={{ color: PALETTE[i] }}>
                      {m.compositeScore ?? "—"}
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-[14px] text-ink-500">
                      {t.compare.compositeScore}
                      <InfoHint>{t.metricExplain.normalized}</InfoHint>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="tnum text-[15px]">{m.coverage}</div>
                    <div className="text-[14px] text-ink-500">{t.compare.evidenceCount}</div>
                  </div>
                </div>
                {m.priceOutput !== null && (
                  <div className="mt-2 hair-t pt-2 text-[14px] text-ink-500">
                    {t.compare.priceOutput.replace("{price}", String(m.priceOutput))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Per-benchmark comparison */}
          <div className="hair-t">
            <table className="w-full text-[15px]">
              <thead>
                <tr className="hair-b text-[14px] font-semibold text-ink-700">
                  <th className="px-4 py-2 text-left">{t.compare.metric}</th>
                  {picked.map((m, i) => (
                    <th key={m.slug} className="px-3 py-2 text-right">
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
                    <tr key={b.slug} className="hair-b last:border-0 hover:bg-surface transition-colors duration-120">
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-[14px]">{b.name}</div>
                            <div className="flex items-center gap-1.5 text-[14px] text-ink-500">
                              <span>{t.capability[b.domain as CapabilityDomain] ?? b.domain}</span>
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
                              <span className="text-ink-400">—</span>
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
                                  <ScoreBar value={cell.normalized} provider={picked[i].provider} delay={i} />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="w-[260px] space-y-1 text-[14px]">
                                <div className="grid grid-cols-2 gap-x-3 text-ink-500">
                                  <span>{t.compare.rawScore}</span>
                                  <span className="tnum text-right text-ink-900">{cell.rawScore}</span>
                                  <span>{t.compare.normalized}</span>
                                  <span className="tnum text-right text-ink-900">{cell.normalized}</span>
                                  <span>{t.compare.measuredAt}</span>
                                  <span className="tnum text-right text-ink-900">{cell.measuredAt ?? t.common.unlabeled}</span>
                                </div>
                                <div className="pt-0.5">
                                  <SourceBadge sourceType={cell.sourceType} />
                                </div>
                                {cell.sourceUrl && (
                                  <a href={cell.sourceUrl} target="_blank" rel="noreferrer"
                                    className="flex items-center gap-1 text-brand-qing hover:underline">
                                    <ExternalLink className="size-3" />
                                    <span className="truncate">{cell.sourceName ?? t.common.source}</span>
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
                <p className="text-[15px]">{t.compare.noSharedMetrics}</p>
                <p className="mt-1 text-[14px] text-ink-500">
                  {t.compare.noSharedMetricsDesc}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </WorkbenchLayout>
  );
}
