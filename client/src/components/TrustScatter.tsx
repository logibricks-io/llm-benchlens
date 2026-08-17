import { InfoHint } from "@/components/MetaBadges";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type SaturationStatus } from "@shared/metaModel";
import { Link } from "wouter";
import { useT } from "@/i18n";

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
 *
 * Frost edition: the plot sits on paper with graduated edges — the frame is
 * itself a pair of rulers — instead of inside a bordered panel.
 */
export function TrustScatter({ points }: { points: Point[] }) {
  const t = useT();
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
    <div>
      <div className="mb-4 flex items-baseline gap-2">
        <h3 className="text-ink-800 text-[15px]">{t.trustScatter.title}</h3>
        <InfoHint>
          {t.trustScatter.hint}
        </InfoHint>
      </div>

      {/* graduated frame: left and bottom edges are rules with tick marks */}
      <div className="relative pb-6 pl-6">
        <div className="paper relative aspect-[4/3] w-full">
          {/*
           * No quadrant fills. Two washes covering half the plot would blow the
           * 5%-signal-colour budget and flatten the restraint the palette is for;
           * the median hairlines already divide the space, so the quadrants are
           * named with small corner marks instead.
           */}
          <div
            className="ui absolute text-[13px]"
            style={{ right: 6, top: 5, color: "var(--sig-good)", opacity: 0.85 }}
          >
            {t.trustScatter.quadrantGood}
          </div>
          <div
            className="ui absolute text-[13px]"
            style={{ left: 6, bottom: 5, color: "var(--sig-danger)", opacity: 0.85 }}
          >
            {t.trustScatter.quadrantBad}
          </div>
          {/* median axes — the quadrant split, stated as hairlines */}
          <div
            className="absolute top-0 bottom-0"
            style={{ left: `${xMid}%`, width: 1, background: "var(--border)" }}
          />
          <div
            className="absolute right-0 left-0"
            style={{ top: `${yMid}%`, height: 1, background: "var(--border)" }}
          />

          {points.map(p => {
            const left = px(p.discriminativePower);
            const top = py(p.trustScore);
            const color =
              DOT_COLOR[p.saturationStatus as SaturationStatus] ?? "var(--signal-saturated)";
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
                      opacity: 0.7,
                      transitionTimingFunction: "var(--ease-out)",
                    }}
                  />
                </TooltipTrigger>
                <TooltipContent className="text-xs">
                  <div>{p.name}</div>
                  <div className="tnum text-ink-500 mt-0.5">
                    {t.trustScatter.tooltipTrust} {p.trustScore} · {t.trustScatter.tooltipDiscriminative} {p.discriminativePower} · {t.trustScatter.tooltipUtility} {p.utilityScore}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* bottom rule: discriminative power */}
        <div className="absolute bottom-6 left-6 right-0">
          <div style={{ height: 1, background: "var(--frost-qing)", opacity: 0.5 }} />
          {Array.from({ length: 11 }, (_, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                left: `${i * 10}%`,
                top: 1,
                width: 1,
                height: i % 5 === 0 ? 4 : 2.5,
                background: "var(--frost-qing)",
                opacity: 0.55,
              }}
            />
          ))}
        </div>
        {/* left rule: trust */}
        <div className="absolute bottom-6 left-6 top-0">
          <div className="h-full" style={{ width: 1, background: "var(--frost-qing)", opacity: 0.5 }} />
          {Array.from({ length: 11 }, (_, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                top: `${i * 10}%`,
                right: 1,
                height: 1,
                width: i % 5 === 0 ? 4 : 2.5,
                background: "var(--frost-qing)",
                opacity: 0.55,
              }}
            />
          ))}
        </div>

        <div className="ui text-ink-400 absolute bottom-0 left-6 text-[13px]">{t.trustScatter.axisDiscriminative}</div>
        <div
          className="ui text-ink-400 absolute top-0 left-0 text-[13px]"
          style={{ writingMode: "vertical-rl" }}
        >
          {t.trustScatter.axisTrust}
        </div>
      </div>

      <div className="hair-t mt-2 flex flex-wrap items-center justify-between gap-2 pt-3">
        <div className="flex items-center gap-3.5">
          {(["frontier", "contested", "saturated"] as SaturationStatus[]).map(s => (
            <span key={s} className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full" style={{ background: DOT_COLOR[s] }} />
              <span className="ui text-ink-500 text-[13px]">{t.saturation[s]}</span>
            </span>
          ))}
        </div>
        <span className="ui text-ink-400 text-[13px]">{t.trustScatter.legendSize}</span>
      </div>
    </div>
  );
}
