import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  CAPABILITY_LABELS,
  CONTAMINATION_LABELS,
  SATURATION_LABELS,
  SATURATION_EXPLAIN,
  STRICTNESS_LABELS,
  type CapabilityDomain,
} from "@shared/metaModel";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  Compass,
  Database,
  ExternalLink,
  Layers,
  Radio,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { InstallPrompt } from "@/components/InstallPrompt";

/** Horizontal swipe detection for card decks. */
function useSwipe(onLeft: () => void, onRight: () => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const [dx, setDx] = useState(0);

  return {
    dx,
    handlers: {
      onTouchStart: (e: React.TouchEvent) => {
        const t = e.touches[0];
        start.current = { x: t.clientX, y: t.clientY };
      },
      onTouchMove: (e: React.TouchEvent) => {
        if (!start.current) return;
        const t = e.touches[0];
        const deltaX = t.clientX - start.current.x;
        const deltaY = t.clientY - start.current.y;
        // Only treat it as a horizontal swipe if it clearly beats vertical drift,
        // otherwise the page would fight the user's scroll.
        if (Math.abs(deltaX) > Math.abs(deltaY)) setDx(deltaX);
      },
      onTouchEnd: () => {
        if (Math.abs(dx) > 56) {
          if (dx < 0) onLeft();
          else onRight();
        }
        setDx(0);
        start.current = null;
      },
    },
  };
}

/**
 * Mobile is a separate interaction paradigm, not a narrow workbench.
 * The workbench is built for scanning a wide matrix; here the unit of
 * interaction is a single card you flick through, and the primary jobs are
 * "what changed" (radar) and "which one should I pick" (decide).
 */

type Tab = "radar" | "browse" | "models" | "duel" | "decide";

const TABS: Array<{ key: Tab; label: string; icon: typeof Radio }> = [
  { key: "radar", label: "雷达", icon: Radio },
  { key: "browse", label: "指标", icon: Database },
  { key: "models", label: "模型", icon: Sparkles },
  { key: "duel", label: "对比", icon: Layers },
  { key: "decide", label: "决策", icon: Compass },
];

export default function Mobile() {
  const [tab, setTab] = useState<Tab>("radar");

  // Offline is a first-class state here: the service worker keeps serving the
  // last known scores, and the user deserves to be told that is what they see.
  const [offline, setOffline] = useState(() => !navigator.onLine);
  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  return (
    <div className="mx-auto flex h-screen max-w-[430px] flex-col overflow-hidden bg-background">
      <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="grid size-6 place-items-center rounded-md bg-primary/15 ring-1 ring-primary/30">
            <Sparkles className="size-3 text-primary" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight">BenchLens</span>
        </div>
        <a href="/" className="text-[11px] text-muted-foreground">桌面版</a>
      </header>

      {offline && (
        <div className="shrink-0 border-b border-[color:var(--signal-caution)]/30 bg-[color:var(--signal-caution)]/10 px-4 py-1.5 text-[10px] leading-relaxed text-[color:var(--signal-caution)]">
          离线中 · 显示的是上次加载的成绩，每条记录的出处与采集时间仍然有效
        </div>
      )}

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {tab === "radar" && <RadarTab />}
        {tab === "browse" && <BrowseTab />}
        {tab === "models" && <ModelsTab />}
        {tab === "duel" && <DuelTab />}
        {tab === "decide" && <DecideTab />}
      </main>

      <nav className="flex shrink-0 border-t border-border bg-sidebar pb-[env(safe-area-inset-bottom)]">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2.5 transition-transform duration-150 active:scale-[0.94]",
                active ? "text-primary" : "text-muted-foreground",
              )}
              style={{ transitionTimingFunction: "var(--ease-out)" }}
            >
              <Icon className="size-[18px]" />
              <span className="text-[10px] font-medium">{t.label}</span>
            </button>
          );
        })}
      </nav>

      <InstallPrompt />
    </div>
  );
}

/** Push-style release feed — the mobile home surface. */
function RadarTab() {
  const releases = trpc.releases.feed.useQuery({ limit: 20 });
  const overview = trpc.meta.overview.useQuery();
  const o = overview.data;

  return (
    <div className="p-4">
      <div className="grid-canvas relative mb-4 overflow-hidden rounded-xl border border-border p-4">
        <div className="absolute inset-0 bg-gradient-to-br from-card via-card/90 to-card/50" />
        <div className="relative">
          <div className="text-[11px] tracking-wide text-primary uppercase">数据基座</div>
          <div className="mt-2 flex items-baseline gap-4">
            <div>
              <div className="tnum text-2xl leading-none font-semibold">{o?.benchmarks ?? "—"}</div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">指标</div>
            </div>
            <div>
              <div className="tnum text-2xl leading-none font-semibold">{o?.models ?? "—"}</div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">模型</div>
            </div>
            <div>
              <div className="tnum text-2xl leading-none font-semibold">{o?.scores ?? "—"}</div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">记录</div>
            </div>
          </div>
          <div className="mt-3 flex items-start gap-1.5 rounded-lg border border-[color:var(--signal-caution)]/25 bg-[color:var(--signal-caution)]/8 px-2.5 py-2">
            <AlertTriangle className="mt-0.5 size-3 shrink-0 text-[color:var(--signal-caution)]" />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              全库仅 <span className="tnum text-[color:var(--signal-caution)]">{o?.ciDisclosureRate ?? 0}%</span> 的
              指标披露置信区间，{o?.saturated ?? 0} 项已饱和。榜单上的小幅差距通常无法与噪声区分。
            </p>
          </div>
        </div>
      </div>

      <h2 className="mb-2 px-0.5 text-[13px] font-semibold">发布雷达</h2>
      <div className="space-y-2">
        {(releases.data ?? []).map(r => (
          <div key={r.id} className="rounded-xl border border-border bg-card p-3.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-[14px] font-semibold">{r.modelName}</span>
              <span className="tnum shrink-0 text-[10px] text-muted-foreground">{r.releasedAt}</span>
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">{r.provider}</div>
            {r.headline && (
              <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">{r.headline}</p>
            )}
            {r.sourceUrl && (
              <a href={r.sourceUrl} target="_blank" rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-[11px] text-primary">
                <ExternalLink className="size-3" />出处
              </a>
            )}
          </div>
        ))}
        {releases.isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[92px] animate-pulse rounded-xl border border-border bg-card/50" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Card-based benchmark browsing with a bottom sheet for detail. */
function BrowseTab() {
  const { data } = trpc.benchmarks.list.useQuery();
  const [query, setQuery] = useState("");
  const [openSlug, setOpenSlug] = useState<string | null>(null);

  const rows = data ?? [];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? rows.filter(b => b.name.toLowerCase().includes(q) || (b.issuer ?? "").toLowerCase().includes(q))
      : rows;
    return [...list].sort((a, b) => b.utilityScore - a.utilityScore);
  }, [rows, query]);

  return (
    <div className="p-4">
      <div className="relative mb-3">
        <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="搜索指标"
          className="h-10 w-full rounded-xl border border-border bg-card pr-3 pl-9 text-[13px] outline-none placeholder:text-muted-foreground focus:border-primary/40"
        />
      </div>

      <div className="space-y-2">
        {filtered.map(b => (
          <button
            key={b.slug}
            onClick={() => setOpenSlug(b.slug)}
            className="w-full rounded-xl border border-border bg-card p-3.5 text-left transition-transform duration-150 active:scale-[0.985]"
            style={{ transitionTimingFunction: "var(--ease-out)" }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-[14px] font-semibold">{b.name}</div>
                <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {CAPABILITY_LABELS[b.capabilityDomain as CapabilityDomain] ?? b.capabilityDomain}
                  {b.issuer ? ` · ${b.issuer}` : ""}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <div className="text-right">
                  <div className="tnum text-lg leading-none font-semibold text-primary">{b.utilityScore}</div>
                  <div className="mt-0.5 text-[9px] text-muted-foreground">效用</div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground/50" />
              </div>
            </div>
            <div className="mt-2.5 flex items-center gap-1.5">
              <MiniBar label="信" value={b.trustScore} color="var(--signal-contested)" />
              <MiniBar label="辨" value={b.discriminativePower} color="var(--signal-frontier)" />
              <span
                className={cn(
                  "ml-auto shrink-0 rounded px-1.5 py-0.5 text-[10px]",
                  b.saturationStatus === "saturated"
                    ? "bg-muted text-muted-foreground"
                    : b.saturationStatus === "frontier"
                      ? "bg-[color:var(--signal-frontier)]/12 text-[color:var(--signal-frontier)]"
                      : "bg-[color:var(--signal-contested)]/12 text-[color:var(--signal-contested)]",
                )}
              >
                {SATURATION_LABELS[b.saturationStatus as keyof typeof SATURATION_LABELS]}
              </span>
            </div>
          </button>
        ))}
      </div>

      {openSlug && <BenchmarkSheet slug={openSlug} onClose={() => setOpenSlug(null)} />}
    </div>
  );
}

function MiniBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-1.5">
      <span className="shrink-0 text-[10px] text-muted-foreground">{label}</span>
      <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, value)}%`, background: color }} />
      </div>
      <span className="tnum shrink-0 text-[10px]" style={{ color }}>{value}</span>
    </div>
  );
}

/** Card-based model browsing — the mobile counterpart of the desktop model库. */
function ModelsTab() {
  const { data } = trpc.models.list.useQuery();
  const [query, setQuery] = useState("");
  const [openOnly, setOpenOnly] = useState(false);

  const rows = data ?? [];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = rows.filter(m => m.compositeScore !== null);
    if (openOnly) list = list.filter(m => m.license === "open");
    if (q) list = list.filter(m => m.name.toLowerCase().includes(q) || m.provider.toLowerCase().includes(q));
    return [...list].sort((a, b) => (b.compositeScore ?? 0) - (a.compositeScore ?? 0));
  }, [rows, query, openOnly]);

  const top = filtered[0]?.compositeScore ?? 100;

  return (
    <div className="p-4">
      <div className="relative mb-2">
        <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="搜索模型或厂商"
          className="h-10 w-full rounded-xl border border-border bg-card pr-3 pl-9 text-[13px] outline-none placeholder:text-muted-foreground focus:border-primary/40"
        />
      </div>
      <button
        onClick={() => setOpenOnly(!openOnly)}
        className={cn(
          "mb-3 rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors duration-150",
          openOnly
            ? "border-[color:var(--signal-good)]/40 bg-[color:var(--signal-good)]/12 text-[color:var(--signal-good)]"
            : "border-border bg-card text-muted-foreground",
        )}
      >
        仅开放权重
      </button>

      <div className="space-y-2">
        {filtered.map((m, i) => (
          <div key={m.slug} className="rounded-xl border border-border bg-card p-3.5">
            <div className="flex items-start gap-2.5">
              <span className="tnum mt-0.5 w-4 shrink-0 text-[11px] text-muted-foreground">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[14px] font-semibold">{m.name}</span>
                  <span className="tnum shrink-0 text-[15px] font-semibold text-primary">{m.compositeScore}</span>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span>{m.provider}</span>
                  {m.license === "open" && (
                    <span className="rounded border border-[color:var(--signal-good)]/35 px-1 text-[9px] text-[color:var(--signal-good)]">
                      开放权重
                    </span>
                  )}
                  {m.status === "superseded" && <span className="text-muted-foreground/70">已被取代</span>}
                  <span>· {m.coverage} 条证据</span>
                  {m.priceOutput !== null && <span>· ${m.priceOutput}/M</span>}
                </div>
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary/70"
                    style={{ width: `${((m.compositeScore ?? 0) / Math.max(top, 1)) * 100}%` }}
                  />
                </div>
                {m.domains.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {m.domains.slice(0, 3).map(d => (
                      <span key={d} className="rounded border border-border bg-secondary/50 px-1.5 py-0.5 text-[9px] text-muted-foreground">
                        {CAPABILITY_LABELS[d as CapabilityDomain] ?? d}
                      </span>
                    ))}
                    {m.domains.length > 3 && (
                      <span className="text-[9px] text-muted-foreground/70">+{m.domains.length - 3}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Bottom sheet detail — mobile's answer to the desktop detail page. */
function BenchmarkSheet({ slug, onClose }: { slug: string; onClose: () => void }) {
  const { data, isLoading } = trpc.benchmarks.detail.useQuery({ slug });

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        onClick={e => e.stopPropagation()}
        className="relative max-h-[86vh] w-full overflow-y-auto rounded-t-2xl border-t border-border bg-card pb-[env(safe-area-inset-bottom)]"
        style={{ animation: "slideUp 260ms var(--ease-out)" }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto h-1 w-9 rounded-full bg-muted-foreground/30" />
          <button onClick={onClose} className="absolute right-3 rounded-lg p-1.5 text-muted-foreground active:bg-secondary">
            <X className="size-4" />
          </button>
        </div>

        {isLoading || !data ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/40" />
            ))}
          </div>
        ) : (
          <div className="p-4">
            <h2 className="text-[17px] leading-tight font-semibold">{data.benchmark.name}</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {data.benchmark.issuer ?? "未标注出题方"}
              {data.benchmark.version ? ` · ${data.benchmark.version}` : ""}
            </p>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                { label: "效用分", value: data.benchmark.utilityScore, color: "var(--signal-contested)" },
                { label: "可信度", value: data.benchmark.trustScore, color: "var(--signal-good)" },
                { label: "分辨力", value: data.benchmark.discriminativePower, color: "var(--signal-frontier)" },
              ].map(m => (
                <div key={m.label} className="rounded-xl border border-border bg-background/40 p-2.5 text-center">
                  <div className="tnum text-xl leading-none font-semibold" style={{ color: m.color }}>{m.value}</div>
                  <div className="mt-1 text-[10px] text-muted-foreground">{m.label}</div>
                </div>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              <Tag>{SATURATION_LABELS[data.benchmark.saturationStatus as keyof typeof SATURATION_LABELS]}</Tag>
              <Tag>{STRICTNESS_LABELS[data.benchmark.strictness as keyof typeof STRICTNESS_LABELS]}</Tag>
              <Tag>难度 ×{data.benchmark.difficultyCoefficient.toFixed(2)}</Tag>
              {data.benchmark.contaminationRisk !== "low" && (
                <Tag tone="caution">
                  {CONTAMINATION_LABELS[data.benchmark.contaminationRisk as keyof typeof CONTAMINATION_LABELS]}
                </Tag>
              )}
              {!data.benchmark.ciDisclosed && <Tag tone="caution">未披露 CI</Tag>}
            </div>

            <div className="mt-3 rounded-xl border border-border bg-background/40 p-3">
              <div className="text-[11px] font-medium text-primary">这个指标测什么</div>
              <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                {data.benchmark.scenarioMapping ??
                  SATURATION_EXPLAIN[data.benchmark.saturationStatus as keyof typeof SATURATION_EXPLAIN]}
              </p>
            </div>

            {data.benchmark.interpretationCaveat && (
              <div className="mt-2 rounded-xl border border-[color:var(--signal-caution)]/25 bg-[color:var(--signal-caution)]/8 p-3">
                <div className="flex items-center gap-1 text-[11px] font-medium text-[color:var(--signal-caution)]">
                  <AlertTriangle className="size-3" />解读警示
                </div>
                <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                  {data.benchmark.interpretationCaveat}
                </p>
              </div>
            )}

            {data.leaderboard.length > 0 && (
              <div className="mt-3">
                <div className="mb-1.5 text-[11px] font-medium text-muted-foreground">分数记录</div>
                <div className="space-y-1">
                  {data.leaderboard.slice(0, 12).map((r, i) => (
                    <div key={r.id} className="flex items-center gap-2 rounded-lg bg-background/40 px-2.5 py-2">
                      <span className="tnum w-4 shrink-0 text-[10px] text-muted-foreground">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate text-[12px]">{r.modelName}</span>
                      <span className="tnum shrink-0 text-[12px] font-medium">{r.rawScore}</span>
                      {r.sourceUrl && (
                        <a href={r.sourceUrl} target="_blank" rel="noreferrer" className="shrink-0 text-muted-foreground">
                          <ExternalLink className="size-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Tag({ children, tone }: { children: React.ReactNode; tone?: "caution" }) {
  return (
    <span
      className={cn(
        "rounded-md border px-1.5 py-0.5 text-[10px]",
        tone === "caution"
          ? "border-[color:var(--signal-caution)]/35 bg-[color:var(--signal-caution)]/10 text-[color:var(--signal-caution)]"
          : "border-border bg-secondary/60 text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

/** Swipeable two-model duel: one benchmark per card, flick through them. */
function DuelTab() {
  const models = trpc.models.list.useQuery();
  const all = (models.data ?? []).filter(m => m.coverage >= 3);
  const [a, setA] = useState<string | null>(null);
  const [b, setB] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);

  const slugs = [a, b].filter((v): v is string => Boolean(v));
  const compare = trpc.models.compare.useQuery({ slugs }, { enabled: slugs.length === 2 });

  const cards = useMemo(() => {
    if (!compare.data || slugs.length !== 2) return [];
    const shared = new Set(compare.data.sharedBenchmarks);
    const byBm = new Map<string, { name: string; domain: string; difficulty: number; av: number | null; bv: number | null; ar: number | null; br: number | null }>();
    for (const r of compare.data.rows) {
      if (!shared.has(r.benchmarkSlug)) continue;
      const cur = byBm.get(r.benchmarkSlug) ?? {
        name: r.benchmarkName, domain: r.capabilityDomain, difficulty: r.difficultyCoefficient,
        av: null, bv: null, ar: null, br: null,
      };
      if (r.modelSlug === a) { cur.av = r.normalized; cur.ar = r.rawScore; }
      if (r.modelSlug === b) { cur.bv = r.normalized; cur.br = r.rawScore; }
      byBm.set(r.benchmarkSlug, cur);
    }
    return Array.from(byBm.values());
  }, [compare.data, a, b, slugs.length]);

  const card = cards[idx];
  const nameA = all.find(m => m.slug === a)?.name ?? "模型 A";
  const nameB = all.find(m => m.slug === b)?.name ?? "模型 B";

  const next = () => setIdx(i => Math.min(cards.length - 1, i + 1));
  const prev = () => setIdx(i => Math.max(0, i - 1));
  const swipe = useSwipe(next, prev);

  return (
    <div className="p-4">
      <div className="mb-3 grid grid-cols-2 gap-2">
        <ModelPicker label="A" value={a} onChange={v => { setA(v); setIdx(0); }} options={all} exclude={b} color="var(--chart-1)" />
        <ModelPicker label="B" value={b} onChange={v => { setB(v); setIdx(0); }} options={all} exclude={a} color="var(--chart-2)" />
      </div>

      {slugs.length < 2 ? (
        <div className="grid-canvas flex h-[300px] items-center justify-center rounded-xl border border-border">
          <p className="px-8 text-center text-[12px] leading-relaxed text-muted-foreground">
            选择两个模型，逐张翻看它们在共同测过的指标上的差距。
          </p>
        </div>
      ) : cards.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <p className="text-[13px] font-medium">没有共同测过的指标</p>
          <p className="mt-1 text-[11px] text-muted-foreground">换一组模型再试。</p>
        </div>
      ) : (
        <>
          <div
            {...swipe.handlers}
            className="touch-pan-y rounded-2xl border border-border bg-card p-4 select-none"
            style={{
              transform: `translateX(${swipe.dx * 0.35}px) rotate(${swipe.dx * 0.012}deg)`,
              transition: swipe.dx === 0 ? "transform 220ms var(--ease-out)" : "none",
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                {CAPABILITY_LABELS[card.domain as CapabilityDomain] ?? card.domain}
              </span>
              <span className="tnum text-[11px] text-muted-foreground">
                {idx + 1} / {cards.length}
              </span>
            </div>
            <h3 className="mt-1.5 text-[16px] leading-tight font-semibold">{card.name}</h3>
            <div className="tnum mt-0.5 text-[10px] text-muted-foreground">难度系数 ×{card.difficulty.toFixed(2)}</div>

            <div className="mt-4 space-y-3">
              <DuelBar name={nameA} raw={card.ar} value={card.av} color="var(--chart-1)" win={(card.av ?? 0) >= (card.bv ?? 0)} />
              <DuelBar name={nameB} raw={card.br} value={card.bv} color="var(--chart-2)" win={(card.bv ?? 0) > (card.av ?? 0)} />
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
              <button
                onClick={prev}
                disabled={idx === 0}
                className="rounded-lg border border-border px-3 py-2 text-[11px] transition-transform duration-150 active:scale-[0.95] disabled:opacity-30"
              >
                <ArrowLeft className="size-3.5" />
              </button>
              <div className="flex gap-1">
                {cards.slice(0, 12).map((_, i) => (
                  <span
                    key={i}
                    className={cn("size-1 rounded-full transition-colors duration-150", i === idx ? "bg-primary" : "bg-muted")}
                  />
                ))}
              </div>
              <button
                onClick={next}
                disabled={idx >= cards.length - 1}
                className="rounded-lg bg-primary px-4 py-2 text-[11px] font-medium text-primary-foreground transition-transform duration-150 active:scale-[0.95] disabled:opacity-30"
              >
                下一项
              </button>
            </div>
          </div>
          <p className="mt-3 px-1 text-[11px] leading-relaxed text-muted-foreground">
            左右滑动卡片翻看下一个指标。条形长度为归一化分，括号内为原始分。
            只显示两个模型都测过的指标——单方缺失不构成对比。
          </p>
        </>
      )}
    </div>
  );
}

function DuelBar({ name, raw, value, color, win }: { name: string; raw: number | null; value: number | null; color: string; win: boolean }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className={cn("truncate text-[12px]", win && "font-semibold")} style={win ? { color } : undefined}>{name}</span>
        <span className="tnum shrink-0 text-[12px]">
          {value ?? "—"}
          {raw !== null && <span className="ml-1 text-[10px] text-muted-foreground">({raw})</span>}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${Math.max(2, Math.min(100, value ?? 0))}%`, background: color, transitionTimingFunction: "var(--ease-out)" }}
        />
      </div>
    </div>
  );
}

function ModelPicker({
  label, value, onChange, options, exclude, color,
}: {
  label: string; value: string | null; onChange: (v: string) => void;
  options: Array<{ slug: string; name: string; provider: string }>; exclude: string | null; color: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-2.5" style={{ borderColor: `color-mix(in oklch, ${color} 30%, transparent)` }}>
      <div className="mb-1 flex items-center gap-1.5">
        <span className="size-1.5 rounded-full" style={{ background: color }} />
        <span className="text-[10px] text-muted-foreground">模型 {label}</span>
      </div>
      <select
        value={value ?? ""}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-transparent text-[12px] font-medium outline-none"
      >
        <option value="" disabled>请选择</option>
        {options.filter(o => o.slug !== exclude).map(o => (
          <option key={o.slug} value={o.slug} className="bg-card">{o.name}</option>
        ))}
      </select>
    </div>
  );
}

/** Scenario decision, reduced to a single-column ranked list. */
function DecideTab() {
  const scenarios = trpc.meta.scenarios.useQuery();
  const [scenario, setScenario] = useState("agentic_coding");
  const rec = trpc.recommend.byScenario.useQuery({ scenario });

  return (
    <div className="p-4">
      <div className="-mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4 pb-1">
        {(scenarios.data ?? []).map(s => (
          <button
            key={s.key}
            onClick={() => setScenario(s.key)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-medium whitespace-nowrap transition-colors duration-150",
              scenario === s.key
                ? "border-primary/40 bg-primary/12 text-primary"
                : "border-border bg-card text-muted-foreground",
            )}
          >
            {s.title}
          </button>
        ))}
      </div>

      {rec.data?.scenario && (
        <p className="mb-3 px-0.5 text-[11px] leading-relaxed text-muted-foreground">{rec.data.scenario.summary}</p>
      )}

      <div className="space-y-2">
        {(rec.data?.results ?? []).slice(0, 10).map((r, i) => (
          <div key={r.modelSlug} className="rounded-xl border border-border bg-card p-3.5">
            <div className="flex items-start gap-2.5">
              <span
                className={cn(
                  "tnum mt-0.5 grid size-5 shrink-0 place-items-center rounded text-[10px] font-semibold",
                  i === 0 ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
                )}
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[13px] font-semibold">{r.modelName}</span>
                  <span className="tnum shrink-0 text-[15px] font-semibold text-primary">{r.fitScore}</span>
                </div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">
                  {r.provider} · {r.evidenceCount} 条证据
                  {r.priceOutput !== null && ` · $${r.priceOutput}/M`}
                </div>
                <div className="mt-2 space-y-1">
                  {r.evidence.slice(0, 3).map(e => (
                    <div key={e.benchmarkSlug} className="flex items-center gap-2">
                      <span className="w-[104px] shrink-0 truncate text-[10px] text-muted-foreground">{e.benchmarkName}</span>
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary/60" style={{ width: `${Math.min(100, e.normalized)}%` }} />
                      </div>
                      <span className="tnum w-7 shrink-0 text-right text-[10px]">{e.normalized}</span>
                    </div>
                  ))}
                </div>
                {r.caveats.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {r.caveats.map(c => (
                      <span key={c} className="rounded border border-[color:var(--signal-caution)]/30 px-1 py-0.5 text-[9px] text-[color:var(--signal-caution)]">
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
