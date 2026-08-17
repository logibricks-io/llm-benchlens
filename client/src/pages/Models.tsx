import { InfoHint } from "@/components/MetaBadges";
import { NoteBlock } from "@/components/MarginNote";
import { WorkbenchLayout } from "@/components/WorkbenchLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { type CapabilityDomain } from "@shared/metaModel";
import { ArrowUpDown, GitCompareArrows, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useT } from "@/i18n";
import { providerColor, formatPrice } from "@/lib/series";
import { ScoreBar, Rank, ProviderMark } from "@/components/ScoreBar";
import { formatContextWindow } from "@shared/formatContext";

const ALL = "__all__";

export default function Models() {
  const t = useT();
  const { data, isLoading } = trpc.models.list.useQuery();
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState(ALL);
  const [license, setLicense] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [sortBy, setSortBy] = useState<"composite" | "coverage" | "price" | "name">("composite");
  /*
   * Comparison is a multi-model act, but the only way in was a per-row button
   * that carried one slug and left the other three columns to be searched for
   * by hand. Ticking rows here matches how the question actually arises: you
   * are already scanning the table when you notice two candidates.
   */
  const MAX_COMPARE = 4;
  const [marked, setMarked] = useState<string[]>([]);
  const toggleMark = (slug: string) =>
    setMarked(prev =>
      prev.includes(slug)
        ? prev.filter(s => s !== slug)
        : prev.length >= MAX_COMPARE
          ? prev
          : [...prev, slug],
    );

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
      title={t.nav.models}
      subtitle={t.models.subtitle.replace("{filtered}", String(filtered.length)).replace("{total}", String(rows.length))}
      readNext={[
        { href: "/compare", label: t.nav.compare, why: t.models.readNextCompare },
        { href: "/matrix", label: t.nav.matrix, why: t.models.readNextMatrix },
      ]}
      aside={
        <>
          <NoteBlock label={t.models.noteCompositeTitle}>
            <p>
              {t.models.noteCompositeP1Prefix}
              <span className="tnum"> n/(n+4) </span>
              {t.models.noteCompositeP1Suffix}
            </p>
            <p>
              {t.models.noteCompositeP2Prefix}
              <strong className="text-ink-700">{t.models.noteCompositeP2Strong}</strong>
            </p>
          </NoteBlock>
          <NoteBlock label={t.models.noteBlankTitle}>
            <p>
              {t.models.noteBlankP1Prefix}
              <strong className="text-ink-700">{t.common.noPublicRecord}</strong>
              {t.models.noteBlankP1Suffix}
            </p>
          </NoteBlock>
        </>
      }
      actions={
        <Select value={sortBy} onValueChange={v => setSortBy(v as typeof sortBy)}>
          <SelectTrigger className="h-8 w-[130px] text-[14px]">
            <ArrowUpDown className="size-3" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="composite">{t.models.sortComposite}</SelectItem>
            <SelectItem value="coverage">{t.models.sortCoverage}</SelectItem>
            <SelectItem value="price">{t.models.sortPrice}</SelectItem>
            <SelectItem value="name">{t.models.sortName}</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input value={query} onChange={e => setQuery(e.target.value)} placeholder={t.models.searchPlaceholder} className="h-8 w-[180px] text-[14px]" />
        <Select value={provider} onValueChange={setProvider}>
          <SelectTrigger className="h-8 w-[140px] text-[14px]"><SelectValue placeholder={t.common.provider} /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t.models.providerAll}</SelectItem>
            {providers.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        
        <div className="flex items-center gap-1">
          <button type="button" className="chip" data-on={license === ALL} onClick={() => setLicense(ALL)}>{t.models.licenseAll}</button>
          <button type="button" className="chip" data-on={license === "open"} onClick={() => setLicense("open")}>{t.common.openWeights}</button>
          <button type="button" className="chip" data-on={license === "closed"} onClick={() => setLicense("closed")}>{t.common.closedWeights}</button>
        </div>

        <div className="flex items-center gap-1">
          <button type="button" className="chip" data-on={status === ALL} onClick={() => setStatus(ALL)}>{t.models.statusAll}</button>
          <button type="button" className="chip" data-on={status === "current"} onClick={() => setStatus("current")}>{t.common.currentGen}</button>
          <button type="button" className="chip" data-on={status === "superseded"} onClick={() => setStatus("superseded")}>{t.common.superseded}</button>
        </div>

        {(activeFilters > 0 || query) && (
          <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-[14px]"
            onClick={() => { setProvider(ALL); setLicense(ALL); setStatus(ALL); setQuery(""); }}>
            <X className="size-3" />{t.common.clear}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-sm" />)}
        </div>
      ) : (
        <div className="hair-t">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="hair-b">
                <th className="w-8 pl-4 pr-1 py-2 text-left">
                  <span className="sr-only">{t.models.markForCompare}</span>
                </th>
                <th className="px-4 py-2 text-left text-[14px] font-semibold text-ink-700">{t.models.colModel}</th>
                <th className="px-3 py-2 text-left text-[14px] font-semibold text-ink-700">{t.models.colCoverage}</th>
                <th className="px-3 py-2 text-right text-[14px] font-semibold text-ink-700">
                  <span className="inline-flex items-center gap-1">
                    {t.common.composite}
                    <InfoHint>
                      {t.metricExplain.composite}
                    </InfoHint>
                  </span>
                </th>
                <th className="px-3 py-2 text-right text-[14px] font-semibold text-ink-700">
                  <span className="inline-flex items-center gap-1">
                    {t.common.evidence}
                    <InfoHint>{t.metricExplain.evidence}</InfoHint>
                  </span>
                </th>
                <th className="px-4 py-2 text-right text-[14px] font-semibold text-ink-700">{t.common.outputPrice}</th>
                <th className="px-4 py-2 text-right text-[14px] font-semibold text-ink-700"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, i) => (
                <tr key={m.slug} className="hair-row hover:bg-surface transition-colors duration-120">
                  <td className="w-8 pl-4 pr-1 py-2 align-middle">
                    <input
                      type="checkbox"
                      checked={marked.includes(m.slug)}
                      onChange={() => toggleMark(m.slug)}
                      disabled={!marked.includes(m.slug) && marked.length >= MAX_COMPARE}
                      aria-label={`${t.models.markForCompare}: ${m.name}`}
                      className="size-3.5 cursor-pointer accent-[color:var(--chart-1)] disabled:cursor-not-allowed disabled:opacity-35"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1.5">
                      <ProviderMark provider={m.provider} size={18} />
                      <Link
                        href={`/models/${m.slug}`}
                        className="text-[14px] text-ink-900 transition-colors hover:text-ink-950 hover:underline decoration-ink-300 underline-offset-2"
                      >
                        {m.name}
                      </Link>
                      {m.license === "open" && (
                        <span className="rounded border border-[color:var(--signal-good)]/35 px-1 text-[13px] text-good">{t.common.openWeights}</span>
                      )}
                      {m.status === "superseded" && <span className="text-[13px] text-ink-400">{t.common.superseded}</span>}
                      {m.isReasoning && (
                        <span className="rounded hair-all px-1 text-[13px] text-ink-500">{t.common.reasoning}</span>
                      )}
                    </div>
                    <div className="text-[13px] text-ink-400 pl-3.5">
                      {m.provider}
                      {/* contextWindow is the vendor's own string ("128K");
                          contextTokens is the number the formatter needs. */}
                      {m.contextTokens
                        ? ` · ${t.common.context} ${formatContextWindow(m.contextTokens)}`
                        : m.contextWindow
                          ? ` · ${t.common.context} ${m.contextWindow}`
                          : ""}
                    </div>
                  </td>
                  <td className="px-3 py-2 align-middle">
                    {/*
                     * Coverage is drawn, not spelled out. Text chips could not work
                     * here: English domain names ("Knowledge & reasoning") are long
                     * enough that four of them wrapped into a vertical stack and
                     * pushed row height past 100px, and capping the width instead
                     * just produced unreadable "Compos..." stubs while the widened
                     * column shoved the margin notes into the action buttons.
                     * A dot per covered domain reads at a glance, costs ~56px in
                     * any language, and keeps the full list one hover away.
                     */}
                    <div
                      className="flex w-[64px] flex-wrap items-center gap-[3px]"
                      title={
                        m.domains.length
                          ? m.domains.map(d => t.capability[d as CapabilityDomain] ?? d).join(" · ")
                          : undefined
                      }
                    >
                      {m.domains.length === 0 ? (
                        <span className="text-[13px] text-ink-400">—</span>
                      ) : (
                        <>
                          {m.domains.slice(0, 8).map(d => (
                            <span
                              key={d}
                              className="size-[7px] rounded-full"
                              style={{ background: providerColor(m.provider), opacity: 0.85 }}
                            />
                          ))}
                          <span className="tnum ml-0.5 text-[13px] text-ink-400">{m.domains.length}</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex flex-col items-end">
                      {m.compositeScore === null ? (
                        <span className="text-ink-400">—</span>
                      ) : (
                        /*
                         * ScoreBar needs 42px for the numeral plus a 80px minimum
                         * track plus the gap; at w-24 (96px) the track won the
                         * space and pushed the number out of the cell, where it
                         * printed over the evidence column to its right.
                         */
                        <div className="w-[150px]">
                          <ScoreBar value={m.compositeScore} provider={m.provider} delay={i} />
                        </div>
                      )}
                      {m.rawMean !== null && m.confidence < 0.8 && (
                        <span className="tnum text-[13px] text-ink-400">{t.common.observed} {m.rawMean}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="tnum text-[14px] text-ink-500">{m.coverage}</span>
                      <span
                        className="h-1 w-8 shrink-0 overflow-hidden rounded-full bg-surface-2"
                        title={t.models.confidenceTooltip.replace("{n}", String(Math.round(m.confidence * 100)))}
                      >
                        <span
                          className={cn(
                            "block h-full rounded-full",
                            m.confidence >= 0.8
                              ? "bg-[color:var(--signal-good)]/70"
                              : m.confidence >= 0.5
                                ? "bg-[color:var(--signal-caution)]/70"
                                : "bg-[color:var(--signal-danger)]/60",
                          )}
                          style={{ width: `${m.confidence * 100}%` }}
                        />
                      </span>
                    </div>
                  </td>
                  <td className="tnum px-4 py-2 text-right text-[14px] text-ink-500">
                    {m.priceOutput === null ? <span className="text-ink-400">—</span> : formatPrice(m.priceOutput)}
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <Link
                      href={`/compare?a=${m.slug}`}
                      className="inline-flex items-center gap-1 rounded hair-all px-2 py-1 text-[13px] whitespace-nowrap text-ink-500 transition-colors duration-120 hover:border-brand-qing/40 hover:text-brand-qing"
                    >
                      <GitCompareArrows className="size-3" />
                      {t.models.compareAction}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/*
       * Only appears once something is ticked, and sits above the fold of the
       * viewport rather than at the end of 352 rows — the selection is made while
       * scrolling, so the way out has to travel with the reader.
       */}
      {marked.length > 0 && (
        <div className="fixed inset-x-0 bottom-5 z-40 flex justify-center px-4">
          <div
            className="flex items-center gap-3 rounded-full px-4 py-2.5 shadow-lg"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
          >
            <span className="text-[14px] text-ink-700">
              <span className="tnum text-ink-950 tabular-nums">{marked.length}</span>
              {" / "}
              <span className="tnum tabular-nums">{MAX_COMPARE}</span>{" "}
              {t.models.markedCount}
            </span>
            <Link
              href={`/compare?m=${marked.join(",")}`}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[14px] font-medium transition-colors duration-120"
              style={{ background: "var(--chart-1)", color: "var(--canvas)" }}
            >
              <GitCompareArrows className="size-3.5" />
              {t.models.compareMarked}
            </Link>
            <button
              type="button"
              onClick={() => setMarked([])}
              className="rounded-full p-1 text-ink-500 transition-colors duration-120 hover:text-ink-900"
              aria-label={t.common.clear}
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      )}
    </WorkbenchLayout>
  );
}
