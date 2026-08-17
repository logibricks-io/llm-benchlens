import { providerColor } from "@/lib/series";
import { useT } from "@/i18n";

/**
 * Every model's score for one benchmark, plotted on a single 0–100 axis.
 *
 * A binned histogram was the obvious choice and the wrong one. Most benchmarks
 * here carry 5–20 results; bin them and you get one or two bars, which says
 * nothing. What a reader actually needs to know is how much of the ruler the
 * field occupies: GPQA Diamond's twelve models all sit between 92.5 and 94.1,
 * and that 1.6-point span *is* the saturation story. So this plots the points
 * themselves and states the span in numerals.
 *
 * Points are coloured by provider so the same vendor is trackable from the
 * matrix and the scatter, and jittered vertically only enough to survive ties
 * (94.1 appears twice in that example).
 */
export function ScoreSpread({
  rows,
  className,
}: {
  rows: Array<{ modelName: string; provider?: string | null; rawScore: number }>;
  className?: string;
}) {
  const t = useT();
  // Only 0–100 readings share this axis. Elo and token counts do not.
  const pts = rows.filter(r => Number.isFinite(r.rawScore) && r.rawScore >= 0 && r.rawScore <= 100);
  if (pts.length < 2) return null;

  const vals = pts.map(p => p.rawScore);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const span = hi - lo;

  /* Tie-breaking jitter: stack duplicates instead of hiding them. */
  const seen = new Map<string, number>();
  const placed = pts.map(p => {
    const key = p.rawScore.toFixed(1);
    const n = seen.get(key) ?? 0;
    seen.set(key, n + 1);
    return { ...p, tier: n };
  });
  const maxTier = Math.max(...placed.map(p => p.tier));
  const height = 30 + maxTier * 9;

  return (
    <figure className={className}>
      <div className="relative w-full" style={{ height }}>
        {/* The full ruler, 0–100 */}
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2" style={{ background: "var(--border)" }} />
        {/* The span the field actually occupies */}
        <div
          className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full"
          style={{
            left: `${lo}%`,
            width: `${Math.max(span, 0.4)}%`,
            background: "var(--ink-300)",
          }}
        />
        {placed.map((p, i) => (
          <span
            key={`${p.modelName}-${i}`}
            className="absolute size-[9px] -translate-x-1/2 rounded-full ring-2"
            style={{
              left: `${p.rawScore}%`,
              top: `calc(50% - ${p.tier * 9}px)`,
              transform: "translate(-50%, -50%)",
              background: providerColor(p.provider),
              // A ring in the canvas colour keeps overlapping points legible.
              ["--tw-ring-color" as string]: "var(--canvas)",
            }}
            title={`${p.modelName} · ${p.rawScore}`}
          />
        ))}
      </div>
      <figcaption className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-[13px] text-ink-500">
        <span className="tnum tabular-nums">0</span>
        <span className="flex-1" />
        <span className="tnum tabular-nums">100</span>
      </figcaption>
      <p className="mt-1.5 text-[14px] leading-relaxed text-ink-600">
        <span className="tnum text-ink-900 tabular-nums">{pts.length}</span>{" "}
        {t.spread.modelsWithin}{" "}
        <span className="tnum text-ink-900 tabular-nums">{span.toFixed(1)}</span>{" "}
        {t.spread.pointsOf}{" "}
        <span className="tnum tabular-nums">
          {lo.toFixed(1)}–{hi.toFixed(1)}
        </span>
        {span < 5 && <span className="text-caution"> · {t.spread.compressed}</span>}
      </p>
    </figure>
  );
}
