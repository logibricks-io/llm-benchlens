/**
 * Render a raw token count the way vendors write it on their spec sheets.
 *
 * Two failed attempts are worth recording, because both looked reasonable:
 *
 *   1. Always divide by 1000 -> 262144 became "262.144K". Ugly, off-source.
 *   2. Use whichever base divides evenly -> 128000/1024 = 125 divides evenly,
 *      so DeepSeek's documented "128K" became "125K" for eight models.
 *   3. Whitelist "figures vendors publish" -> 256000/1024 = 250 and 250 is also
 *      a plausible figure, so it became "250K" instead of "256K". Whenever two
 *      candidate quotients both look plausible, evaluation order decides the
 *      answer, which is not a rule at all.
 *
 * The rule that has no ambiguity: a token count that is an exact power of two
 * was labelled in binary by its vendor, so divide by 1024. Everything else was
 * labelled in decimal, so divide by 1000. Both 262144 and 256000 then render
 * "256K", which is correct — vendors do print the same label for both.
 */
function isPowerOfTwo(n: number): boolean {
  return n > 0 && Number.isInteger(n) && (n & (n - 1)) === 0;
}

export function formatContextWindow(tokens: number | null | undefined): string | null {
  if (tokens === null || tokens === undefined) return null;
  const n = Number(tokens);
  if (!Number.isFinite(n) || n <= 0) return null;

  // 204800 = 200 x 1024: not a power of two, but MiniMax documents it as 200K,
  // and 204800/1000 = 204.8 would be wrong. Treat exact multiples of 1024 whose
  // quotient is a whole number under 1024 as binary too.
  const binary = isPowerOfTwo(n) || (n % 1024 === 0 && n / 1024 < 1024 && !Number.isInteger(n / 1000));

  const mulM = binary ? 1024 * 1024 : 1_000_000;
  const mulK = binary ? 1024 : 1000;

  if (n >= mulM) {
    return `${Math.round((n / mulM) * 100) / 100}M`;
  }
  if (n >= mulK) {
    return `${Math.round((n / mulK) * 100) / 100}K`;
  }
  return String(n);
}
