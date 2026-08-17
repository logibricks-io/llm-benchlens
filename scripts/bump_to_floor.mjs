/*
 * Final sweep for the v3 type scale.
 *
 * Two floors, not one. Table body text and figures sit at 14px+, because that
 * is where the reference leaderboards put theirs (llm-stats runs its whole
 * table at 16px and leans on weight, not size, for the header). Badges, chips
 * and other scan-don't-read chrome are allowed down to 13px, which is roughly
 * where those sites land too.
 *
 * Anything still at 12px or below predates v3 and is the actual source of the
 * "blurry" complaint, so it gets lifted to the 13px chrome floor. Files already
 * handled by the earlier per-form-factor passes are skipped by virtue of having
 * nothing left to match.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { globSync } from "node:fs";

const files = globSync("client/src/**/*.tsx");
let touched = 0;
let total = 0;

for (const file of files) {
  const src = readFileSync(file, "utf8");
  let n = 0;
  const out = src.replace(/text-\[(\d+(?:\.\d+)?)px\]/g, (whole, px) => {
    if (Number(px) >= 13) return whole;
    n++;
    return "text-[13px]";
  });
  if (n > 0) {
    writeFileSync(file, out);
    console.log(`${file}: ${n}`);
    touched++;
    total += n;
  }
}
console.log(`\n${total} occurrence(s) lifted across ${touched} file(s).`);
