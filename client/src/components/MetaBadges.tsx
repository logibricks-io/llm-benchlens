import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  CONTAMINATION_EXPLAIN,
  CONTAMINATION_LABELS,
  FRESHNESS_LABELS,
  MECHANISM_EXPLAIN,
  MECHANISM_LABELS,
  SATURATION_EXPLAIN,
  SATURATION_LABELS,
  STANCE_EXPLAIN,
  STANCE_LABELS,
  STRICTNESS_EXPLAIN,
  STRICTNESS_LABELS,
  type ContaminationRisk,
  type Freshness,
  type IssuerStance,
  type SaturationStatus,
  type ScoringMechanism,
  type Strictness,
} from "@shared/metaModel";
import { AlertTriangle, CircleDot, Info, ShieldCheck, Sparkles } from "lucide-react";
import { MiniRuler } from "@/components/Ruler";

/**
 * A small label + tooltip pair. Every credibility signal must be explainable.
 *
 * Frost edition: no filled pill, no border box. A chip is a hairline-underlined
 * word, so a row of five signals reads as annotation rather than as a row of
 * competing buttons.
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
            "ui inline-flex cursor-help items-center gap-1 text-[10px] leading-tight whitespace-nowrap",
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
  const s = status as SaturationStatus;
  return (
    <Chip
      explain={SATURATION_EXPLAIN[s] ?? status}
      className={cn(SATURATION_STYLE[s] ?? "text-ink-400", className)}
      icon={s === "frontier" ? <Sparkles className="size-2.5" /> : <CircleDot className="size-2.5" />}
    >
      {SATURATION_LABELS[s] ?? status}
    </Chip>
  );
}

export function StrictnessBadge({ strictness }: { strictness: string }) {
  const s = strictness as Strictness;
  return (
    <Chip
      explain={STRICTNESS_EXPLAIN[s] ?? strictness}
      className={cn(
        "text-ink-500",
        s === "all_or_nothing" && "text-caution",
      )}
    >
      {STRICTNESS_LABELS[s] ?? strictness}
    </Chip>
  );
}

export function MechanismBadge({ mechanism }: { mechanism: string }) {
  const m = mechanism as ScoringMechanism;
  return (
    <Chip explain={MECHANISM_EXPLAIN[m] ?? mechanism} className="text-ink-500">
      {MECHANISM_LABELS[m] ?? mechanism}
    </Chip>
  );
}

export function StanceBadge({ stance }: { stance: string }) {
  const s = stance as IssuerStance;
  return (
    <Chip
      explain={STANCE_EXPLAIN[s] ?? stance}
      className={cn(
        "text-ink-500",
        s === "first_party" && "text-caution",
        s === "third_party_evaluator" && "text-good",
      )}
      icon={s === "third_party_evaluator" ? <ShieldCheck className="size-2.5" /> : undefined}
    >
      {STANCE_LABELS[s] ?? stance}
    </Chip>
  );
}

export function ContaminationBadge({ risk }: { risk: string }) {
  const r = risk as ContaminationRisk;
  if (r === "low") return null;
  return (
    <Chip
      explain={CONTAMINATION_EXPLAIN[r] ?? risk}
      className={cn(
        r === "high"
          ? "text-danger"
          : "text-caution",
      )}
      icon={<AlertTriangle className="size-2.5" />}
    >
      {CONTAMINATION_LABELS[r] ?? risk}
    </Chip>
  );
}

/**
 * Must stay in sync with the closed vocabulary enforced in `identity.test.ts`.
 * The older keys (`third_party`, `leaderboard`, `official`, `aggregator`) were
 * folded during source normalization; they are kept as aliases only so that a
 * stale cached response never renders a raw snake_case string to the user.
 */
const SOURCE_LABELS: Record<string, string> = {
  official_leaderboard: "官方榜单",
  third_party_aggregator: "第三方聚合",
  self_reported: "厂商自报",
  paper: "论文",
  // Legacy aliases.
  third_party: "第三方聚合",
  leaderboard: "官方榜单",
  official: "官方榜单",
  aggregator: "第三方聚合",
  vendor: "厂商自报",
};

const SOURCE_EXPLAIN: Record<string, string> = {
  official_leaderboard: "由评测方自己维护的官方榜单收录，运行环境统一，证据强度较高。",
  third_party_aggregator: "由独立第三方复跑或聚合得出，未经厂商筛选，证据强度高。",
  self_reported: "由模型厂商在发布材料中自行公布，未经独立复跑，存在选择性报告的可能。",
  paper: "来自公开论文中的实验结果，方法可查但通常不随模型更新。",
  third_party: "由独立第三方复跑或聚合得出。",
  leaderboard: "来自官方榜单收录。",
  official: "来自官方榜单收录。",
  aggregator: "由独立第三方聚合得出。",
  vendor: "由模型厂商自行公布。",
};

export function SourceBadge({ sourceType, className }: { sourceType: string; className?: string }) {
  return (
    <Chip
      explain={SOURCE_EXPLAIN[sourceType] ?? sourceType}
      className={cn(
        "text-ink-400",
        sourceType === "self_reported" && "text-caution",
        sourceType === "vendor" && "text-caution",
        (sourceType === "third_party_aggregator" || sourceType === "third_party") &&
          "text-good",
        className,
      )}
    >
      {SOURCE_LABELS[sourceType] ?? sourceType}
    </Chip>
  );
}

const FRESHNESS_STYLE: Record<Freshness, string> = {
  fresh: "bg-[color:var(--signal-good)]",
  recent: "bg-[color:var(--signal-contested)]",
  aging: "bg-[color:var(--signal-caution)]",
  stale: "bg-[color:var(--signal-danger)]",
};

const FRESHNESS_EXPLAIN: Record<Freshness, string> = {
  fresh: "30 天内采集，可视为当前有效。",
  recent: "90 天内采集，通常仍然可用。",
  aging: "已超过 90 天，模型或评测版本可能已更新。",
  stale: "超过 8 个月未更新或缺少采集时间，请谨慎引用。",
};

export function FreshnessDot({ freshness, withLabel }: { freshness: string; withLabel?: boolean }) {
  const f = freshness as Freshness;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex cursor-help items-center gap-1.5">
          <span className={cn("size-1.5 shrink-0 rounded-full", FRESHNESS_STYLE[f] ?? "bg-frost-mist/50")} />
          {withLabel && <span className="ui text-ink-500 text-[10px]">{FRESHNESS_LABELS[f] ?? freshness}</span>}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-[260px] text-xs leading-relaxed">{FRESHNESS_EXPLAIN[f] ?? freshness}</TooltipContent>
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
          <span
            className={cn("ui text-ink-500 shrink-0", size === "sm" ? "text-[9.5px]" : "text-[10px]")}
          >
            {label}
          </span>
          <MiniRuler value={value} tone={rulerTone} width={0} className="min-w-0 flex-1" />
          <span
            className={cn("tnum text-ink-800 shrink-0", size === "sm" ? "text-[11px]" : "text-[12.5px]")}
          >
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

export const TRUST_EXPLAIN =
  "可信度评分（0–100，实际上限 97）：由方法学披露程度、出题方立场、是否开源可复现、是否披露置信区间、污染风险等结构性因素合成。它衡量的是「这把尺子本身可不可信」，与模型分数高低无关。顶端做了渐近压缩——没有任何评测配得上满分。";

export const DISC_EXPLAIN =
  "分辨力（0–100，实际上限 97）：衡量该指标当前还能区分多少模型差异。已被刷到接近满分的指标分辨力极低——此时排名差异多为噪声。";

export const DIFFICULTY_EXPLAIN =
  "难度系数（0.6–2.0+）：由严格度、饱和状态、是否智能体任务、是否含负向断言等结构因素推导。系数越高，同一个百分数代表的实际能力越强，归一化时会被相应放大。";

export const UTILITY_EXPLAIN =
  "效用分（0–100，实际上限 97）：由可信度与分辨力加权合成，再乘以污染折减与「证据充分性」折减，回答「这个指标现在值不值得看」。设计精良但尚无可追溯成绩的评测无法据以比较模型，因此效用分会被显著压低；发布会上最常被引用的饱和指标，效用分往往最低。";

export const NORMALIZED_EXPLAIN =
  "归一化分：把原始分先统一到 0–100（Elo 以人类专家 1000 分为锚点换算），再用该指标的难度系数做非线性重标定，得到「若换成中性尺子，这个成绩值多少」。这是跨指标比较的唯一合法口径。";
