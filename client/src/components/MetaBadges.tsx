import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";
import type {
  ContaminationRisk,
  Freshness,
  IssuerStance,
  SaturationStatus,
  ScoringMechanism,
  Strictness,
} from "@shared/metaModel";
import { AlertTriangle, CircleDot, Info, ShieldCheck, Sparkles } from "lucide-react";
import { MiniRuler } from "@/components/Ruler";

/**
 * A small label + tooltip pair. Every credibility signal must be explainable.
 *
 * Frost edition: no filled pill, no border box. A chip is a hairline-underlined
 * word, so a row of five signals reads as annotation rather than as a row of
 * competing buttons.
 *
 * All wording now comes from the i18n dictionary keyed by the meta-model enums.
 * The server keeps sending bare keys ("frontier", "rubric_llm_judge"), so a
 * missing translation would render blank — `server/i18n.test.ts` asserts that
 * every enum key has an entry in both packs to make that impossible.
 */
function Chip({
  children,
  explain,
  className,
  icon,
}: {
  children: React.ReactNode;
  explain: string;
  className?: string;
  icon?: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "ui inline-flex cursor-help items-center gap-1 text-[13px] leading-tight whitespace-nowrap",
            "decoration-dotted underline-offset-[3px] hover:underline",
            className,
          )}
        >
          {icon}
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-[300px] text-xs leading-relaxed">{explain}</TooltipContent>
    </Tooltip>
  );
}

const SATURATION_STYLE: Record<SaturationStatus, string> = {
  frontier: "text-frontier",
  contested: "text-[color:var(--signal-contested)]",
  saturated: "text-ink-400",
};

export function SaturationBadge({ status, className }: { status: string; className?: string }) {
  const t = useT();
  const s = status as SaturationStatus;
  return (
    <Chip
      explain={t.saturationExplain[s] ?? status}
      className={cn(SATURATION_STYLE[s] ?? "text-ink-400", className)}
      icon={s === "frontier" ? <Sparkles className="size-2.5" /> : <CircleDot className="size-2.5" />}
    >
      {t.saturation[s] ?? status}
    </Chip>
  );
}

export function StrictnessBadge({ strictness }: { strictness: string }) {
  const t = useT();
  const s = strictness as Strictness;
  return (
    <Chip
      explain={t.strictnessExplain[s] ?? strictness}
      className={cn("text-ink-500", s === "all_or_nothing" && "text-caution")}
    >
      {t.strictness[s] ?? strictness}
    </Chip>
  );
}

export function MechanismBadge({ mechanism }: { mechanism: string }) {
  const t = useT();
  const m = mechanism as ScoringMechanism;
  return (
    <Chip explain={t.mechanismExplain[m] ?? mechanism} className="text-ink-500">
      {t.mechanism[m] ?? mechanism}
    </Chip>
  );
}

export function StanceBadge({ stance }: { stance: string }) {
  const t = useT();
  const s = stance as IssuerStance;
  return (
    <Chip
      explain={t.stanceExplain[s] ?? stance}
      className={cn(
        "text-ink-500",
        s === "first_party" && "text-caution",
        s === "third_party_evaluator" && "text-good",
      )}
      icon={s === "third_party_evaluator" ? <ShieldCheck className="size-2.5" /> : undefined}
    >
      {t.stance[s] ?? stance}
    </Chip>
  );
}

export function ContaminationBadge({ risk }: { risk: string }) {
  const t = useT();
  const r = risk as ContaminationRisk;
  if (r === "low") return null;
  return (
    <Chip
      explain={t.contaminationExplain[r] ?? risk}
      className={cn(r === "high" ? "text-danger" : "text-caution")}
      icon={<AlertTriangle className="size-2.5" />}
    >
      {t.contamination[r] ?? risk}
    </Chip>
  );
}

/**
 * Source types must stay in sync with the closed vocabulary enforced in
 * `identity.test.ts`. The older keys (`third_party`, `leaderboard`, `official`,
 * `aggregator`, `vendor`) were folded during source normalization; they are
 * mapped here as aliases only so a stale cached response never renders a raw
 * snake_case string to the user.
 */
const SOURCE_ALIASES: Record<string, "official_leaderboard" | "third_party_aggregator" | "self_reported" | "paper"> = {
  official_leaderboard: "official_leaderboard",
  third_party_aggregator: "third_party_aggregator",
  self_reported: "self_reported",
  paper: "paper",
  third_party: "third_party_aggregator",
  leaderboard: "official_leaderboard",
  official: "official_leaderboard",
  aggregator: "third_party_aggregator",
  vendor: "self_reported",
};

export function SourceBadge({ sourceType, className }: { sourceType: string; className?: string }) {
  const t = useT();
  const key = SOURCE_ALIASES[sourceType];
  /* Dictionary keys match the stored vocabulary exactly, so no special-casing. */
  const label = key ? t.sourceType[key] : sourceType;
  return (
    <Chip
      explain={key ? t.sourceExplain[key] : sourceType}
      className={cn(
        "text-ink-400",
        key === "self_reported" && "text-caution",
        key === "third_party_aggregator" && "text-good",
        className,
      )}
    >
      {label}
    </Chip>
  );
}

const FRESHNESS_STYLE: Record<Freshness, string> = {
  fresh: "bg-[color:var(--signal-good)]",
  recent: "bg-[color:var(--signal-contested)]",
  aging: "bg-[color:var(--signal-caution)]",
  stale: "bg-[color:var(--signal-danger)]",
};

export function FreshnessDot({ freshness, withLabel }: { freshness: string; withLabel?: boolean }) {
  const t = useT();
  const f = freshness as Freshness;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex cursor-help items-center gap-1.5">
          <span className={cn("size-1.5 shrink-0 rounded-full", FRESHNESS_STYLE[f] ?? "bg-frost-mist/50")} />
          {withLabel && <span className="ui text-ink-500 text-[13px]">{t.freshness[f] ?? freshness}</span>}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-[260px] text-xs leading-relaxed">
        {t.freshnessExplain[f] ?? freshness}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Trust / discriminative power meter, drawn as a graduated rule so it belongs
 * to the same form language as everything else. The number stays primary; the
 * rule only says roughly where that number sits.
 */
export function ScoreMeter({
  value,
  label,
  explain,
  tone = "primary",
  size = "md",
}: {
  value: number;
  label: string;
  explain: string;
  tone?: "primary" | "caution" | "violet";
  size?: "sm" | "md";
}) {
  const rulerTone = tone === "caution" ? "caution" : tone === "violet" ? "neutral" : "good";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex w-full cursor-help items-baseline gap-2.5">
          <span className={cn("ui text-ink-500 shrink-0", size === "sm" ? "text-[13px]" : "text-[13px]")}>
            {label}
          </span>
          <MiniRuler value={value} tone={rulerTone} width={0} className="min-w-0 flex-1" />
          <span className={cn("tnum text-ink-800 shrink-0", size === "sm" ? "text-[13px]" : "text-[13px]")}>
            {value}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-[300px] text-xs leading-relaxed">{explain}</TooltipContent>
    </Tooltip>
  );
}

export function InfoHint({ children }: { children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Info className="text-ink-400 size-3 shrink-0 cursor-help" />
      </TooltipTrigger>
      <TooltipContent className="max-w-[320px] text-xs leading-relaxed">{children}</TooltipContent>
    </Tooltip>
  );
}

/**
 * The long-form metric explanations used to be module-level string constants.
 * They are now dictionary entries, so callers need the hook. Exposed as one
 * hook rather than five so a page pays a single call.
 */
export function useMetricExplain() {
  return useT().metricExplain;
}
