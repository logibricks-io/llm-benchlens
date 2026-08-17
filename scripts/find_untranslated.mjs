/**
 * Find Chinese text that is still user-visible.
 *
 * `count_cjk.mjs` counts every CJK line, which over-reports: Chinese inside a
 * code comment is documentation and perfectly fine to keep. What matters is
 * Chinese that can reach the screen — JSX text nodes, string literals passed as
 * props, `title`/`placeholder`/`aria-label` values, toast arguments.
 *
 * Heuristic: strip comments first, then report any remaining CJK line. It is
 * intentionally noisy in the safe direction — a false positive costs a glance,
 * a false negative ships untranslated UI.
 */
import { readFileSync, globSync } from "node:fs";

const CJK = /[\u4e00-\u9fff]/;

const files = globSync(["client/src/**/*.{ts,tsx}", "shared/**/*.ts"], { cwd: process.cwd() })
  .filter(f => !f.includes("/components/ui/"))
  .filter(f => !f.includes("/_core/"))
  .filter(f => !f.includes("/i18n/")); // the dictionaries are supposed to be Chinese

function stripComments(src) {
  // Block comments first, then line comments, then JSX comments.
  return src
    .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, " "))
    .split("\n")
    .map(line => {
      const idx = line.indexOf("//");
      if (idx === -1) return line;
      // Avoid mangling URLs like https://
      if (idx > 0 && line[idx - 1] === ":") return line;
      return line.slice(0, idx);
    })
    .join("\n");
}

let total = 0;
for (const f of files) {
  const raw = readFileSync(f, "utf8");
  const stripped = stripComments(raw);
  const hits = [];
  stripped.split("\n").forEach((line, i) => {
    if (CJK.test(line)) hits.push([i + 1, line.trim()]);
  });
  if (hits.length) {
    console.log(`\n${f}  (${hits.length})`);
    for (const [n, text] of hits) {
      console.log(`  ${String(n).padStart(4)}  ${text.slice(0, 120)}`);
    }
    total += hits.length;
  }
}

console.log(`\n${total} user-visible CJK line(s) remaining`);
