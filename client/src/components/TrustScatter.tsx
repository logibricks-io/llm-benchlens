import { InfoHint } from "@/components/MetaBadges";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SATURATION_LABELS, type SaturationStatus } from "@shared/metaModel";
import { Link } from "wouter";

type Point = {
  slug: string;
  name: string;
  trustScore: number;
  discriminativePower: number;
  saturationStatus: string;
  utilityScore: number;
};

const DOT_COLOR: Record<SaturationStatus, string> = {
  frontier: "var(--signal-frontier)",
  contested: "var(--signal-contested)",
  saturated: "var(--signal-saturated)",
};

/**
 * Trust (y) against discriminative power (x). The quadrants are the point:
 * top-right = the only benchmarks worth quoting; bottom-left = noise that
 * still shows up in launch decks.
 */
export function TrustScatter({ points }: { points: Point[] }) {
  /**
   * Trust scores cluster in a narrow high band (roughly 45-100), so a raw 0-100
   * mapping would stack every dot against the top edge. Stretch both axes to the
   * observed range, with a small pad, so the spread is actually legible.
   */
  const xs = points.map(p => p.discriminativePower);
  const ys = points.map(p => p.trustScore);
  const xMin = Math.min(...xs, 100);
  const xMax = Math.max(...xs, 0);
  const yMin = Math.min(...ys, 100);
  const yMax = Math.max(...ys, 0);
  const xSpan = Math.max(xMax - xMin, 1);
  const ySpan = Math.max(yMax - yMin, 1);
  const px = (v: number) => 4 + ((v - xMin) / xSpan) * 92;
  const py = (v: number) => 96 - ((v - yMin) / ySpan) * 92;
  /** Median lines, in the same stretched space. */
  const sorted = (a: number[]) => [...a].sort((m, n) => m - n);
  const median = (a: number[]) => {
    const s = sorted(a);
    return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
  };
  const xMid = points.length ? px(median(xs)) : 50;
  const yMid = points.length ? py(median(ys)) : 50;

  return (
    <div className="panel p-4">
      <div className="mb-3 flex items-center gap-1.5">
        <h3 className="text-[13px] font-semibold">可信度 × 分辨力分布</h3>
        <InfoHint>
          横轴为分辨力（还能区分多少模型差异），纵轴为可信度（这把尺子本身可不可信）。
          右上象限是真正值得引用的指标；左下象限的指标既不可信也已失去分辨力，却仍频繁出现在发布材料中。
        </InfoHint>
      </div>

      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md border border-border">
        {/*
         * Quadrant shading and the grid are plain divs rather than SVG shapes:
         * SVG presentation attributes do not reliably parse oklch(), and a
         * failed parse silently falls back to an opaque fill.
         */}
        <div className="absolute inset-0 bg-background" />
        <div
          className="absolute bg-[color:var(--signal-good)] opacity-[0.07]"
          style={{ left: `${xMid}%`, right: 0, top: 0, height: `${yMid}%` }}
        />
        <div
          className="absolute bg-[color:var(--signal-danger)] opacity-[0.07]"
          style={{ left: 0, width: `${xMid}%`, top: `${yMid}%`, bottom: 0 }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to right, oklch(0.3 0.012 262 / 0.5) 0 1px, transparent 1px 25%), repeating-linear-gradient(to bottom, oklch(0.3 0.012 262 / 0.5) 0 1px, transparent 1px 25%)",
          }}
        />
        {/* Median axes */}
        <div className="absolute top-0 bottom-0 w-px bg-border" style={{ left: `${xMid}%` }} />
        <div className="absolute right-0 left-0 h-px bg-border" style={{ top: `${yMid}%` }} />

        {/* Points are absolutely positioned so hover targets stay circular. */}
        {points.map(p => {
          const left = px(p.discriminativePower);
          const top = py(p.trustScore);
          const color = DOT_COLOR[p.saturationStatus as SaturationStatus] ?? "var(--signal-saturated)";
          const size = 5 + (p.utilityScore / 100) * 5;
          return (
            <Tooltip key={p.slug}>
              <TooltipTrigger asChild>
                <Link
                  href={`/benchmarks/${p.slug}`}
                  className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-transform duration-150 hover:scale-150"
                  style={{
                    left: `${left}%`,
                    top: `${top}%`,
                    width: `${size}px`,
                    height: `${size}px`,
                    background: color,
                    opacity: 0.75,
                    transitionTimingFunction: "var(--ease-out)",
                  }}
                />
              </TooltipTrigger>
              <TooltipContent className="text-xs">
                <div className="font-medium">{p.name}</div>
                <div className="tnum mt-0.5 text-muted-foreground">
                  可信 {p.trustScore} · 分辨 {p.discriminativePower} · 效用 {p.utilityScore}
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}

      </div>

      {/* Quadrant captions sit below the plot so they never overlap points. */}
      <div className="mt-2 flex items-center justify-between">
        <span className="flex items-center gap-1 text-[10px] text-[color:var(--signal-danger)]/80">
          <span className="size-1.5 rounded-sm bg-[color:var(--signal-danger)]/40" />
          左下：低可信且已饱和
        </span>
        <span className="flex items-center gap-1 text-[10px] text-[color:var(--signal-good)]/80">
          右上：可信且有分辨力
          <span className="size-1.5 rounded-sm bg-[color:var(--signal-good)]/40" />
        </span>
      </div>

      <div className="mt-2.5 flex items-center justify-between border-t border-border pt-2">
        <span className="text-[10px] text-muted-foreground/70">横轴 分辨力 →　纵轴 ↑ 可信度</span>
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {(["frontier", "contested", "saturated"] as SaturationStatus[]).map(s => (
            <span key={s} className="flex items-center gap-1">
              <span className="size-1.5 rounded-full" style={{ background: DOT_COLOR[s] }} />
              <span className="text-[10px] text-muted-foreground">{SATURATION_LABELS[s]}</span>
            </span>
          ))}
        </div>
        <span className="text-[10px] text-muted-foreground/70">点面积 ∝ 效用分</span>
      </div>
    </div>
  );
}
