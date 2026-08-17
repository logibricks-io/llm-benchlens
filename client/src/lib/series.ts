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

/*
 * Vendor identity marks.
 *
 * The reference sites use real vendor logos, which would mean shipping other
 * companies' trademarks. A short monogram on the vendor's own series colour
 * gives the same at-a-glance row anchor without that, and stays legible at the
 * 18px the table can spare.
 *
 * Hand-written abbreviations only for vendors carrying enough models to be
 * recognised by them; everything else falls back to an initial. "Other" and
 * "Unknown" — together the largest group in the library at 64 models — get no
 * mark at all, since "O" and "U" would be identity theatre.
 */
const MONOGRAM: Record<string, string> = {
  openai: "OA",
  anthropic: "AN",
  alibaba: "AL",
  qwen: "QW",
  google: "GO",
  deepseek: "DS",
  xai: "xAI",
  "moonshot ai": "MS",
  meta: "ME",
  "z.ai": "Z",
  bytedance: "BD",
  minimax: "MM",
  nvidia: "NV",
  mistral: "MI",
  xiaomi: "XM",
  tencent: "TC",
  baai: "BA",
  amazon: "AM",
  cohere: "CO",
  /* Not "MS": Moonshot AI holds it, with 11 models against Microsoft's one. */
  microsoft: "MST",
  "microsoft research": "MSR",
  stepfun: "SF",
  "voyage ai": "VO",
  "thinking machines lab": "TM",
};

/** Providers with no meaningful identity to mark. */
const ANONYMOUS = new Set(["other", "unknown", ""]);

/**
 * Short identity mark for a provider, or null when the provider is a catch-all
 * bucket rather than an actual vendor.
 */
export function providerMonogram(provider: string | null | undefined): string | null {
  if (!provider) return null;
  const key = provider.trim().toLowerCase();
  if (ANONYMOUS.has(key)) return null;
  if (MONOGRAM[key]) return MONOGRAM[key];
  /* Fall back to the first two alphanumerics, so "InclusionAI" reads "In". */
  const letters = provider.replace(/[^A-Za-z0-9]/g, "");
  if (!letters) return null;
  return letters.slice(0, 2).replace(/^(.)(.)$/, (_, a: string, b: string) => a.toUpperCase() + b.toLowerCase());
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
