import {
  ContaminationBadge,
  DISC_EXPLAIN,
  InfoHint,
  MechanismBadge,
  SaturationBadge,
  ScoreMeter,
  StanceBadge,
  StrictnessBadge,
  TRUST_EXPLAIN,
  UTILITY_EXPLAIN,
} from "@/components/MetaBadges";
import { WorkbenchLayout } from "@/components/WorkbenchLayout";
import { Ruler, parseLeadingNumber } from "@/components/Ruler";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
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
import { AlertTriangle, ArrowUpDown, LayoutGrid, List, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";

const ALL = "__all__";

export default function Benchmarks() {
  const { data, isLoading } = trpc.benchmarks.list.useQuery();
  const initialDomain = new URLSearchParams(window.location.search).get("domain") ?? ALL;

  const [domain, setDomain] = useState(initialDomain);
  const [saturation, setSaturation] = useState(ALL);
  const [stance, setStance] = useState(ALL);
  const [mechanism, setMechanism] = useState(ALL);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"utility" | "trust" | "disc" | "difficulty" | "name">("utility");
  const [view, setView] = useState<"grid" | "list">("grid");

  const rows = data ?? [];
  type BenchmarkRow = (typeof rows)[number];

  const filtered = useMemo(() => {
    let list: BenchmarkRow[] = rows.filter(b => {
      if (domain !== ALL && b.capabilityDomain !== domain) return false;
      if (saturation !== ALL && b.saturationStatus !== saturation) return false;
      if (stance !== ALL && b.issuerStance !== stance) return false;
      if (mechanism !== ALL && b.scoringMechanism !== mechanism) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        if (!b.name.toLowerCase().includes(q) && !(b.issuer ?? "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
    const keys: Record<string, ((b: BenchmarkRow) => number) | null> = {
      utility: b => b.utilityScore,
      trust: b => b.trustScore,
      disc: b => b.discriminativePower,
      difficulty: b => b.difficultyCoefficient,
      name: null,
    };
    const key = keys[sortBy];
    list = [...list];
    if (key) list.sort((a, b) => key(b) - key(a));
    else list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [rows, domain, saturation, stance, mechanism, query, sortBy]);

  const domains = Array.from(new Set(rows.map(b => b.capabilityDomain)));
  const stances = Array.from(new Set(rows.map(b => b.issuerStance)));
  const mechanisms = Array.from(new Set(rows.map(b => b.scoringMechanism)));
  const activeFilters = [domain, saturation, stance, mechanism].filter(v => v !== ALL).length;

  return (
    <WorkbenchLayout
      title="指标库"
      subtitle={`${filtered.length} / ${rows.length} 项评测的元模型档案`}
      actions={
        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={v => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="h-8 w-[128px] text-xs">
              <ArrowUpDown className="size-3" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="utility">按效用分</SelectItem>
              <SelectItem value="trust">按可信度</SelectItem>
              <SelectItem value="disc">按分辨力</SelectItem>
              <SelectItem value="difficulty">按难度系数</SelectItem>
              <SelectItem value="name">按名称</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setView("grid")}
              className={cn(
                "transition-colors duration-150",
                view === "grid" ? "text-ink-900" : "text-ink-400 hover:text-ink-700",
              )}
              title="档案视图"
            >
              <LayoutGrid className="size-3.5" />
            </button>
            <button
              onClick={() => setView("list")}
              className={cn(
                "transition-colors duration-150",
                view === "list" ? "text-ink-900" : "text-ink-400 hover:text-ink-700",
              )}
              title="表格视图"
            >
              <List className="size-3.5" />
            </button>
          </div>
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="搜索评测或出题方"
          className="h-8 w-[180px] text-xs"
        />
        <FilterSelect value={domain} onChange={setDomain} placeholder="能力域"
          options={domains.map(d => ({ value: d, label: CAPABILITY_LABELS[d as CapabilityDomain] ?? d }))} />
        <FilterSelect value={saturation} onChange={setSaturation} placeholder="饱和状态"
          options={["frontier", "contested", "saturated"].map(s => ({ value: s, label: SATURATION_LABELS[s as keyof typeof SATURATION_LABELS] }))} />
        <FilterSelect value={stance} onChange={setStance} placeholder="出题方"
          options={stances.map(s => ({ value: s, label: STANCE_LABELS[s as keyof typeof STANCE_LABELS] ?? s }))} />
        <FilterSelect value={mechanism} onChange={setMechanism} placeholder="评分机制"
          options={mechanisms.map(m => ({ value: m, label: MECHANISM_LABELS[m as ScoringMechanism] ?? m }))} />
        {(activeFilters > 0 || query) && (
          <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs"
            onClick={() => { setDomain(ALL); setSaturation(ALL); setStance(ALL); setMechanism(ALL); setQuery(""); }}>
            <X className="size-3" />清除
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-5">
          {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-[74px] rounded" />)}
        </div>
      ) : view === "grid" ? (
        /*
         * Archive entries rather than a card grid. Each benchmark is a numbered
         * record: rank, name, its rule drawn at true difficulty length, then the
         * caveats as marginal notes. Nothing is boxed.
         */
        <div>
          {filtered.map((b, i) => (
            <Link
              key={b.slug}
              href={`/benchmarks/${b.slug}`}
              className="group hair-b block py-4 first:pt-0"
            >
              <div className="grid gap-x-6 gap-y-2 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)_minmax(0,3fr)]">
                {/* identity */}
                <div className="flex items-baseline gap-3">
                  <span className="tnum text-ink-400 w-6 shrink-0 text-[10px]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-ink-900 truncate text-[15px] leading-snug">{b.name}</h3>
                    <p className="ui text-ink-400 mt-1 truncate text-[10px]">
                      {b.issuer ?? "未标注出题方"}
                      {b.version ? ` · ${b.version}` : ""}
                      {" · "}
                      {CAPABILITY_LABELS[b.capabilityDomain as CapabilityDomain] ?? b.capabilityDomain}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <SaturationBadge status={b.saturationStatus} />
                      <StrictnessBadge strictness={b.strictness} />
                      <ContaminationBadge risk={b.contaminationRisk} />
                    </div>
                  </div>
                </div>

                {/* this benchmark's rule, drawn at its actual difficulty */}
                <div className="lg:pt-1">
                  {(() => {
                    /* SOTA is free text ("42.7%", "1315 Elo", "12.6% (GPT-5)").
                       Plot only the leading number, and only when it is on the
                       0–100 scale — Elo readings do not belong on this rule. */
                    const sota = parseLeadingNumber(b.currentSotaScore);
                    const plottable = sota !== null && sota >= 0 && sota <= 100;
                    return (
                      <Ruler
                        difficulty={b.difficultyCoefficient}
                        height={26}
                        ticks={10}
                        labelBelow
                        marks={
                          plottable
                            ? [
                                {
                                  value: sota,
                                  label: `SOTA ${sota}`,
                                  title: b.currentSotaScore ?? undefined,
                                  tone: "ink",
                                  emphasis: true,
                                },
                              ]
                            : []
                        }
                      />
                    );
                  })()}
                  <div className="ui text-ink-400 mt-1 flex items-center gap-3 text-[9.5px]">
                    <span className="tnum">难度 ×{b.difficultyCoefficient.toFixed(2)}</span>
                    <span className={cn("tnum", b.scoreCount === 0 && "text-caution")}>
                      {b.scoreCount} 条证据
                    </span>
                    {parseLeadingNumber(b.currentSotaScore) !== null &&
                      !(parseLeadingNumber(b.currentSotaScore)! <= 100) && (
                        <span className="tnum">SOTA {b.currentSotaScore}</span>
                      )}
                  </div>
                </div>

                {/* figures + caveats */}
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <ScoreMeter value={b.trustScore} label="可信" explain={TRUST_EXPLAIN} size="sm" />
                    <ScoreMeter
                      value={b.discriminativePower}
                      label="分辨"
                      explain={DISC_EXPLAIN}
                      size="sm"
                      tone="violet"
                    />
                    {(b.scoreCount === 0 || !b.ciDisclosed) && (
                      <div className="ui text-caution flex flex-wrap items-center gap-x-2.5 pt-0.5 text-[9.5px]">
                        {b.scoreCount === 0 && (
                          <span className="inline-flex items-center gap-1">
                            <AlertTriangle className="size-2.5" />
                            无可追溯成绩
                          </span>
                        )}
                        {!b.ciDisclosed && (
                          <span className="inline-flex items-center gap-1">
                            <AlertTriangle className="size-2.5" />
                            未披露 CI
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="tnum text-ink-900 text-[24px] leading-none">{b.utilityScore}</div>
                    <div className="ui text-ink-400 mt-1 text-[9px]">效用分</div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div>
          <table className="w-full text-sm">
            <thead>
              <tr className="hair-b ui text-ink-400 text-[9px] tracking-[0.14em] uppercase">
                <th className="px-1 py-2 text-left font-normal">评测</th>
                <th className="px-3 py-2 text-left font-normal">能力域</th>
                <th className="px-3 py-2 text-left font-normal">机制 / 严格度</th>
                <th className="px-3 py-2 text-left font-normal">状态</th>
                <th className="px-3 py-2 text-right font-normal">
                  <span className="inline-flex items-center gap-1">效用 <InfoHint>{UTILITY_EXPLAIN}</InfoHint></span>
                </th>
                <th className="px-3 py-2 text-right font-normal">
                  <span className="inline-flex items-center gap-1">
                    证据
                    <InfoHint>该评测下已收录的可追溯成绩条数。为 0 时无法用于比较模型，效用分已被相应折减。</InfoHint>
                  </span>
                </th>
                <th className="px-3 py-2 text-right font-normal">可信</th>
                <th className="px-3 py-2 text-right font-normal">分辨</th>
                <th className="px-1 py-2 text-right font-normal">难度</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => (
                <tr key={b.slug} className="hair-row">
                  <td className="px-1 py-2">
                    <Link href={`/benchmarks/${b.slug}`} className="block min-w-0">
                      <div className="text-ink-800 truncate text-[12.5px]">{b.name}</div>
                      <div className="ui text-ink-400 truncate text-[9.5px]">{b.issuer ?? "—"}</div>
                    </Link>
                  </td>
                  <td className="ui text-ink-500 px-3 py-2 text-[10px]">
                    {CAPABILITY_LABELS[b.capabilityDomain as CapabilityDomain] ?? b.capabilityDomain}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-x-2.5 gap-y-1">
                      <MechanismBadge mechanism={b.scoringMechanism} />
                      <StrictnessBadge strictness={b.strictness} />
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-x-2.5 gap-y-1">
                      <SaturationBadge status={b.saturationStatus} />
                      <StanceBadge stance={b.issuerStance} />
                    </div>
                  </td>
                  <td className="tnum text-ink-900 px-3 py-2 text-right text-[12.5px]">{b.utilityScore}</td>
                  <td className="tnum px-3 py-2 text-right text-[11px]">
                    <span className={b.scoreCount === 0 ? "text-caution" : "text-ink-500"}>
                      {b.scoreCount}
                    </span>
                  </td>
                  <td className="tnum text-ink-600 px-3 py-2 text-right text-[11px]">{b.trustScore}</td>
                  <td className="tnum text-ink-600 px-3 py-2 text-right text-[11px]">{b.discriminativePower}</td>
                  <td className="tnum text-ink-600 px-1 py-2 text-right text-[11px]">×{b.difficultyCoefficient.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </WorkbenchLayout>
  );
}

function FilterSelect({
  value, onChange, placeholder, options,
}: {
  value: string; onChange: (v: string) => void; placeholder: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{placeholder}（全部）</SelectItem>
        {options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
