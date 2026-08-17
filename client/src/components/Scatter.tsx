import { useMemo, useState } from "react";
import { providerColor } from "@/lib/series";

export type ScatterPoint = {
  slug: string;
  label: string;
  provider?: string | null;
  x: number;
  y: number;
};

/**
 * Quality-versus-cost scatter, the one view the reference sites lead with that
 * BenchLens never had — even though every input (normalised score, price,
 * context, trust) was already in the database.
 *
 * Two details that matter more than they look:
 *
 *  - The x axis defaults to logarithmic. Published prices span $0.05 to $125 per
 *    million tokens, so a linear axis crushes 80% of the field into the left
 *    edge. llm-stats ships an independent log toggle per axis for this reason.
 *  - Points are coloured by provider using the same mapping as the tables, so a
 *    reader can carry "Anthropic is blue" from one view to the next.
 *
 * Rendered as SVG rather than canvas: ~100 points is well within SVG's budget,
 * and it keeps hit-testing, focus and tooltips free.
 */
export function Scatter({
  points,
  xLabel,
  yLabel,
  xLog = true,
  height = 420,
  onPick,
}: {
  points: ScatterPoint[];
  xLabel: string;
  yLabel: string;
  xLog?: boolean;
  height?: number;
  onPick?: (slug: string) => void;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const [log, setLog] = useState(xLog);

  const PAD = { l: 56, r: 20, t: 16, b: 44 };
  const W = 1000;
  const H = height;

  const geom = useMemo(() => {
    const valid = points.filter(
      p => Number.isFinite(p.x) && Number.isFinite(p.y) && (!log || p.x > 0),
    );
    if (!valid.length) return null;

    const fx = (v: number) => (log ? Math.log10(v) : v);
    const xs = valid.map(p => fx(p.x));
    const ys = valid.map(p => p.y);
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs);
    const y0 = Math.min(...ys);
    const y1 = Math.max(...ys);
    // Pad the domain so points never sit on the frame.
    const xr = (x1 - x0) || 1;
    const yr = (y1 - y0) || 1;
    const dx0 = x0 - xr * 0.06;
    const dx1 = x1 + xr * 0.06;
    const dy0 = Math.max(0, y0 - yr * 0.08);
    const dy1 = y1 + yr * 0.08;

    const sx = (v: number) => PAD.l + ((fx(v) - dx0) / (dx1 - dx0)) * (W - PAD.l - PAD.r);
    const sy = (v: number) => H - PAD.b - ((v - dy0) / (dy1 - dy0)) * (H - PAD.t - PAD.b);

    // Ticks: for a log axis use decade boundaries and the 2/5 subdivisions that
    // actually correspond to published price points.
    const xTicks: number[] = [];
    if (log) {
      for (let d = Math.floor(dx0); d <= Math.ceil(dx1); d++) {
        for (const m of [1, 2, 5]) {
          const v = m * 10 ** d;
          if (fx(v) >= dx0 && fx(v) <= dx1) xTicks.push(v);
        }
      }
    } else {
      const step = niceStep(dx1 - dx0);
      for (let v = Math.ceil(dx0 / step) * step; v <= dx1; v += step) xTicks.push(v);
    }

    const yStep = niceStep(dy1 - dy0);
    const yTicks: number[] = [];
    for (let v = Math.ceil(dy0 / yStep) * yStep; v <= dy1; v += yStep) yTicks.push(v);

    return { valid, sx, sy, xTicks, yTicks };
  }, [points, log, H]);

  if (!geom) {
    return (
      <div className="text-ink-500 flex h-40 items-center justify-center text-[14px]">
        No plottable points
      </div>
    );
  }

  const { valid, sx, sy, xTicks, yTicks } = geom;
  const active = valid.find(p => p.slug === hover);

  return (
    <div className="relative">
      <div className="mb-2 flex items-center justify-end">
        <button
          type="button"
          className="chip"
          data-on={log}
          onClick={() => setLog(v => !v)}
          aria-pressed={log}
        >
          log {xLabel}
        </button>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height }}
        role="img"
        aria-label={`${yLabel} versus ${xLabel}`}
      >
        {/* gridlines */}
        {yTicks.map(t => (
          <g key={`y${t}`}>
            <line
              x1={PAD.l}
              x2={W - PAD.r}
              y1={sy(t)}
              y2={sy(t)}
              stroke="var(--hair-faint)"
              strokeWidth="1"
            />
            <text
              x={PAD.l - 10}
              y={sy(t)}
              textAnchor="end"
              dominantBaseline="middle"
              className="tnum"
              fontSize="13"
              fill="var(--ink-500)"
            >
              {t}
            </text>
          </g>
        ))}
        {xTicks.map(t => (
          <g key={`x${t}`}>
            <line
              y1={PAD.t}
              y2={H - PAD.b}
              x1={sx(t)}
              x2={sx(t)}
              stroke="var(--hair-faint)"
              strokeWidth="1"
            />
            <text
              x={sx(t)}
              y={H - PAD.b + 20}
              textAnchor="middle"
              className="tnum"
              fontSize="13"
              fill="var(--ink-500)"
            >
              {t < 1 ? t.toFixed(2) : t}
            </text>
          </g>
        ))}

        {/* axis labels */}
        <text
          x={(W + PAD.l) / 2}
          y={H - 6}
          textAnchor="middle"
          fontSize="13"
          fill="var(--ink-600)"
        >
          {xLabel}
        </text>
        <text
          transform={`translate(14 ${(H - PAD.b + PAD.t) / 2}) rotate(-90)`}
          textAnchor="middle"
          fontSize="13"
          fill="var(--ink-600)"
        >
          {yLabel}
        </text>

        {/* points */}
        {valid.map(p => {
          const on = hover === p.slug;
          return (
            <circle
              key={p.slug}
              cx={sx(p.x)}
              cy={sy(p.y)}
              r={on ? 7 : 4.5}
              fill={providerColor(p.provider)}
              fillOpacity={on ? 1 : 0.82}
              stroke={on ? "var(--ink-950)" : "transparent"}
              strokeWidth="1.5"
              style={{ cursor: onPick ? "pointer" : "default", transition: "r 120ms var(--ease-out)" }}
              onMouseEnter={() => setHover(p.slug)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onPick?.(p.slug)}
            />
          );
        })}

        {/* hover readout, drawn last so it sits above the points */}
        {active ? (
          <g pointerEvents="none">
            <rect
              x={Math.min(sx(active.x) + 12, W - 240)}
              y={Math.max(sy(active.y) - 34, PAD.t)}
              width="228"
              height="44"
              rx="4"
              fill="var(--surface)"
              stroke="var(--border)"
            />
            <text
              x={Math.min(sx(active.x) + 22, W - 230)}
              y={Math.max(sy(active.y) - 16, PAD.t + 18)}
              fontSize="14"
              fontWeight="600"
              fill="var(--ink-950)"
            >
              {active.label.length > 26 ? active.label.slice(0, 25) + "…" : active.label}
            </text>
            <text
              x={Math.min(sx(active.x) + 22, W - 230)}
              y={Math.max(sy(active.y) + 2, PAD.t + 36)}
              fontSize="13"
              fill="var(--ink-600)"
              className="tnum"
            >
              {yLabel} {active.y.toFixed(1)} · {xLabel} {active.x}
            </text>
          </g>
        ) : null}
      </svg>
    </div>
  );
}

function niceStep(range: number): number {
  const raw = range / 5;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const n = raw / mag;
  const step = n >= 5 ? 5 : n >= 2 ? 2 : 1;
  return step * mag;
}
