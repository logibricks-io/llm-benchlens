/**
 * Provider -> series colour assignment.
 *
 * The reference sites all let a reader track one vendor across table, bars and
 * scatter by colour alone. That only works if the mapping is stable: the same
 * provider must get the same hue on every page and after every re-sort, so it
 * cannot be derived from row index.
 *
 * Major providers are pinned by hand (largest evidence share first, so the most
 * frequently seen vendors get the most distinguishable hues). Everything else
 * hashes into the remaining slots deterministically.
 */

export const SERIES_COUNT = 7;

/** CSS custom property name for a series slot, 1-indexed. */
export function seriesVar(slot: number): string {
  const n = ((slot - 1) % SERIES_COUNT) + 1;
  return `var(--series-${n})`;
}

/** Providers pinned to a slot. Keys are compared case-insensitively. */
const PINNED: Record<string, number> = {
  anthropic: 1, // blue
  openai: 3, // teal
  google: 4, // amber
  deepseek: 5, // violet
  alibaba: 6, // green
  "moonshot ai": 2, // coral
  meta: 7, // slate
};

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Stable 1..7 slot for a provider name. */
export function providerSlot(provider: string | null | undefined): number {
  if (!provider) return SERIES_COUNT; // slate for unknown
  const key = provider.trim().toLowerCase();
  if (PINNED[key] !== undefined) return PINNED[key];
  return (hash(key) % SERIES_COUNT) + 1;
}

/** Stable CSS colour for a provider. */
export function providerColor(provider: string | null | undefined): string {
  return seriesVar(providerSlot(provider));
}

/**
 * Format a USD-per-million-tokens price the way spec sheets do: no trailing
 * zeroes on whole dollars, two decimals under $1.
 */
export function formatPrice(v: number | string | null | undefined): string | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n < 1) return `$${n.toFixed(2)}`;
  if (Number.isInteger(n)) return `$${n}`;
  return `$${n.toFixed(2).replace(/0$/, "")}`;
}
