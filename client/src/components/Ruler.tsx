/**
 * The ruler motif — BenchLens' one piece of proprietary form language.
 *
 * The product's whole argument is that different benchmarks are rulers of
 * different lengths. So a benchmark is literally drawn as a rule whose physical
 * length is proportional to its difficulty coefficient, a score is a reading on
 * that rule, and normalisation is the visible act of projecting that reading
 * down onto a shared neutral rule.
 *
 * The same motif is reused at three scales: full-width on a detail page,
 * inline inside a matrix row, and a few millimetres wide in the desktop widget.
 * One motif, one explanation, every surface.
 */
import { cn } from "@/lib/utils";

/** Widest difficulty coefficient in the corpus; sets the 100% rule length. */
export const MAX_DIFFICULTY = 2.03;

export type RulerTone = "good" | "caution" | "danger" | "neutral" | "ink";

const TONE_VAR: Record<RulerTone, string> = {
  good: "var(--sig-good)",
  caution: "var(--sig-caution)",
  danger: "var(--sig-danger)",
  neutral: "var(--sig-neutral)",
  ink: "var(--ink-800)",
};

/** Three bands only. A continuous heat gradient turns a table into mosaic. */
export function toneForScore(v: number): RulerTone {
  if (v >= 60) return "good";
  if (v >= 40) return "caution";
  return "danger";
}

/**
 * `currentSotaScore` is stored as free text, because that is how issuers publish
 * it: "42.7%", "1315 Elo", "12.6% (GPT-5 high)", "74% ±4%". Pull the leading
 * number out; return null when there is nothing plottable rather than letting
 * NaN silently collapse every mark onto the origin.
 */
export function parseLeadingNumber(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const m = String(raw).match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

type MarkPoint = {
  /** Position along the rule, 0–100 in the rule's own units. */
  value: number;
  label?: string;
  tone?: RulerTone;
  /** Rendered larger and fully opaque — used for "this is the model you picked". */
  emphasis?: boolean;
  title?: string;
};

/**
 * A single rule with tick marks and optional readings on it.
 *
 * `difficulty` shrinks the drawn length: a lenient benchmark is visibly a
 * shorter ruler, which is the entire point. Pass `difficulty={null}` for the
 * neutral rule (always full length, heavier stroke).
 */
export function Ruler({
  difficulty,
  marks = [],
  ticks = 10,
  height = 30,
  neutral = false,
  animate = false,
  labelBelow = false,
  className,
}: {
  difficulty?: number | null;
  marks?: MarkPoint[];
  ticks?: number;
  height?: number;
  neutral?: boolean;
  animate?: boolean;
  labelBelow?: boolean;
  className?: string;
}) {
  const frac =
    difficulty == null ? 1 : Math.max(0.12, Math.min(1, difficulty / MAX_DIFFICULTY));
  const baseline = labelBelow ? height * 0.42 : height * 0.62;

  return (
    <div className={cn("relative w-full", className)} style={{ height }}>
      {/* the rule itself, length ∝ difficulty */}
      <div
        className={cn("absolute left-0", animate && "anim-ruler")}
        style={{
          top: baseline,
          width: `${frac * 100}%`,
          height: neutral ? 1.5 : 1,
          background: neutral ? "var(--ink-800)" : "var(--frost-qing)",
        }}
      />
      {/* ticks: longer every fifth, the way a real rule is graduated */}
      {Array.from({ length: ticks + 1 }, (_, i) => {
        const major = i % 5 === 0;
        return (
          <div
            key={i}
            className="absolute"
            style={{
              left: `${(frac * 100 * i) / ticks}%`,
              top: neutral ? baseline + 1.5 : baseline - (major ? 5 : 3),
              width: 1,
              height: major ? 5 : 3,
              background: neutral ? "var(--ink-800)" : "var(--frost-qing)",
              opacity: major ? 0.75 : 0.5,
            }}
          />
        );
      })}
      {marks.map((m, i) => {
        const tone = TONE_VAR[m.tone ?? "ink"];
        const r = m.emphasis ? 4 : 3;
        /* Keep the label inside the drawn rule: centred normally, but pinned at
           the ends so it never runs back over the row's left-hand text. */
        const pos = frac * m.value;
        const anchor = pos < 12 ? "0%" : pos > frac * 100 - 12 ? "-100%" : "-50%";
        return (
          <div key={i} title={m.title} className="absolute" style={{ left: `${frac * m.value}%` }}>
            <div
              className="absolute rounded-full"
              style={{
                top: baseline - r + 0.5,
                left: -r,
                width: r * 2,
                height: r * 2,
                background: tone,
                opacity: m.emphasis ? 1 : 0.8,
              }}
            />
            {m.label && (
              <div
                className="ui absolute whitespace-nowrap text-[9px] leading-none"
                style={{
                  top: labelBelow ? baseline + 7 : baseline - 16,
                  left: 0,
                  transform: `translateX(${anchor})`,
                  color: tone,
                }}
              >
                {m.label}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Row-scale version: a bare rule with one reading, no ticks worth counting.
 * Used in the matrix so a cell can show both an exact number and a sense of
 * where that number sits — without painting the table into a heatmap.
 */
export function MiniRuler({
  value,
  tone,
  width = 44,
  className,
}: {
  value: number;
  tone?: RulerTone;
  /** Fixed pixel width, or 0 to fill whatever the parent gives it. */
  width?: number;
  className?: string;
}) {
  const t = TONE_VAR[tone ?? toneForScore(value)];
  return (
    <span
      className={cn("relative inline-block align-middle", className)}
      style={{ width: width === 0 ? undefined : width, height: 3 }}
    >
      <span
        className="absolute inset-x-0"
        style={{ top: 1, height: 1, background: "var(--border)" }}
      />
      <span
        className="absolute left-0"
        style={{
          top: 0.5,
          height: 2,
          width: `${Math.max(0, Math.min(100, value))}%`,
          background: t,
          opacity: 0.75,
        }}
      />
    </span>
  );
}

/**
 * The normalisation demo: two source rules of different length above a shared
 * neutral rule, with dashed lines showing each reading being projected down.
 *
 * This is the one place the product's core claim is made without prose — the
 * reader sees that the same number lands in two different places.
 */
export function ProjectionRuler({
  rows,
  height = 190,
  animate = false,
}: {
  rows: Array<{
    label: string;
    difficulty: number;
    raw: number;
    normalized: number;
    tone?: RulerTone;
  }>;
  height?: number;
  animate?: boolean;
}) {
  const rowGap = 46;
  const neutralY = rows.length * rowGap + 34;
  const total = Math.max(height, neutralY + 44);

  return (
    <div className="relative w-full" style={{ height: total }}>
      {rows.map((r, i) => {
        const frac = Math.max(0.12, r.difficulty / MAX_DIFFICULTY);
        const y = i * rowGap + 22;
        const tone = TONE_VAR[r.tone ?? "ink"];
        return (
          <div key={r.label}>
            <div
              className="ui absolute text-[10px] leading-tight"
              style={{ top: y - 15, left: 0, color: "var(--ink-600)" }}
            >
              {r.label}
              <span className="tnum ml-2" style={{ color: "var(--ink-400)" }}>
                ×{r.difficulty.toFixed(2)}
              </span>
            </div>
            <div className="absolute left-0 right-0" style={{ top: y }}>
              <Ruler
                difficulty={r.difficulty}
                height={14}
                animate={animate}
                marks={[
                  {
                    value: r.raw,
                    label: r.raw.toFixed(1),
                    tone: r.tone ?? "ink",
                    emphasis: true,
                  },
                ]}
              />
            </div>
            {/* projection: raw reading on its own rule → neutral rule */}
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
              aria-hidden
            >
              <line
                x1={`${frac * r.raw}%`}
                y1={y + 12}
                x2={`${r.normalized}%`}
                y2={neutralY - 4}
                stroke={tone}
                strokeWidth={0.9}
                strokeDasharray="3 2"
                opacity={0.7}
                className={animate ? "anim-projection" : undefined}
                style={{ ["--dash-len" as string]: "260" }}
              />
            </svg>
          </div>
        );
      })}

      <div
        className="ui absolute text-[10px]"
        style={{ top: neutralY - 15, left: 0, color: "var(--ink-800)" }}
      >
        中性尺
      </div>
      <div className="absolute left-0 right-0" style={{ top: neutralY }}>
        <Ruler
          neutral
          difficulty={null}
          height={16}
          labelBelow
          marks={rows.map(r => ({
            value: r.normalized,
            label: r.normalized.toFixed(1),
            tone: r.tone ?? "ink",
            emphasis: true,
          }))}
        />
      </div>
    </div>
  );
}
