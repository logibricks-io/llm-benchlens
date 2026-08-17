import {
  FreshnessDot,
  InfoHint,
  SaturationBadge,
  SourceBadge,
  useMetricExplain,
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
  type CapabilityDomain,
  type ScoringMechanism,
} from "@shared/metaModel";
import { ArrowUpDown, Columns3, ExternalLink, Filter, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useT } from "@/i18n";
import { providerColor } from "@/lib/series";
import { ScoreBar, ProviderDot } from "@/components/ScoreBar";

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
  const t = useT();
  const metricExplain = useMetricExplain();
  /*
   * The compact endpoint sends models, benchmarks and cells as three tables
   * instead of one wide row per score: 294 KB rather than 828 KB, because the
   * flat shape repeated each model's and benchmark's metadata on all 857 rows.
   * The join below restores the original field names so nothing downstream of
   * `rows` has to know the wire format changed.
   */
  const matrix = trpc.models.matrixCompact.useQuery();
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

  const rows = useMemo<MatrixRow[]>(() => {
    const d = matrix.data;
    if (!d) return [];
    const mById = new Map(d.models.map(m => [m.slug, m]));
    const bById = new Map(d.benchmarks.map(b => [b.slug, b]));
    const out: MatrixRow[] = [];
    for (const c of d.cells) {
      const m = mById.get(c.m);
      const b = bById.get(c.b);
      if (!m || !b) continue;
      out.push({
        modelSlug: m.slug,
        modelName: m.name,
        provider: m.provider,
        license: m.license,
        modelStatus: m.status,
        priceInput: m.priceInput,
        priceOutput: m.priceOutput,
        benchmarkSlug: b.slug,
        benchmarkName: b.name,
        benchmarkVersion: b.version,
        capabilityDomain: b.capabilityDomain,
        scoreForm: b.scoreForm,
        strictness: b.strictness,
        saturationStatus: b.saturationStatus,
        scoringMechanism: b.scoringMechanism,
        issuerStance: b.issuerStance,
        contaminationRisk: b.contaminationRisk,
        trustScore: b.trustScore,
        discriminativePower: b.discriminativePower,
        difficultyCoefficient: b.difficultyCoefficient,
        rawScore: c.raw,
        rawScoreSecondary: c.raw2,
        secondaryLabel: c.label2,
        commonScale: c.scale,
        normalized: c.norm,
        evidenceWeight: c.w,
        freshness: c.fresh,
        measuredAt: c.at,
        sourceType: c.st,
        sourceName: c.sn,
        sourceUrl: c.su,
      } as MatrixRow);
    }
    return out;
  }, [matrix.data]);

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
      title={t.nav.matrix}
      subtitle={t.matrix.subtitle
        .replace("{models}", String(modelRows.length))
        .replace("{benchmarks}", String(columns.length))
        .replace("{records}", String(filteredRows.length))}
      wide
      actions={
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 px-2.5 text-[14px]">
                <Columns3 className="size-3" />
                {t.common.columns}
                {hiddenCols.size > 0 && (
                  <span className="tnum rounded-full bg-surface-2 px-1.5 text-[13px] text-brand-qing">
                    -{hiddenCols.size}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[260px] p-0" align="end">
              <div className="flex items-center justify-between hair-b px-3 py-2">
                <span className="text-[14px]">{t.matrix.visibleColumns}</span>
                <button
                  onClick={() => setHiddenCols(new Set())}
                  className="text-[14px] text-brand-qing hover:underline"
                >
                  {t.common.all}
                </button>
              </div>
              <div className="max-h-[300px] overflow-y-auto p-1.5">
                {allColumns.map(c => {
                  const shown = !hiddenCols.has(c.slug);
                  return (
                    <label
                      key={c.slug}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-surface-2"
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
                      <span className="min-w-0 flex-1 truncate text-[14px]">{c.name}</span>
                      <span className="tnum shrink-0 text-[14px] text-ink-500">{c.count}</span>
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
                <span className="text-[14px] whitespace-nowrap">
                  {normalize ? t.common.normalized : t.common.raw}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-[320px] text-[14px] leading-relaxed">{metricExplain.normalized}</TooltipContent>
          </Tooltip>
          <Select value={sortBy} onValueChange={v => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="h-8 w-[120px] text-[14px]">
              <ArrowUpDown className="size-3" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="composite">{t.matrix.sortComposite}</SelectItem>
              <SelectItem value="coverage">{t.matrix.sortCoverage}</SelectItem>
              <SelectItem value="name">{t.matrix.sortName}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      }
    >
      {/* Filter bar */}
      {/* Parks below the floating islet so the rotated headers never sit under it. */}
      <div className="hair-b bg-background sticky top-[54px] z-20 flex flex-wrap items-center gap-2 px-7 py-2.5">
        <div className="ui text-ink-500 flex items-center gap-1.5 text-[14px]">
          <Filter className="size-3.5" />
          <span>{t.common.filters}</span>
          {activeFilters > 0 && (
            <span className="tnum text-brand-qing text-[14px]">{activeFilters}</span>
          )}
        </div>
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t.matrix.searchPlaceholder}
          className="h-8 w-[160px] text-[14px]"
        />
        <FilterSelect
          value={domain}
          onChange={setDomain}
          placeholder={t.matrix.filterDomain}
          options={domains.map(d => ({ value: d, label: t.capability[d as keyof typeof t.capability] ?? d }))}
          allLabel={t.matrix.filterAll}
        />
        <FilterSelect
          value={saturation}
          onChange={setSaturation}
          placeholder={t.matrix.filterSaturation}
          options={["frontier", "contested", "saturated"].map(s => ({
            value: s,
            label: t.saturation[s as keyof typeof t.saturation],
          }))}
          allLabel={t.matrix.filterAll}
        />
        <FilterSelect
          value={stance}
          onChange={setStance}
          placeholder={t.matrix.filterStance}
          options={stances.map(s => ({ value: s, label: t.stance[s as keyof typeof t.stance] ?? s }))}
          allLabel={t.matrix.filterAll}
        />
        <FilterSelect
          value={mechanism}
          onChange={setMechanism}
          placeholder={t.matrix.filterMechanism}
          options={mechanisms.map(m => ({ value: m, label: t.mechanism[m as keyof typeof t.mechanism] ?? m }))}
          allLabel={t.matrix.filterAll}
        />
        {(activeFilters > 0 || query) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 px-2 text-[14px]"
            onClick={() => {
              setDomain(ALL);
              setSaturation(ALL);
              setStance(ALL);
              setMechanism(ALL);
              setQuery("");
            }}
          >
            <X className="size-3" />
            {t.common.clear}
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
            <p className="text-ink-800 text-[15px]">{t.matrix.noRecords}</p>
            <p className="ui text-ink-500 mt-1.5 text-[14px]">{t.matrix.noRecordsHint}</p>
          </div>
        </div>
      ) : (
        <div className="overflow-auto">
          <table className="w-max border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="hair-r hair-b bg-background ui text-ink-700 sticky left-0 z-10 w-[210px] min-w-[210px] px-7 py-2 text-left align-bottom text-[14px] font-semibold">
                  {t.matrix.colModel}
                </th>
                <th className="hair-r hair-b bg-background ui text-ink-700 sticky left-[210px] z-10 w-[64px] min-w-[64px] px-2 py-2 text-right align-bottom text-[14px] font-semibold">
                  <span className="inline-flex items-center gap-1">
                    {t.matrix.colMean}
                    <InfoHint>
                      {t.matrix.meanHint}
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
                        <div className="flex max-w-[158px] items-baseline gap-1.5">
                          <span className="text-ink-700 group-hover:text-ink-900 max-w-[104px] truncate text-[14px] font-semibold transition-colors duration-120">
                            {c.name}
                          </span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="tnum text-ink-500 shrink-0 cursor-help text-[14px]">
                                ×{c.difficulty.toFixed(2)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[300px] text-[14px] leading-relaxed">
                              {metricExplain.difficulty}
                            </TooltipContent>
                          </Tooltip>
                          {c.saturation === "saturated" && (
                            <span className="ui text-danger shrink-0 text-[13px]">{t.matrix.badgeSaturated}</span>
                          )}
                          {c.scoreForm === "elo" && (
                            <span className="ui text-ink-500 shrink-0 text-[13px]">Elo</span>
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
                <tr key={m.slug} className="group hover:bg-surface transition-colors duration-120">
                  <td className="hair-r hair-row bg-background group-hover:bg-surface sticky left-0 z-10 px-7 py-1.5 transition-colors duration-120">
                    <Link href={`/models?focus=${m.slug}`} className="block min-w-0">
                      <div className="flex items-center gap-1.5">
                        <ProviderDot provider={m.provider} />
                        <span className="text-ink-900 truncate text-[14px]">{m.name}</span>
                        {m.license === "open" && (
                          <span className="ui text-good shrink-0 text-[13px]">{t.matrix.badgeOpen}</span>
                        )}
                        {m.status === "superseded" && (
                          <span className="ui text-ink-500 shrink-0 text-[13px]">{t.matrix.badgeSuperseded}</span>
                        )}
                      </div>
                      <div className="ui text-ink-400 truncate text-[13px]">{m.provider}</div>
                    </Link>
                  </td>
                  <td className="tnum hair-r hair-row bg-background group-hover:bg-surface sticky left-[210px] z-10 px-2 py-1.5 text-right text-[14px] transition-colors duration-120">
                    {m.composite >= 0 ? (
                      <ScoreBar value={m.composite} provider={m.provider} delay={0} />
                    ) : (
                      <span className="text-ink-400">—</span>
                    )}
                  </td>
                  {columns.map(c => {
                    const cell = m.cells.get(c.slug);
                    if (!cell) {
                      return (
                        <td key={c.slug} className="hair-row px-1 py-1.5 text-center">
                          <span className="text-ink-400">—</span>
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
                                <span className="tnum text-ink-900 text-[14px]">
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
                          <TooltipContent className="w-[290px] space-y-1.5 text-[14px]">
                            <div className="">
                              {cell.modelName} · {cell.benchmarkName}
                            </div>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-ink-500">
                              <span>{t.common.raw}</span>
                              <span className="tnum text-right text-ink-900">
                                {cell.rawScore}
                                {cell.scoreForm === "elo" ? " Elo" : cell.scoreForm === "percentage" ? "%" : ""}
                              </span>
                              {cell.rawScoreSecondary !== null && (
                                <>
                                  <span>{cell.secondaryLabel ?? t.matrix.secondaryReading}</span>
                                  <span className="tnum text-right text-ink-900">{cell.rawScoreSecondary}</span>
                                </>
                              )}
                              <span>{t.common.normalized}</span>
                              <span className="tnum text-right text-ink-900">{cell.normalized}</span>
                              <span>{t.common.difficulty}</span>
                              <span className="tnum text-right text-ink-900">×{cell.difficultyCoefficient.toFixed(2)}</span>
                              {cell.benchmarkVersion && (
                                <>
                                  <span>{t.matrix.benchmarkVersion}</span>
                                  <span className="text-right text-ink-900">{cell.benchmarkVersion}</span>
                                </>
                              )}
                              <span>{t.common.measured}</span>
                              <span className="tnum text-right text-ink-900">{cell.measuredAt ?? t.matrix.unmarked}</span>
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
                                className="flex items-center gap-1 pt-0.5 text-brand-qing hover:underline"
                              >
                                <ExternalLink className="size-3" />
                                <span className="truncate">{cell.sourceName ?? t.common.viewSource}</span>
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
          <div className="ui text-ink-500 flex items-center gap-2 px-7 py-4 text-[14px]">
            <InfoHint>
              {t.matrix.footerHint1}
            </InfoHint>
            <span>
              {t.matrix.footerHint2}
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
  allLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: Array<{ value: string; label: string }>;
  allLabel: string;
}) {
  if (options.length < 8) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className="chip"
          data-on={value === ALL}
          onClick={() => onChange(ALL)}
        >
          {placeholder} {allLabel}
        </button>
        {options.map(o => (
          <button
            key={o.value}
            type="button"
            className="chip"
            data-on={value === o.value}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 w-[132px] text-[14px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{placeholder} {allLabel}</SelectItem>
        {options.map(o => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
