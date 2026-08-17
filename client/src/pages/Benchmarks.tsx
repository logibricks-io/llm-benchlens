import {
  ContaminationBadge,
  InfoHint,
  MechanismBadge,
  SaturationBadge,
  ScoreMeter,
  StanceBadge,
  StrictnessBadge,
  useMetricExplain,
} from "@/components/MetaBadges";
import { WorkbenchLayout } from "@/components/WorkbenchLayout";
import { NoteBlock, NoteFigure } from "@/components/MarginNote";
import { Ruler, parseLeadingNumber } from "@/components/Ruler";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  type CapabilityDomain,
  type ScoringMechanism,
} from "@shared/metaModel";
import { AlertTriangle, ArrowUpDown, LayoutGrid, List, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useT } from "@/i18n";
import { Link } from "wouter";
import { ScoreBar, Rank } from "@/components/ScoreBar";

const ALL = "__all__";

export default function Benchmarks() {
  const t = useT();
  const metricExplain = useMetricExplain();
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

  /*
   * Group the archive into bands so a long scroll keeps its bearings. When the
   * list is sorted by a score we band by that score's tier — the reader is then
   * told *why* the run is ordered this way, not just that it is. Sorting by name
   * bands alphabetically instead, since utility tiers would be meaningless there.
   */
  const bands = useMemo(() => {
    type Entry = { item: BenchmarkRow; index: number };
    const entries: Entry[] = filtered.map((item, index) => ({ item, index }));

    if (sortBy === "name") {
      return [
        {
          key: "all",
          label: t.benchmarks.sortByName,
          note: t.benchmarks.alphabetical,
          items: entries,
        },
      ];
    }

    const pick = (b: BenchmarkRow) =>
      sortBy === "trust"
        ? b.trustScore
        : sortBy === "disc"
          ? b.discriminativePower
          : sortBy === "difficulty"
            ? b.difficultyCoefficient
            : b.utilityScore;

    const defs =
      sortBy === "difficulty"
        ? [
            { key: "hard", label: t.benchmarks.difficultyHard, note: t.benchmarks.difficultyHardNote, lo: 1.6, hi: Infinity },
            { key: "mid", label: t.benchmarks.difficultyMid, note: t.benchmarks.difficultyMidNote, lo: 1.2, hi: 1.6 },
            { key: "loose", label: t.benchmarks.difficultyLoose, note: t.benchmarks.difficultyLooseNote, lo: -Infinity, hi: 1.2 },
          ]
        : [
            { key: "high", label: t.benchmarks.utilityHigh, note: t.benchmarks.utilityHighNote, lo: 60, hi: Infinity },
            { key: "mid", label: t.benchmarks.utilityMid, note: t.benchmarks.utilityMidNote, lo: 40, hi: 60 },
            { key: "low", label: t.benchmarks.utilityLow, note: t.benchmarks.utilityLowNote, lo: -Infinity, hi: 40 },
          ];

    return defs
      .map(d => ({
        key: d.key,
        label: d.label,
        note: d.note,
        /* Half-open bands [lo, hi) so every record lands in exactly one. */
        items: entries.filter(e => {
          const v = pick(e.item);
          return v >= d.lo && v < d.hi;
        }),
      }))
      .filter(b => b.items.length > 0);
  }, [filtered, sortBy]);

  return (
    <WorkbenchLayout
      title={t.benchmarks.title}
      subtitle={t.benchmarks.subtitle.replace("{filtered}", String(filtered.length)).replace("{total}", String(rows.length))}
      readNext={[
        { href: "/matrix", label: t.benchmarks.readNextMatrix, why: t.benchmarks.readNextMatrixWhy },
        { href: "/decide", label: t.benchmarks.readNextDecide, why: t.benchmarks.readNextDecideWhy },
      ]}
      aside={
        <>
          <NoteBlock label={t.benchmarks.howToRead}>
            <p>
              {t.benchmarks.howToReadP1_1}
              <strong className="text-ink-700">{t.benchmarks.howToReadP1_2}</strong>
              {t.benchmarks.howToReadP1_3}
            </p>
            <p>{t.benchmarks.howToReadP2}</p>
          </NoteBlock>
          <NoteBlock label={t.benchmarks.methodologyGap}>
            <NoteFigure
              value={
                rows.length > 0
                  ? `${Math.round((rows.filter(b => b.ciDisclosed).length / rows.length) * 100)}%`
                  : "—"
              }
              caption={t.benchmarks.methodologyGapCaption}
            />
          </NoteBlock>
          <NoteBlock label={t.benchmarks.utilityMeaning}>
            <p>
              {t.benchmarks.utilityMeaningP1_1}
              <strong className="text-ink-700">{t.benchmarks.utilityMeaningP1_2}</strong>
              {t.benchmarks.utilityMeaningP1_3}
            </p>
          </NoteBlock>
        </>
      }
      actions={
        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={v => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="h-8 w-[128px] text-[14px]">
              <ArrowUpDown className="size-3" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="utility">{t.benchmarks.sortByUtility}</SelectItem>
              <SelectItem value="trust">{t.benchmarks.sortByTrust}</SelectItem>
              <SelectItem value="disc">{t.benchmarks.sortByDisc}</SelectItem>
              <SelectItem value="difficulty">{t.benchmarks.sortByDifficulty}</SelectItem>
              <SelectItem value="name">{t.benchmarks.sortByNameOption}</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setView("grid")}
              className={cn(
                "transition-colors duration-120",
                view === "grid" ? "text-ink-900" : "text-ink-400 hover:text-ink-700",
              )}
              title={t.benchmarks.gridView}
            >
              <LayoutGrid className="size-3.5" />
            </button>
            <button
              onClick={() => setView("list")}
              className={cn(
                "transition-colors duration-120",
                view === "list" ? "text-ink-900" : "text-ink-400 hover:text-ink-700",
              )}
              title={t.benchmarks.listView}
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
          placeholder={t.benchmarks.searchPlaceholder}
          className="h-8 w-[180px] text-[14px]"
        />
        <FilterSelect value={domain} onChange={setDomain} placeholder={t.benchmarks.filterDomain}
          options={domains.map(d => ({ value: d, label: t.capability[d as CapabilityDomain] ?? d }))} />
        <FilterSelect value={saturation} onChange={setSaturation} placeholder={t.benchmarks.filterSaturation}
          options={["frontier", "contested", "saturated"].map(s => ({ value: s, label: t.saturation[s as keyof typeof t.saturation] }))} />
        <FilterSelect value={stance} onChange={setStance} placeholder={t.benchmarks.filterStance}
          options={stances.map(s => ({ value: s, label: t.stance[s as keyof typeof t.stance] ?? s }))} />
        <FilterSelect value={mechanism} onChange={setMechanism} placeholder={t.benchmarks.filterMechanism}
          options={mechanisms.map(m => ({ value: m, label: t.mechanism[m as ScoringMechanism] ?? m }))} />
        {(activeFilters > 0 || query) && (
          <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-[14px]"
            onClick={() => { setDomain(ALL); setSaturation(ALL); setStance(ALL); setMechanism(ALL); setQuery(""); }}>
            <X className="size-3" />{t.benchmarks.clearFilters}
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
         *
         * 95 records in one unbroken run leaves a reader with no idea where they
         * are by the time they have scrolled a few screens. Group the run into
         * utility bands with sticky headers: the band you are inside stays named
         * at the top of the viewport, which is what a running head does in print.
         */
        <div>
          {bands.map(band => (
            <section key={band.key}>
              <div className="bg-background hair-b sticky top-[52px] z-10 flex items-baseline justify-between py-2">
                <h2 className="ui text-ink-700 text-[14px] font-semibold">
                  {band.label}
                </h2>
                <span className="ui text-ink-500 text-[14px]">
                  <span className="tnum">{band.items.length}</span> {t.benchmarks.itemsCount} · {band.note}
                </span>
              </div>
              {band.items.map(({ item: b, index: i }) => (
            <Link
              key={b.slug}
              href={`/benchmarks/${b.slug}`}
              className="group hair-b block py-4 first:pt-0 hover:bg-surface transition-colors duration-120"
            >
              <div className="grid gap-x-6 gap-y-2 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)_minmax(0,3fr)]">
                {/* identity */}
                <div className="flex items-baseline gap-3">
                  <span className="tnum text-ink-400 w-6 shrink-0 text-[14px]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-ink-900 truncate text-[15px] leading-[1.75]">{b.name}</h3>
                    <p className="ui text-ink-500 mt-1 truncate text-[14px]">
                      {b.issuer ?? t.benchmarks.noIssuer}
                      {b.version ? ` · ${b.version}` : ""}
                      {" · "}
                      {t.capability[b.capabilityDomain as CapabilityDomain] ?? b.capabilityDomain}
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
                  <div className="ui text-ink-500 mt-1 flex items-center gap-3 text-[14px]">
                    <span className="tnum">{t.benchmarks.difficultyPrefix} ×{b.difficultyCoefficient.toFixed(2)}</span>
                    <span className={cn("tnum", b.scoreCount === 0 && "text-caution")}>
                      {b.scoreCount} {t.benchmarks.evidenceCount}
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
                    <ScoreMeter value={b.trustScore} label={t.benchmarks.trustLabel} explain={metricExplain.trust} size="sm" />
                    <ScoreMeter
                      value={b.discriminativePower}
                      label={t.benchmarks.discLabel}
                      explain={metricExplain.discriminative}
                      size="sm"
                      tone="violet"
                    />
                    {(b.scoreCount === 0 || !b.ciDisclosed) && (
                      <div className="ui text-caution flex flex-wrap items-center gap-x-2.5 pt-0.5 text-[14px]">
                        {b.scoreCount === 0 && (
                          <span className="inline-flex items-center gap-1">
                            <AlertTriangle className="size-2.5" />
                            {t.benchmarks.noTraceableScores}
                          </span>
                        )}
                        {!b.ciDisclosed && (
                          <span className="inline-flex items-center gap-1">
                            <AlertTriangle className="size-2.5" />
                            {t.benchmarks.noCiDisclosed}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="tnum text-ink-900 text-[24px] leading-none">{b.utilityScore}</div>
                    <div className="ui text-ink-500 mt-1 text-[14px]">{t.benchmarks.utilityLabel}</div>
                  </div>
                </div>
              </div>
            </Link>
              ))}
            </section>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="hair-b">
                <th className="ui text-ink-700 px-1 pb-2.5 text-left text-[14px] font-semibold">{t.benchmarks.thBenchmark}</th>
                <th className="ui text-ink-700 px-3 pb-2.5 text-left text-[14px] font-semibold">{t.benchmarks.thDomain}</th>
                <th className="ui text-ink-700 px-3 pb-2.5 text-left text-[14px] font-semibold">{t.benchmarks.thMechanism}</th>
                <th className="ui text-ink-700 px-3 pb-2.5 text-left text-[14px] font-semibold">{t.benchmarks.thStatus}</th>
                <th className="ui text-ink-700 px-3 pb-2.5 text-right text-[14px] font-semibold">
                  <span className="inline-flex items-center gap-1">{t.benchmarks.thUtility} <InfoHint>{metricExplain.utility}</InfoHint></span>
                </th>
                <th className="ui text-ink-700 px-3 pb-2.5 text-right text-[14px] font-semibold">
                  <span className="inline-flex items-center gap-1">
                    {t.benchmarks.thEvidence}
                    <InfoHint>{t.benchmarks.evidenceHint}</InfoHint>
                  </span>
                </th>
                <th className="ui text-ink-700 px-3 pb-2.5 text-right text-[14px] font-semibold">{t.benchmarks.thTrust}</th>
                <th className="ui text-ink-700 px-3 pb-2.5 text-right text-[14px] font-semibold">{t.benchmarks.thDisc}</th>
                <th className="ui text-ink-700 px-1 pb-2.5 text-right text-[14px] font-semibold">{t.benchmarks.thDifficulty}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b, i) => (
                <tr key={b.slug} className="hair-row hover:bg-surface transition-colors duration-120">
                  <td className="px-1 py-2">
                    <Link href={`/benchmarks/${b.slug}`} className="block min-w-0">
                      <div className="text-ink-900 truncate text-[14px]">{b.name}</div>
                      <div className="ui text-ink-500 truncate text-[14px]">{b.issuer ?? <span className="text-ink-400">—</span>}</div>
                    </Link>
                  </td>
                  <td className="ui text-ink-700 px-3 py-2 text-[14px]">
                    {t.capability[b.capabilityDomain as CapabilityDomain] ?? b.capabilityDomain}
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
                  <td className="px-3 py-2">
                    <ScoreBar value={b.utilityScore} max={100} delay={i} />
                  </td>
                  <td className="tnum px-3 py-2 text-right text-[14px]">
                    <span className={b.scoreCount === 0 ? "text-caution" : "text-ink-900"}>
                      {b.scoreCount}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <ScoreBar value={b.trustScore} max={100} delay={i} />
                  </td>
                  <td className="px-3 py-2">
                    <ScoreBar value={b.discriminativePower} max={100} delay={i} />
                  </td>
                  <td className="tnum text-ink-900 px-1 py-2 text-right text-[14px]">×{b.difficultyCoefficient.toFixed(2)}</td>
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
  const t = useT();
  if (options.length < 8) {
    return (
      <div className="flex items-center gap-1.5">
        <button type="button" className="chip" data-on={value === ALL} onClick={() => onChange(ALL)}>
          {placeholder}{t.benchmarks.allSuffix}
        </button>
        {options.map(o => (
          <button key={o.value} type="button" className="chip" data-on={value === o.value} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    );
  }
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 w-[130px] text-[14px]"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{placeholder}{t.benchmarks.allSuffix}</SelectItem>
        {options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
