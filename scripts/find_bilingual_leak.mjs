/**
 * Find zh entries that still carry their English source text.
 *
 * Failure mode this catches: a translator appends the Chinese instead of
 * replacing the English, producing "指标元模型 · METRIC META-MODEL" on screen.
 * Type checking passes (still a string) and the "zh must contain Chinese" test
 * passes (it does contain Chinese), so only a rendered page reveals it.
 *
 * Heuristic: flag any zh value that contains Chinese AND a run of 4+ Latin
 * letters, then subtract the cases where mixed script is correct — product and
 * vendor names, units, metric identifiers, keyboard hints.
 */
import { en } from "../client/src/i18n/en.ts";
import { zh } from "../client/src/i18n/zh.ts";

const CJK = /[\u4e00-\u9fff]/;
const LATIN_RUN = /[A-Za-z]{4,}/;

/** Proper nouns and technical tokens that legitimately stay Latin in Chinese. */
const ALLOWED_LATIN = [
  "BenchLens", "Elo", "elo", "pass@", "SOTA", "CI", "Ctrl", "Cmd", "PWA",
  "OpenAI", "Anthropic", "Google", "DeepSeek", "Qwen", "GPT", "Claude",
  "Gemini", "Grok", "Kimi", "GLM", "MMLU", "SWE", "AIME", "ARC", "MTEB",
  "BEIR", "GAIA", "OSWorld", "Terminal", "Bench", "bench", "API", "URL",
  "JSON", "LLM", "tRPC", "iOS", "Android", "macOS",
];

function stripAllowed(s) {
  let out = s;
  for (const token of ALLOWED_LATIN) out = out.split(token).join("");
  return out;
}

const offenders = [];

function walk(enNode, zhNode, path) {
  for (const key of Object.keys(enNode)) {
    const e = enNode[key];
    const z = zhNode?.[key];
    const here = path ? `${path}.${key}` : key;
    if (typeof e === "object" && e !== null) {
      walk(e, z, here);
      continue;
    }
    if (typeof z !== "string") continue;
    if (!CJK.test(z)) continue;
    const residue = stripAllowed(z);
    if (!LATIN_RUN.test(residue)) continue;

    /* Strongest signal: the English string appears verbatim inside the Chinese. */
    const enWords = String(e).match(/[A-Za-z]{4,}/g) ?? [];
    const shared = enWords.filter(w => z.includes(w));
    offenders.push({
      key: here,
      en: String(e),
      zh: z,
      sharedWords: shared.length,
      verbatim: shared.length >= Math.max(1, Math.ceil(enWords.length * 0.6)),
    });
  }
}

walk(en, zh, "");

const likely = offenders.filter(o => o.verbatim);
const maybe = offenders.filter(o => !o.verbatim);

console.log(`likely English left in zh (${likely.length}):`);
for (const o of likely) console.log(`  ${o.key}\n    en: ${o.en}\n    zh: ${o.zh}`);
console.log(`\nmixed script, probably fine (${maybe.length}):`);
for (const o of maybe) console.log(`  ${o.key}: ${o.zh}`);
