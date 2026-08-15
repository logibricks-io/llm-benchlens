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
          <div className="flex overflow-hidden rounded-md border border-border">
            <button
              onClick={() => setView("grid")}
              className={cn("px-2 py-1.5 transition-colors duration-150", view === "grid" ? "bg-secondary" : "hover:bg-secondary/50")}
            >
              <LayoutGrid className="size-3.5" />
            </button>
            <button
              onClick={() => setView("list")}
              className={cn("border-l border-border px-2 py-1.5 transition-colors duration-150", view === "list" ? "bg-secondary" : "hover:bg-secondary/50")}
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
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-[188px] rounded-lg" />)}
        </div>
      ) : view === "grid" ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((b, i) => (
            <Link
              key={b.slug}
              href={`/benchmarks/${b.slug}`}
              className="panel group block p-4 transition-[border-color,transform] duration-200 hover:border-primary/40"
              style={{ transitionTimingFunction: "var(--ease-out)", animationDelay: `${Math.min(i, 12) * 30}ms` }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-[13px] font-semibold group-hover:text-primary">{b.name}</h3>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {b.issuer ?? "未标注出题方"}
                    {b.version ? ` · ${b.version}` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <div className="tnum text-lg leading-none font-semibold text-primary">{b.utilityScore}</div>
                  <div className="mt-0.5 text-[9px] text-muted-foreground">效用分</div>
                </div>
              </div>

              <div className="mt-2.5 flex flex-wrap gap-1">
                <SaturationBadge status={b.saturationStatus} />
                <StrictnessBadge strictness={b.strictness} />
                <ContaminationBadge risk={b.contaminationRisk} />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <ScoreMeter value={b.trustScore} label="可信度" explain={TRUST_EXPLAIN} size="sm" />
                <ScoreMeter value={b.discriminativePower} label="分辨力" explain={DISC_EXPLAIN} size="sm" tone="violet" />
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-border pt-2 text-[10px] text-muted-foreground">
                <span>{CAPABILITY_LABELS[b.capabilityDomain as CapabilityDomain] ?? b.capabilityDomain}</span>
                <span className="tnum">
                  难度 ×{b.difficultyCoefficient.toFixed(2)}
                  {b.scoreCount > 0 ? ` · ${b.scoreCount} 条记录` : ""}
                </span>
              </div>
              {b.scoreCount === 0 && (
                <div className="mt-1.5 flex items-center gap-1 text-[10px] text-[color:var(--signal-caution)]">
                  <AlertTriangle className="size-2.5" />
                  暂无可追溯成绩，无法用于比较
                </div>
              )}
              {!b.ciDisclosed && (
                <div className="mt-1.5 flex items-center gap-1 text-[10px] text-[color:var(--signal-caution)]">
                  <AlertTriangle className="size-2.5" />
                  未披露置信区间
                </div>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-[11px] tracking-wide text-muted-foreground uppercase">
                <th className="px-4 py-2 text-left font-medium">评测</th>
                <th className="px-3 py-2 text-left font-medium">能力域</th>
                <th className="px-3 py-2 text-left font-medium">机制 / 严格度</th>
                <th className="px-3 py-2 text-left font-medium">状态</th>
                <th className="px-3 py-2 text-right font-medium">
                  <span className="inline-flex items-center gap-1">效用 <InfoHint>{UTILITY_EXPLAIN}</InfoHint></span>
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  <span className="inline-flex items-center gap-1">
                    证据
                    <InfoHint>该评测下已收录的可追溯成绩条数。为 0 时无法用于比较模型，效用分已被相应折减。</InfoHint>
                  </span>
                </th>
                <th className="px-3 py-2 text-right font-medium">可信</th>
                <th className="px-3 py-2 text-right font-medium">分辨</th>
                <th className="px-4 py-2 text-right font-medium">难度</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => (
                <tr key={b.slug} className="border-b border-border/60 transition-colors duration-150 last:border-0 hover:bg-secondary/40">
                  <td className="px-4 py-2">
                    <Link href={`/benchmarks/${b.slug}`} className="block min-w-0">
                      <div className="truncate text-[13px] font-medium hover:text-primary">{b.name}</div>
                      <div className="truncate text-[10px] text-muted-foreground">{b.issuer ?? "—"}</div>
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {CAPABILITY_LABELS[b.capabilityDomain as CapabilityDomain] ?? b.capabilityDomain}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      <MechanismBadge mechanism={b.scoringMechanism} />
                      <StrictnessBadge strictness={b.strictness} />
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      <SaturationBadge status={b.saturationStatus} />
                      <StanceBadge stance={b.issuerStance} />
                    </div>
                  </td>
                  <td className="tnum px-3 py-2 text-right font-semibold text-primary">{b.utilityScore}</td>
                  <td className="tnum px-3 py-2 text-right text-xs">
                    <span className={b.scoreCount === 0 ? "text-[color:var(--signal-caution)]" : "text-muted-foreground"}>
                      {b.scoreCount}
                    </span>
                  </td>
                  <td className="tnum px-3 py-2 text-right text-xs">{b.trustScore}</td>
                  <td className="tnum px-3 py-2 text-right text-xs">{b.discriminativePower}</td>
                  <td className="tnum px-4 py-2 text-right text-xs">×{b.difficultyCoefficient.toFixed(2)}</td>
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
