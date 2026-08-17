import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { type CapabilityDomain } from "@shared/metaModel";
import { useT } from "@/i18n";
import { providerColor } from "@/lib/series";
import {
  Activity,
  AlertTriangle,
  ChevronDown,
  Circle,
  Minus,
  Radio,
  Settings2,
  Trophy,
} from "lucide-react";
import { useState } from "react";

/**
 * macOS menubar / sidebar widget form factor.
 * Constraints that drive the design: ~360px wide, glanceable in under two
 * seconds, no horizontal scrolling, no hover-only affordances, and it must be
 * legible when the window is unfocused. So: one metric per row, dense vertical
 * rhythm, and a segmented control instead of a sidebar.
 */

type Panel = "leaderboard" | "radar" | "health";

export default function Desktop() {
  const t = useT();
  const [panel, setPanel] = useState<Panel>("leaderboard");
  const [domain, setDomain] = useState<string>("__all__");
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className="flex min-h-screen items-start justify-center p-8"
      style={{
        /* A stand-in desktop, not a dark theme: the widget has to read as
           floating above someone's wallpaper. Cool frost greys, since a black
           field would make the frost surface look like it belongs to the night
           variant. */
        background:
          "linear-gradient(160deg, oklch(0.78 0.018 248) 0%, oklch(0.7 0.026 252) 45%, oklch(0.62 0.03 256) 100%)",
      }}
    >
      {/* Faint paper grain over the backdrop keeps it from looking like a flat swatch. */}
      <div className="paper-grain pointer-events-none fixed inset-0 opacity-50" />

      <div
        className="relative w-[360px] overflow-hidden rounded-sm hair-all bg-paper shadow-frost"
        style={{ boxShadow: "0 24px 64px -12px oklch(0 0 0 / 0.7), 0 0 0 1px oklch(1 0 0 / 0.04) inset" }}
      >
        {/* Title bar with traffic lights */}
        <div className="flex items-center gap-2 hair-b/70 bg-background px-3 py-2">
          <div className="flex gap-1.5">
            <span className="size-[9px] rounded-full bg-[#ff5f57]" />
            <span className="size-[9px] rounded-full bg-[#febc2e]" />
            <span className="size-[9px] rounded-full bg-[#28c840]" />
          </div>
          <span className="ml-1 text-[13px] tracking-tight text-ink-500">BenchLens</span>
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="rounded p-0.5 text-ink-500 transition-colors duration-150 hover:bg-frost-mist/50"
              title={collapsed ? t.desktop.expand : t.desktop.collapse}
            >
              {collapsed ? <ChevronDown className="size-3" /> : <Minus className="size-3" />}
            </button>
            <a href="/" className="rounded p-0.5 text-ink-500 transition-colors duration-150 hover:bg-frost-mist/50" title={t.desktop.openWorkbench}>
              <Settings2 className="size-3" />
            </a>
          </div>
        </div>

        {/* Segmented control */}
        <div className="flex gap-0.5 hair-b/70 bg-background/20 p-1.5">
          {([
            { key: "leaderboard" as Panel, label: t.desktop.leaderboard, icon: Trophy },
            { key: "radar" as Panel, label: t.desktop.releases, icon: Radio },
            { key: "health" as Panel, label: t.desktop.health, icon: Activity },
          ]).map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setPanel(tab.key)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1 rounded-sm py-1 text-[13px] transition-colors duration-150",
                  panel === tab.key
                    ? "bg-frost-mist/60 text-ink-900"
                    : "text-ink-500 hover:bg-frost-mist/50",
                )}
              >
                <Icon className="size-3" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {!collapsed && (
          <div className="max-h-[520px] overflow-y-auto">
            {panel === "leaderboard" && <LeaderboardPanel domain={domain} setDomain={setDomain} />}
            {panel === "radar" && <RadarPanel />}
            {panel === "health" && <HealthPanel />}
          </div>
        )}

        <StatusBar />
      </div>
    </div>
  );
}

function LeaderboardPanel({ domain, setDomain }: { domain: string; setDomain: (v: string) => void }) {
  const t = useT();
  const { data, isLoading } = trpc.models.list.useQuery();
  const benchmarks = trpc.benchmarks.list.useQuery();
  const domains = Array.from(new Set((benchmarks.data ?? []).map(b => b.capabilityDomain)));

  const rows = (data ?? [])
    .filter(m => m.compositeScore !== null && (domain === "__all__" || m.domains.includes(domain)))
    .sort((a, b) => (b.compositeScore ?? 0) - (a.compositeScore ?? 0))
    .slice(0, 12);

  const top = rows[0]?.compositeScore ?? 100;

  return (
    <div>
      <div className="flex items-center gap-1.5 hair-b/50 px-3 py-1.5">
        <select
          value={domain}
          onChange={e => setDomain(e.target.value)}
          className="w-full bg-transparent text-[13px] text-ink-500 outline-none"
        >
          <option value="__all__" className="bg-paper">{t.desktop.allDomains}</option>
          {domains.map(d => (
            <option key={d} value={d} className="bg-paper">
              {t.capability[d as CapabilityDomain] ?? d}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-1 p-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-7 animate-pulse rounded bg-frost-mist/50/30" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="px-3 py-8 text-center text-[13px] text-ink-500">{t.desktop.noRecordsInDomain}</div>
      ) : (
        <div className="py-1">
          {rows.map((m, i) => (
            <div key={m.slug} className="group flex items-center gap-2 px-3 py-[5px] hover:bg-frost-mist/40">
              <span className="tnum w-3.5 shrink-0 text-right text-[13px] text-ink-400">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  {/* The widget is too narrow for a name plus a separate dot, so
                      the vendor hue rides on the bar below instead. */}
                  <span className="truncate text-[13px] leading-tight">{m.name}</span>
                  {m.license === "open" && (
                    <Circle className="size-1.5 shrink-0 fill-[color:var(--signal-good)] text-good" />
                  )}
                </div>
                <div className="mt-0.5 h-[3px] w-full overflow-hidden rounded-full bg-frost-mist/50">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${((m.compositeScore ?? 0) / Math.max(top, 1)) * 100}%`,
                      background: providerColor(m.provider),
                    }}
                  />
                </div>
              </div>
              <span className="tnum w-8 shrink-0 text-right text-[13px] text-ink-900">{m.compositeScore}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RadarPanel() {
  const t = useT();
  const { data, isLoading } = trpc.releases.feed.useQuery({ limit: 12 });
  const rows = data ?? [];

  return isLoading ? (
    <div className="space-y-1 p-2">
      {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded bg-frost-mist/50/30" />)}
    </div>
  ) : rows.length === 0 ? (
    <div className="px-3 py-8 text-center text-[13px] text-ink-500">{t.desktop.noReleaseEvents}</div>
  ) : (
    <div className="py-1">
      {rows.map(r => (
        <a
          key={r.id}
          href={r.sourceUrl ?? "#"}
          target={r.sourceUrl ? "_blank" : undefined}
          rel="noreferrer"
          className="block px-3 py-2 hover:bg-frost-mist/40"
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-[13px]">{r.modelName}</span>
            <span className="tnum shrink-0 text-[13px] text-ink-500">{r.releasedAt}</span>
          </div>
          <div className="truncate text-[13px] text-ink-500">
            {r.provider}
            {r.headline ? ` · ${r.headline}` : ""}
          </div>
        </a>
      ))}
    </div>
  );
}

function HealthPanel() {
  const t = useT();
  const { data } = trpc.meta.overview.useQuery();
  const benchmarks = trpc.benchmarks.list.useQuery();
  const low = [...(benchmarks.data ?? [])].sort((a, b) => a.utilityScore - b.utilityScore).slice(0, 5);

  return (
    <div className="p-3">
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: t.common.benchmarks, value: data?.benchmarks ?? "—" },
          { label: t.common.models, value: data?.models ?? "—" },
          { label: t.common.records, value: data?.scores ?? "—" },
          { label: t.desktop.ciDisclosure, value: data ? `${data.ciDisclosureRate}%` : "—", danger: true },
        ].map(s => (
          <div key={s.label} className="rounded-sm hair-all/70 bg-background px-2.5 py-2">
            <div className={cn("tnum text-base leading-none", s.danger && "text-danger")}>
              {s.value}
            </div>
            <div className="mt-1 text-[13px] text-ink-500">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-start gap-1.5 rounded-sm border border-[color:var(--signal-caution)]/25 bg-[color:var(--signal-caution)]/8 px-2.5 py-2">
        <AlertTriangle className="mt-0.5 size-3 shrink-0 text-caution" />
        <p className="text-[13px] leading-relaxed text-ink-500">
          {t.desktop.saturationWarning.replace("{saturated}", String(data?.saturated ?? 0)).replace("{frontier}", String(data?.frontier ?? 0))}
        </p>
      </div>

      <div className="mt-3">
        <div className="mb-1.5 text-[13px] tracking-wide text-ink-500 uppercase">{t.desktop.lowestUtility}</div>
        <div className="space-y-0.5">
          {low.map(b => (
            <div key={b.slug} className="flex items-center gap-2 rounded px-1 py-1 hover:bg-frost-mist/40">
              <span className="tnum w-6 shrink-0 text-[13px] text-danger">
                {b.utilityScore}
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px]">{b.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 hair-t/70 pt-2.5">
        <div>
          <div className="tnum text-sm">{data?.avgTrust ?? "—"}</div>
          <div className="text-[13px] text-ink-500">{t.desktop.avgTrust}</div>
        </div>
        <div>
          <div className="tnum text-sm">{data?.avgDiscriminative ?? "—"}</div>
          <div className="text-[13px] text-ink-500">{t.desktop.avgDiscriminative}</div>
        </div>
      </div>
    </div>
  );
}

function StatusBar() {
  const t = useT();
  const { data } = trpc.meta.overview.useQuery();
  const fresh = data?.freshness.fresh ?? 0;
  const stale = data?.freshness.stale ?? 0;
  return (
    <div className="flex items-center gap-2 hair-t/70 bg-background px-3 py-1.5">
      <span className="flex items-center gap-1">
        <span className="size-1.5 rounded-full bg-[color:var(--signal-good)]" />
        <span className="tnum text-[13px] text-ink-500">{fresh} {t.desktop.fresh}</span>
      </span>
      <span className="flex items-center gap-1">
        <span className="size-1.5 rounded-full bg-[color:var(--signal-danger)]" />
        <span className="tnum text-[13px] text-ink-500">{stale} {t.desktop.stale}</span>
      </span>
      <a href="/matrix" className="ml-auto text-[13px] text-frost-qing hover:underline">
        {t.desktop.fullMatrix}
      </a>
    </div>
  );
}
