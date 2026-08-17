/**
 * Delete the Chinese display dictionaries from shared/metaModel.ts.
 *
 * They are the root cause of the leak this pass fixed: because labels lived in
 * the shared layer, it was trivially easy for a router to serialise one into an
 * API response (which `meta.scenarios` did), at which point the UI language was
 * decided by the server and frozen in the tRPC cache. With the dictionaries gone
 * the mistake becomes unrepresentable — the shared layer only knows enum keys.
 *
 * Scenario `title` / `summary` fields go too: their copy now lives in the client
 * packs under `scenario.*` / `scenarioSummary.*`, keyed by scenario key.
 */
import { readFileSync, writeFileSync } from "node:fs";

const FILE = "shared/metaModel.ts";
const DROP_CONSTS = [
  "CAPABILITY_LABELS",
  "MECHANISM_LABELS",
  "MECHANISM_EXPLAIN",
  "STRICTNESS_LABELS",
  "STRICTNESS_EXPLAIN",
  "SATURATION_LABELS",
  "SATURATION_EXPLAIN",
  "CONTAMINATION_LABELS",
  "CONTAMINATION_EXPLAIN",
  "STANCE_LABELS",
  "STANCE_EXPLAIN",
  "FRESHNESS_LABELS",
];

const src = readFileSync(FILE, "utf8");
const lines = src.split("\n");
const out = [];
let i = 0;
let dropped = [];

while (i < lines.length) {
  const line = lines[i];
  const m = line.match(/^export const ([A-Z_]+)(?::|\s*=)/);
  if (m && DROP_CONSTS.includes(m[1])) {
    // Consume until the object literal closes at column 0.
    let depth = 0;
    let started = false;
    while (i < lines.length) {
      depth += (lines[i].match(/\{/g) || []).length;
      depth -= (lines[i].match(/\}/g) || []).length;
      if (depth > 0) started = true;
      i += 1;
      if (started && depth === 0) break;
    }
    dropped.push(m[1]);
    // Also swallow one blank line left behind.
    if (lines[i] !== undefined && lines[i].trim() === "") i += 1;
    continue;
  }
  out.push(line);
  i += 1;
}

let result = out.join("\n");

// Drop the now-unused copy fields from ScenarioDef and every scenario literal.
result = result
  .replace(/^\s*title: string;\n/m, "")
  .replace(/^\s*summary: string;\n/m, "")
  .replace(/^\s*title: "[^"]*",\n/gm, "")
  .replace(/^\s*summary: "[^"]*",\n/gm, "");

writeFileSync(FILE, result);
console.log(`dropped: ${dropped.join(", ")}`);
console.log(`${src.split("\n").length} -> ${result.split("\n").length} lines`);
