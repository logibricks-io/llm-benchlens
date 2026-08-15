import { InfoHint } from "@/components/MetaBadges";
import { WorkbenchLayout } from "@/components/WorkbenchLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { CAPABILITY_LABELS, type CapabilityDomain } from "@shared/metaModel";
import { ArrowUpDown, GitCompareArrows, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";

const ALL = "__all__";

export default function Models() {
  const { data, isLoading } = trpc.models.list.useQuery();
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState(ALL);
  const [license, setLicense] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [sortBy, setSortBy] = useState<"composite" | "coverage" | "price" | "name">("composite");

  const rows = data ?? [];
  type ModelRow = (typeof rows)[number];

  const filtered = useMemo(() => {
    let list: ModelRow[] = rows.filter(m => {
      if (provider !== ALL && m.provider !== provider) return false;
      if (license !== ALL && m.license !== license) return false;
      if (status !== ALL && m.status !== status) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        if (!m.name.toLowerCase().includes(q) && !m.provider.toLowerCase().includes(q)) return false;
      }
      return true;
    });
    list = [...list];
    if (sortBy === "composite") list.sort((a, b) => (b.compositeScore ?? -1) - (a.compositeScore ?? -1));
    else if (sortBy === "coverage") list.sort((a, b) => b.coverage - a.coverage);
    else if (sortBy === "price") list.sort((a, b) => (a.priceOutput ?? 1e9) - (b.priceOutput ?? 1e9));
    else list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [rows, query, provider, license, status, sortBy]);

  const providers = Array.from(new Set(rows.map(m => m.provider))).sort();
  const activeFilters = [provider, license, status].filter(v => v !== ALL).length;

  return (
    <WorkbenchLayout
      title="模型库"
      subtitle={`${filtered.length} / ${rows.length} 个模型 · 综合分按证据权重加权`}
      actions={
        <Select value={sortBy} onValueChange={v => setSortBy(v as typeof sortBy)}>
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <ArrowUpDown className="size-3" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="composite">按综合分</SelectItem>
            <SelectItem value="coverage">按证据条数</SelectItem>
            <SelectItem value="price">按输出价格</SelectItem>
            <SelectItem value="name">按名称</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="搜索模型或厂商" className="h-8 w-[180px] text-xs" />
        <Select value={provider} onValueChange={setProvider}>
          <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue placeholder="厂商" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>厂商（全部）</SelectItem>
            {providers.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={license} onValueChange={setLicense}>
          <SelectTrigger className="h-8 w-[124px] text-xs"><SelectValue placeholder="权重形态" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>权重形态（全部）</SelectItem>
            <SelectItem value="open">开放权重</SelectItem>
            <SelectItem value="closed">闭源</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-8 w-[124px] text-xs"><SelectValue placeholder="世代状态" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>世代状态（全部）</SelectItem>
            <SelectItem value="current">当前世代</SelectItem>
            <SelectItem value="superseded">已被取代</SelectItem>
          </SelectContent>
        </Select>
        {(activeFilters > 0 || query) && (
          <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs"
            onClick={() => { setProvider(ALL); setLicense(ALL); setStatus(ALL); setQuery(""); }}>
            <X className="size-3" />清除
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-[11px] tracking-wide text-muted-foreground uppercase">
                <th className="px-4 py-2 text-left font-medium">模型</th>
                <th className="px-3 py-2 text-left font-medium">能力覆盖</th>
                <th className="px-3 py-2 text-right font-medium">
                  <span className="inline-flex items-center gap-1">
                    综合分
                    <InfoHint>
                      对该模型所有归一化分做证据加权平均。权重由指标可信度、分辨力与出处强度合成，
                      因此覆盖面窄或仅有厂商自报数据的模型不会因为分数漂亮而排到前面。
                    </InfoHint>
                  </span>
                </th>
                <th className="px-3 py-2 text-right font-medium">证据</th>
                <th className="px-4 py-2 text-right font-medium">输出价格</th>
                <th className="px-4 py-2 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.slug} className="border-b border-border/60 transition-colors duration-150 last:border-0 hover:bg-secondary/40">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-medium">{m.name}</span>
                      {m.license === "open" && (
                        <span className="rounded border border-[color:var(--signal-good)]/35 px-1 text-[9px] text-[color:var(--signal-good)]">开放权重</span>
                      )}
                      {m.status === "superseded" && <span className="text-[9px] text-muted-foreground/70">已被取代</span>}
                      {m.isReasoning && (
                        <span className="rounded border border-border px-1 text-[9px] text-muted-foreground">推理型</span>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {m.provider}
                      {m.contextWindow ? ` · 上下文 ${m.contextWindow}` : ""}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {m.domains.slice(0, 4).map(d => (
                        <span key={d} className="rounded border border-border bg-secondary/50 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {CAPABILITY_LABELS[d as CapabilityDomain] ?? d}
                        </span>
                      ))}
                      {m.domains.length > 4 && (
                        <span className="text-[10px] text-muted-foreground/70">+{m.domains.length - 4}</span>
                      )}
                      {m.domains.length === 0 && <span className="text-[10px] text-muted-foreground/50">无公开记录</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className={cn("tnum text-[13px] font-semibold", m.compositeScore === null && "text-muted-foreground/40")}>
                      {m.compositeScore ?? "—"}
                    </span>
                  </td>
                  <td className="tnum px-3 py-2 text-right text-xs text-muted-foreground">{m.coverage}</td>
                  <td className="tnum px-4 py-2 text-right text-xs text-muted-foreground">
                    {m.priceOutput === null ? "—" : `$${m.priceOutput}`}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/compare?a=${m.slug}`}
                      className="inline-flex items-center gap-1 rounded border border-border px-1.5 py-1 text-[10px] text-muted-foreground transition-colors duration-150 hover:border-primary/40 hover:text-primary"
                    >
                      <GitCompareArrows className="size-3" />
                      对比
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </WorkbenchLayout>
  );
}
