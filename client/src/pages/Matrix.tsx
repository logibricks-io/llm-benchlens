import {
  DIFFICULTY_EXPLAIN,
  FreshnessDot,
  InfoHint,
  NORMALIZED_EXPLAIN,
  SaturationBadge,
  SourceBadge,
} from "@/components/MetaBadges";
import { WorkbenchLayout } from "@/components/WorkbenchLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MiniRuler, toneForScore } from "@/components/Ruler";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  CAPABILITY_LABELS,
  MECHANISM_LABELS,
  SATURATION_LABELS,
  STANCE_LABELS,
  type CapabilityDomain,
  type ScoringMechanism,
} from "@shared/metaModel";
import { ArrowUpDown, Columns3, ExternalLink, Filter, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";

type MatrixRow = {
  modelSlug: string;
  modelName: string;
  provider: string;
  license: string;
  modelStatus: string;
  benchmarkSlug: string;
  benchmarkName: string;
  capabilityDomain: string;
  saturationStatus: string;
  scoringMechanism: string;
  issuerStance: string;
  strictness: string;
  scoreForm: string;
  difficultyCoefficient: number;
  rawScore: number;
  rawScoreSecondary: number | null;
  secondaryLabel: string | null;
  benchmarkVersion: string | null;
  normalized: number;
  commonScale: number;
  sourceType: string;
  sourceName: string | null;
  sourceUrl: string | null;
  measuredAt: string | null;
  freshness: string;
};

const ALL = "__all__";

/**
 * Mirrors the server-side shrinkage in `aggregate()`. Kept in sync deliberately:
 * a row average that ignores evidence count would contradict the composite
 * score shown everywhere else in the product.
 */
const SHRINK_K = 4;
const PRIOR = 50;

/*
 * No per-cell heat fill. Shading 95 columns turns the table into a mosaic and
 * spends the whole colour budget on decoration; a number plus a short graduated
 * tick reads faster and keeps the page on paper.
 */

export default function Matrix() {
  const matrix = trpc.models.matrix.useQuery();
  const benchmarks = trpc.benchmarks.list.useQuery();

  const [domain, setDomain] = useState(ALL);
  const [saturation, setSaturation] = useState(ALL);
  const [stance, setStance] = useState(ALL);
  const [mechanism, setMechanism] = useState(ALL);
  const [query, setQuery] = useState("");
  const [normalize, setNormalize] = useState(true);
  const [sortBy, setSortBy] = useState<"composite" | "coverage" | "name">("composite");
  /** Explicitly hidden benchmark columns. Empty set = show everything. */
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());

  const rows = (matrix.data ?? []) as MatrixRow[];

  const filteredRows = useMemo(() => {
    return rows.filter(r => {
      if (domain !== ALL && r.capabilityDomain !== domain) return false;
      if (saturation !== ALL && r.saturationStatus !== saturation) return false;
      if (stance !== ALL && r.issuerStance !== stance) return false;
      if (mechanism !== ALL && r.scoringMechanism !== mechanism) return false;
      return true;
    });
  }, [rows, domain, saturation, stance, mechanism]);

  // Columns = benchmarks that survive the filters, ordered by how many models
  // they cover (dense columns first keeps the table readable).
  const allColumns = useMemo(() => {
    const counts = new Map<string, { slug: string; name: string; count: number; difficulty: number; saturation: string; scoreForm: string }>();
    for (const r of filteredRows) {
      const cur = counts.get(r.benchmarkSlug) ?? {
        slug: r.benchmarkSlug,
        name: r.benchmarkName,
        count: 0,
        difficulty: r.difficultyCoefficient,
        saturation: r.saturationStatus,
        scoreForm: r.scoreForm,
      };
      cur.count++;
      counts.set(r.benchmarkSlug, cur);
    }
    return Array.from(counts.values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [filteredRows]);

  const columns = useMemo(() => allColumns.filter(c => !hiddenCols.has(c.slug)), [allColumns, hiddenCols]);

  const modelRows = useMemo(() => {
    const byModel = new Map<
      string,
      { slug: string; name: string; provider: string; license: string; status: string; cells: Map<string, MatrixRow> }
    >();
    for (const r of filteredRows) {
      const cur =
        byModel.get(r.modelSlug) ??
        {
          slug: r.modelSlug,
          name: r.modelName,
          provider: r.provider,
          license: r.license,
          status: r.modelStatus,
          cells: new Map<string, MatrixRow>(),
        };
      cur.cells.set(r.benchmarkSlug, r);
      byModel.set(r.modelSlug, cur);
    }
    let list = Array.from(byModel.values());
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(m => m.name.toLowerCase().includes(q) || m.provider.toLowerCase().includes(q));
    }
    const composite = (m: (typeof list)[number]) => {
      const vals = Array.from(m.cells.values());
      if (vals.length === 0) return -1;
      const key = normalize ? "normalized" : "commonScale";
      const mean = vals.reduce((a, v) => a + (v[key as "normalized"] as number), 0) / vals.length;
      const confidence = vals.length / (vals.length + SHRINK_K);
      return confidence * mean + (1 - confidence) * PRIOR;
    };
    if (sortBy === "composite") list.sort((a, b) => composite(b) - composite(a));
    else if (sortBy === "coverage") list.sort((a, b) => b.cells.size - a.cells.size);
    else list.sort((a, b) => a.name.localeCompare(b.name));
    return list.map(m => ({ ...m, composite: composite(m) }));
  }, [filteredRows, query, sortBy, normalize]);

  const bmMeta = benchmarks.data ?? [];
  const domains = Array.from(new Set(bmMeta.map(b => b.capabilityDomain)));
  const stances = Array.from(new Set(bmMeta.map(b => b.issuerStance)));
  const mechanisms = Array.from(new Set(bmMeta.map(b => b.scoringMechanism)));

  const activeFilters = [domain, saturation, stance, mechanism].filter(v => v !== ALL).length;

  return (
    <WorkbenchLayout
      title="指标矩阵"
      subtitle={`${modelRows.length} 个模型 × ${columns.length} 个指标 · ${filteredRows.length} 条记录`}
      wide
      actions={
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 px-2.5 text-xs">
                <Columns3 className="size-3" />
                列
                {hiddenCols.size > 0 && (
                  <span className="tnum rounded-full bg-frost-qing/12 px-1.5 text-[10px] text-frost-qing">
                    -{hiddenCols.size}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[260px] p-0" align="end">
              <div className="flex items-center justify-between hair-b px-3 py-2">
                <span className="text-xs">显示的指标列</span>
                <button
                  onClick={() => setHiddenCols(new Set())}
                  className="text-[11px] text-frost-qing hover:underline"
                >
                  全选
                </button>
              </div>
              <div className="max-h-[300px] overflow-y-auto p-1.5">
                {allColumns.map(c => {
                  const shown = !hiddenCols.has(c.slug);
                  return (
                    <label
                      key={c.slug}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-frost-mist/50"
                    >
                      <Checkbox
                        checked={shown}
                        onCheckedChange={() => {
                          setHiddenCols(prev => {
                            const next = new Set(prev);
                            if (next.has(c.slug)) next.delete(c.slug);
                            else next.add(c.slug);
                            return next;
                          });
                        }}
                        className="scale-90"
                      />
                      <span className="min-w-0 flex-1 truncate text-xs">{c.name}</span>
                      <span className="tnum shrink-0 text-[10px] text-ink-500">{c.count}</span>
                    </label>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 rounded-sm hair-all px-2.5 py-1.5">
                <Switch checked={normalize} onCheckedChange={setNormalize} className="scale-90" />
                <span className="text-xs whitespace-nowrap">
                  {normalize ? "归一化分" : "原始分"}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-[320px] text-xs leading-relaxed">{NORMALIZED_EXPLAIN}</TooltipContent>
          </Tooltip>
          <Select value={sortBy} onValueChange={v => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <ArrowUpDown className="size-3" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="composite">按均分</SelectItem>
              <SelectItem value="coverage">按覆盖数</SelectItem>
              <SelectItem value="name">按名称</SelectItem>
            </SelectContent>
          </Select>
        </div>
      }
    >
      {/* Filter bar */}
      <div className="hair-b bg-background sticky top-0 z-20 flex flex-wrap items-center gap-2 px-7 py-2.5">
        <div className="ui text-ink-500 flex items-center gap-1.5 text-[11px]">
          <Filter className="size-3.5" />
          <span>筛选</span>
          {activeFilters > 0 && (
            <span className="tnum text-frost-qing text-[10px]">{activeFilters}</span>
          )}
        </div>
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="搜索模型或厂商"
          className="h-8 w-[160px] text-xs"
        />
        <FilterSelect
          value={domain}
          onChange={setDomain}
          placeholder="能力域"
          options={domains.map(d => ({ value: d, label: CAPABILITY_LABELS[d as CapabilityDomain] ?? d }))}
        />
        <FilterSelect
          value={saturation}
          onChange={setSaturation}
          placeholder="饱和状态"
          options={["frontier", "contested", "saturated"].map(s => ({
            value: s,
            label: SATURATION_LABELS[s as keyof typeof SATURATION_LABELS],
          }))}
        />
        <FilterSelect
          value={stance}
          onChange={setStance}
          placeholder="出题方立场"
          options={stances.map(s => ({ value: s, label: STANCE_LABELS[s as keyof typeof STANCE_LABELS] ?? s }))}
        />
        <FilterSelect
          value={mechanism}
          onChange={setMechanism}
          placeholder="评分机制"
          options={mechanisms.map(m => ({ value: m, label: MECHANISM_LABELS[m as ScoringMechanism] ?? m }))}
        />
        {(activeFilters > 0 || query) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 px-2 text-xs"
            onClick={() => {
              setDomain(ALL);
              setSaturation(ALL);
              setStance(ALL);
              setMechanism(ALL);
              setQuery("");
            }}
          >
            <X className="size-3" />
            清除
          </Button>
        )}
      </div>

      {matrix.isLoading ? (
        <div className="space-y-2 p-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : columns.length === 0 ? (
        <div className="flex h-[320px] items-center justify-center">
          <div className="text-center">
            <p className="text-ink-800 text-[15px]">当前筛选组合下没有记录</p>
            <p className="ui text-ink-500 mt-1.5 text-[11px]">尝试放宽能力域或饱和状态筛选</p>
          </div>
        </div>
      ) : (
        <div className="overflow-auto">
          <table className="w-max border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="hair-r hair-b bg-background ui text-ink-400 sticky left-0 z-10 w-[210px] min-w-[210px] px-7 py-2 text-left align-bottom text-[9px] tracking-[0.14em] uppercase">
                  模型
                </th>
                <th className="hair-r hair-b bg-background ui text-ink-400 sticky left-[210px] z-10 w-[64px] min-w-[64px] px-2 py-2 text-right align-bottom text-[9px] uppercase">
                  <span className="inline-flex items-center gap-1 normal-case">
                    均分
                    <InfoHint>
                      本行已测指标的均值，并按证据条数向全库中位（50）收缩：n 条证据时观测均值仅占 n/(n+4) 权重。
                      因此只测过一两项的模型不会靠一次高分排到前面。
                    </InfoHint>
                  </span>
                </th>
                {columns.map(c => (
                  <th
                    key={c.slug}
                    /* Rotated headers: 95 columns cannot carry horizontal labels,
                       and the diagonal is what makes this read as a printed
                       table rather than a spreadsheet. */
                    className="hair-b h-[124px] w-[46px] min-w-[46px] p-0 align-bottom"
                  >
                    <div className="relative h-[124px] w-[46px] overflow-visible">
                      <Link
                        href={`/benchmarks/${c.slug}`}
                        className="group absolute bottom-1.5 left-3 block"
                        style={{ transform: "rotate(-42deg)", transformOrigin: "left bottom" }}
                      >
                        {/* 124px of vertical room at 42° allows ~166px of run;
                            cap the label so it never climbs past the header. */}
                        <div className="flex max-w-[158px] items-baseline gap-1.5 whitespace-nowrap">
                          <span className="text-ink-700 group-hover:text-ink-900 max-w-[104px] truncate text-[10.5px] transition-colors duration-150">
                            {c.name}
                          </span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="tnum text-ink-400 shrink-0 cursor-help text-[9px]">
                                ×{c.difficulty.toFixed(2)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[300px] text-xs leading-relaxed">
                              {DIFFICULTY_EXPLAIN}
                            </TooltipContent>
                          </Tooltip>
                          {c.saturation === "saturated" && (
                            <span className="ui text-danger shrink-0 text-[8.5px]">饱和</span>
                          )}
                          {c.scoreForm === "elo" && (
                            <span className="ui text-ink-400 shrink-0 text-[8.5px]">Elo</span>
                          )}
                        </div>
                      </Link>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modelRows.map(m => (
                <tr key={m.slug} className="group">
                  <td className="hair-r hair-row bg-background sticky left-0 z-10 px-7 py-1.5">
                    <Link href={`/models?focus=${m.slug}`} className="block min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-ink-800 truncate text-[12.5px]">{m.name}</span>
                        {m.license === "open" && (
                          <span className="ui text-good shrink-0 text-[8.5px]">开放</span>
                        )}
                        {m.status === "superseded" && (
                          <span className="ui text-ink-400 shrink-0 text-[8.5px]">已取代</span>
                        )}
                      </div>
                      <div className="ui text-ink-400 truncate text-[9.5px]">{m.provider}</div>
                    </Link>
                  </td>
                  <td className="tnum hair-r hair-row bg-background text-ink-900 sticky left-[210px] z-10 px-2 py-1.5 text-right text-[12.5px]">
                    {m.composite >= 0 ? m.composite.toFixed(1) : "—"}
                  </td>
                  {columns.map(c => {
                    const cell = m.cells.get(c.slug);
                    if (!cell) {
                      return (
                        <td key={c.slug} className="hair-row px-1 py-1.5 text-center">
                          <span className="text-ink-400/40 text-[11px]">·</span>
                        </td>
                      );
                    }
                    const shown = normalize ? cell.normalized : cell.commonScale;
                    return (
                      <td key={c.slug} className="hair-row px-1 py-1.5 text-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            {/* number + a short rule: precise value plus a sense
                                of where it sits, without a colour wash */}
                            <div className="cursor-help">
                              <div className="flex items-center justify-center gap-0.5">
                                <FreshnessDot freshness={cell.freshness} />
                                <span className="tnum text-ink-800 text-[11.5px]">
                                  {shown.toFixed(1)}
                                </span>
                              </div>
                              <MiniRuler
                                value={cell.normalized}
                                tone={toneForScore(cell.normalized)}
                                width={30}
                                className="mt-[2px]"
                              />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="w-[290px] space-y-1.5 text-xs">
                            <div className="">
                              {cell.modelName} · {cell.benchmarkName}
                            </div>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-ink-500">
                              <span>原始分</span>
                              <span className="tnum text-right text-ink-900">
                                {cell.rawScore}
                                {cell.scoreForm === "elo" ? " Elo" : cell.scoreForm === "percentage" ? "%" : ""}
                              </span>
                              {cell.rawScoreSecondary !== null && (
                                <>
                                  <span>{cell.secondaryLabel ?? "第二读数"}</span>
                                  <span className="tnum text-right text-ink-900">{cell.rawScoreSecondary}</span>
                                </>
                              )}
                              <span>归一化</span>
                              <span className="tnum text-right text-ink-900">{cell.normalized}</span>
                              <span>难度系数</span>
                              <span className="tnum text-right text-ink-900">×{cell.difficultyCoefficient.toFixed(2)}</span>
                              {cell.benchmarkVersion && (
                                <>
                                  <span>评测版本</span>
                                  <span className="text-right text-ink-900">{cell.benchmarkVersion}</span>
                                </>
                              )}
                              <span>采集时间</span>
                              <span className="tnum text-right text-ink-900">{cell.measuredAt ?? "未标注"}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-1 pt-0.5">
                              <SourceBadge sourceType={cell.sourceType} />
                              <SaturationBadge status={cell.saturationStatus} />
                            </div>
                            {cell.sourceUrl && (
                              <a
                                href={cell.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 pt-0.5 text-frost-qing hover:underline"
                              >
                                <ExternalLink className="size-3" />
                                <span className="truncate">{cell.sourceName ?? "查看出处"}</span>
                              </a>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="ui text-ink-500 flex items-center gap-2 px-7 py-4 text-[10.5px]">
            <InfoHint>
              单元格下方短刻度的长度代表归一化分高低。点号表示该模型在该指标上没有可追溯的公开记录——缺失本身也是信息，
              厂商通常只公布对自己有利的指标。
            </InfoHint>
            <span>
              每个数值均可悬停查看原始分、难度系数、评测版本、采集时间与出处链接。
            </span>
          </div>
        </div>
      )}
    </WorkbenchLayout>
  );
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 w-[132px] text-xs">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{placeholder}（全部）</SelectItem>
        {options.map(o => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
