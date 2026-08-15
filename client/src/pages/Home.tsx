import {
  DISC_EXPLAIN,
  InfoHint,
  NORMALIZED_EXPLAIN,
  ScoreMeter,
  TRUST_EXPLAIN,
} from "@/components/MetaBadges";
import { WorkbenchLayout } from "@/components/WorkbenchLayout";
import { TrustScatter } from "@/components/TrustScatter";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { CAPABILITY_LABELS, type CapabilityDomain } from "@shared/metaModel";
import { ArrowUpRight, CircleAlert, Gauge, Layers, TriangleAlert } from "lucide-react";
import { Link } from "wouter";

function StatCard({
  label,
  value,
  sub,
  tone,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  tone?: "default" | "danger" | "good";
  hint?: string;
}) {
  return (
    <div className="panel p-4">
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] tracking-wide text-muted-foreground uppercase">{label}</span>
        {hint && <InfoHint>{hint}</InfoHint>}
      </div>
      <div
        className={cn(
          "tnum mt-2 text-2xl font-semibold tracking-tight",
          tone === "danger" && "text-[color:var(--signal-danger)]",
          tone === "good" && "text-[color:var(--signal-good)]",
        )}
      >
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export default function Home() {
  const overview = trpc.meta.overview.useQuery();
  const benchmarks = trpc.benchmarks.list.useQuery();

  const o = overview.data;
  const bms = benchmarks.data ?? [];

  const byDomain = new Map<string, number>();
  for (const b of bms) byDomain.set(b.capabilityDomain, (byDomain.get(b.capabilityDomain) ?? 0) + 1);
  const domainRows = Array.from(byDomain.entries()).sort((a, b) => b[1] - a[1]);

  const topUtility = [...bms].sort((a, b) => b.utilityScore - a.utilityScore).slice(0, 6);
  const lowUtility = [...bms].sort((a, b) => a.utilityScore - b.utilityScore).slice(0, 6);

  return (
    <WorkbenchLayout
      title="总览"
      subtitle="数据基座状态、方法学体检与指标效用排序"
    >
      <div className="space-y-5">
        {/* Thesis banner: state the root problem the platform solves. */}
        <div className="grid-canvas panel relative overflow-hidden p-5">
          <div className="absolute inset-0 bg-gradient-to-r from-card via-card/85 to-card/40" />
          <div className="relative max-w-3xl">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
              <Gauge className="size-3" />
              指标元模型
            </div>
            <h2 className="mt-3 text-lg leading-snug font-semibold tracking-tight">
              分数不可比，是这个领域最普遍也最少被处理的问题
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              全通过评分的法律指标只有个位数，已饱和的数学竞赛题接近满分——把它们并列在同一张表里，表格本身就在制造误读。
              BenchLens 先把每个评测拆解为「能力域 × 评分机制 × 严格度 × 饱和状态 × 出题方立场 × 污染风险」的结构描述，
              再用由此推导的难度系数对分数做重标定，让异构指标落入同一个表示空间。
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/matrix"
                className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-transform duration-150 active:scale-[0.97]"
                style={{ transitionTimingFunction: "var(--ease-out)" }}
              >
                进入指标矩阵
                <ArrowUpRight className="size-3.5" />
              </Link>
              <Link
                href="/decide"
                className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors duration-150 hover:bg-secondary"
              >
                按场景选模型
              </Link>
            </div>
          </div>
        </div>

        {/* Coverage + methodology vitals */}
        {overview.isLoading ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[104px] rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="收录指标"
              value={o?.benchmarks ?? 0}
              sub={`其中 ${o?.frontier ?? 0} 项处于前沿未解状态`}
            />
            <StatCard
              label="分数记录"
              value={o?.scores ?? 0}
              sub={`覆盖 ${o?.coveredBenchmarks ?? 0} 个指标 · ${o?.models ?? 0} 个模型`}
            />
            <StatCard
              label="置信区间披露率"
              value={`${o?.ciDisclosureRate ?? 0}%`}
              tone="danger"
              sub={`仅 ${o?.ciDisclosed ?? 0} 项指标公布误差范围`}
              hint="绝大多数评测不公布置信区间，这意味着榜单上 1–2 个百分点的差距通常无法判断是否为噪声。这是全行业最系统性的方法学缺陷。"
            />
            <StatCard
              label="已饱和指标"
              value={o?.saturated ?? 0}
              tone="danger"
              sub="分辨力接近枯竭，排名差异多为噪声"
              hint="顶级模型得分已超过 85% 的指标。它们仍然频繁出现在发布材料中，但几乎无法再区分模型强弱。"
            />
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          {/* Methodology health */}
          <div className="panel p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[13px] font-semibold">方法学体检</h3>
              <span className="text-[11px] text-muted-foreground">全库均值</span>
            </div>
            <div className="space-y-3">
              {/* Never render a real-looking 0 while loading: a "平均可信度 0"
                  reads as a finding, not as an absent value. */}
              {overview.isLoading || !o ? (
                <>
                  <Skeleton className="h-9 rounded" />
                  <Skeleton className="h-9 rounded" />
                </>
              ) : (
                <>
                  <ScoreMeter value={o.avgTrust} label="平均可信度" explain={TRUST_EXPLAIN} />
                  <ScoreMeter
                    value={o.avgDiscriminative}
                    label="平均分辨力"
                    explain={DISC_EXPLAIN}
                    tone="violet"
                  />
                </>
              )}
            </div>
            <div className="mt-4 space-y-2 border-t border-border pt-3">
              <div className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-[color:var(--signal-caution)]" />
                <span>
                  归一化口径：{NORMALIZED_EXPLAIN}
                </span>
              </div>
              <div className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-[color:var(--signal-caution)]" />
                {o ? (
                  <span>
                    证据新鲜度：30 天内 {o.freshness.fresh} 条 · 90 天内 {o.freshness.recent} 条 ·
                    8 个月内 {o.freshness.aging} 条 · 陈旧 {o.freshness.stale} 条。
                  </span>
                ) : (
                  <span className="text-muted-foreground/60">证据新鲜度：统计中…</span>
                )}
              </div>
            </div>
          </div>

          {/* Domain distribution */}
          <div className="panel p-4">
            <div className="mb-3 flex items-center gap-1.5">
              <Layers className="size-3.5 text-muted-foreground" />
              <h3 className="text-[13px] font-semibold">能力域覆盖</h3>
            </div>
            <div className="space-y-2">
              {benchmarks.isLoading && domainRows.length === 0
                ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-4 rounded" />)
                : domainRows.map(([domain, count]) => {
                const max = domainRows[0]?.[1] ?? 1;
                return (
                  <Link
                    key={domain}
                    href={`/benchmarks?domain=${domain}`}
                    className="group flex items-center gap-3 rounded px-1 py-0.5 transition-colors duration-150 hover:bg-secondary/50"
                  >
                    <span className="w-[104px] shrink-0 truncate text-xs text-muted-foreground group-hover:text-foreground">
                      {CAPABILITY_LABELS[domain as CapabilityDomain] ?? domain}
                    </span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary/70 transition-all duration-500"
                        style={{ width: `${(count / max) * 100}%`, transitionTimingFunction: "var(--ease-out)" }}
                      />
                    </div>
                    <span className="tnum w-6 shrink-0 text-right text-xs">{count}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Utility ranking: the platform's most contrarian output */}
        <div className="grid gap-4 lg:grid-cols-2">
          {benchmarks.isLoading && bms.length === 0 ? (
            <Skeleton className="h-[320px] rounded-lg" />
          ) : (
            <TrustScatter points={bms} />
          )}
          <div className="grid gap-4">
            <UtilityList
              title="最值得看的指标"
              hint="效用分 = 可信度 × 分辨力的加权合成。高分意味着这把尺子既可信又还能区分模型。"
              rows={topUtility}
              tone="good"
            />
            <UtilityList
              title="最不值得看的指标"
              hint="这些指标往往出现在发布材料的最显眼位置，但已经饱和或方法学披露不足——发布图上最醒目的数字，常常信息量最低。"
              rows={lowUtility}
              tone="danger"
            />
          </div>
        </div>
      </div>
    </WorkbenchLayout>
  );
}

function UtilityList({
  title,
  hint,
  rows,
  tone,
}: {
  title: string;
  hint: string;
  rows: Array<{ slug: string; name: string; utilityScore: number; trustScore: number; discriminativePower: number }>;
  tone: "good" | "danger";
}) {
  return (
    <div className="panel p-4">
      <div className="mb-3 flex items-center gap-1.5">
        <h3 className="text-[13px] font-semibold">{title}</h3>
        <InfoHint>{hint}</InfoHint>
      </div>
      <div className="space-y-1">
        {rows.map(b => (
          <Link
            key={b.slug}
            href={`/benchmarks/${b.slug}`}
            className="flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors duration-150 hover:bg-secondary/60"
          >
            <span
              className={cn(
                "tnum w-9 shrink-0 text-sm font-semibold",
                tone === "good" ? "text-[color:var(--signal-good)]" : "text-[color:var(--signal-danger)]",
              )}
            >
              {b.utilityScore}
            </span>
            <span className="min-w-0 flex-1 truncate text-[13px]">{b.name}</span>
            <span className="tnum shrink-0 text-[11px] text-muted-foreground">
              信 {b.trustScore} · 辨 {b.discriminativePower}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
