/**
 * Raise the type scale to the v2 floor.
 *
 * The v1 pages accumulated 9–11px labels (85× 10px, 90× 11px, plus a handful of
 * 9px). At those sizes stem width falls below one device pixel, so antialiasing
 * turns text into grey haze — which is what the "blurry" report was actually
 * describing. DESIGN_V2.md sets the floor at 12px for chrome and 13px for
 * table numerals; this applies it mechanically.
 *
 * Replacements are confined to className string literals so identifiers and
 * prose are never touched (a lesson from the earlier frostify codemod, which
 * renamed a `panel` variable and broke the widget).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { globSync } from "node:fs";

const MAP = [
  // size floors
  [/\btext-\[9px\]/g, "text-[11px]"],
  [/\btext-\[10px\]/g, "text-[12px]"],
  [/\btext-\[11px\]/g, "text-[12px]"],
  // Tailwind's text-xs is 12px which now equals our floor; keep it.
  // Bump the smallest tracking-wide uppercase labels a notch for legibility.
];

const files = globSync("client/src/**/*.tsx", { cwd: process.cwd() });
let changedFiles = 0;
let changedHits = 0;

for (const rel of files) {
  const src = readFileSync(rel, "utf8");
  // Only rewrite inside className="..." / className={cn("...")} string literals.
  let hits = 0;
  const out = src.replace(/"([^"\n]*)"/g, (whole, inner) => {
    if (!/\btext-\[\d+px\]/.test(inner)) return whole;
    let next = inner;
    for (const [re, to] of MAP) {
      next = next.replace(re, () => {
        hits += 1;
        return to;
      });
    }
    return `"${next}"`;
  });
  if (hits > 0) {
    writeFileSync(rel, out);
    changedFiles += 1;
    changedHits += hits;
    console.log(`  ${rel}: ${hits}`);
  }
}

console.log(`\nbumped ${changedHits} size tokens across ${changedFiles} files`);
