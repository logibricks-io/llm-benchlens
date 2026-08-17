import { providerColor, providerMonogram } from "@/lib/series";

/**
 * A number that is also its own bar chart.
 *
 * Every reference leaderboard does this: the headline score column carries a
 * proportional fill behind the numeral, so a reader gets rank, magnitude and
 * exact value in one glance without a separate chart. The fill is the reason the
 * tables feel alive — not animation.
 *
 * The fill is deliberately low-alpha and sits behind ink-900 text, so the numeral
 * keeps its 15:1 contrast regardless of bar width.
 */
export function ScoreBar({
  value,
  max = 100,
  provider,
  width,
  decimals = 1,
  delay = 0,
  suffix,
}: {
  value: number | null | undefined;
  max?: number;
  /** Colours the fill by vendor so one model is trackable across views. */
  provider?: string | null;
  /** Fixed px width. Omit to fill the available column width. */
  width?: number;
  decimals?: number;
  /** Stagger index for the entrance animation, in rows. */
  delay?: number;
  suffix?: string;
}) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return <span className="text-ink-400 tnum text-[14px]">—</span>;
  }
  const v = Number(value);
  const pct = Math.max(0, Math.min(100, (v / max) * 100));
  const tint = provider ? providerColor(provider) : "var(--series-1)";

  return (
    <div className="flex items-center gap-2.5">
      <span className="tnum w-[42px] shrink-0 text-right text-[14px] text-ink-900 tabular-nums">
        {v.toFixed(decimals)}
        {suffix ? <span className="text-ink-500">{suffix}</span> : null}
      </span>
      <div
        className={`relative h-[7px] overflow-hidden rounded-full ${width ? "shrink-0" : "min-w-[80px] flex-1"}`}
        style={{ width, background: "var(--bar-track)" }}
        aria-hidden="true"
      >
        <div
          className="anim-bar absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${pct}%`,
            background: tint,
            opacity: 0.85,
            animationDelay: `${Math.min(delay, 20) * 22}ms`,
          }}
        />
      </div>
    </div>
  );
}

/**
 * Rank number. The references put a plain ordinal in the first column, which is
 * what makes a table read as a *ranking* rather than a list; medals for the top
 * three would be decoration, so the distinction here is weight only.
 */
export function Rank({ n }: { n: number }) {
  return (
    <span
      className={`tnum tabular-nums ${n <= 3 ? "text-ink-950 font-semibold" : "text-ink-500"}`}
      style={{ fontSize: n <= 3 ? 15 : 14 }}
    >
      {n}
    </span>
  );
}

/** A dot in the provider's colour, used to key rows to the scatter plot. */
export function ProviderDot({ provider }: { provider?: string | null }) {
  return (
    <span
      className="inline-block size-[7px] shrink-0 rounded-full"
      style={{ background: providerColor(provider) }}
      aria-hidden="true"
    />
  );
}

/**
 * Vendor identity mark: a monogram tile in the vendor's series colour.
 *
 * A stronger row anchor than the dot — the eye can find "all the Anthropic rows"
 * by shape as well as hue, which matters in the light theme where several series
 * colours sit at similar lightness. Falls back to the dot for catch-all buckets
 * ("Other", "Unknown"), where a letter would imply an identity that isn't there.
 */
export function ProviderMark({
  provider,
  size = 18,
}: {
  provider?: string | null;
  size?: number;
}) {
  const mark = providerMonogram(provider);
  const tint = providerColor(provider);
  if (!mark) return <ProviderDot provider={provider} />;
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-[3px] font-semibold"
      style={{
        width: size,
        height: size,
        fontSize: mark.length > 2 ? size * 0.42 : size * 0.48,
        letterSpacing: "-0.01em",
        color: tint,
        background: `color-mix(in oklch, ${tint} 16%, transparent)`,
        border: `1px solid color-mix(in oklch, ${tint} 34%, transparent)`,
      }}
      title={provider ?? undefined}
    >
      {mark}
    </span>
  );
}
