/**
 * i18n integrity. TypeScript already guarantees zh has every key en has
 * (zh is typed as Dict), but it cannot catch three runtime-ish mistakes:
 * an empty string, a Chinese pack entry left in English by accident, and
 * vocabulary keys drifting out of sync with the meta-model enums that the
 * server actually emits. Those last ones are the dangerous class: the server
 * sends a bare enum key, so a missing label renders as blank in the UI.
 */
import { describe, expect, it } from "vitest";
import { en } from "../client/src/i18n/en";
import { zh } from "../client/src/i18n/zh";
import { SCENARIOS } from "../shared/metaModel";
import type {
  CapabilityDomain,
  ContaminationRisk,
  Freshness,
  IssuerStance,
  SaturationStatus,
  ScoringMechanism,
  Strictness,
} from "../shared/metaModel";

/*
 * The enum key sets, declared once here rather than derived from the old Chinese
 * *_LABELS dictionaries in shared/metaModel.ts — those have been deleted, since
 * shipping display copy from the shared layer is what let Chinese labels leak
 * into the English UI in the first place.
 *
 * `satisfies` ties each array to its union type, so adding a member to the union
 * without listing it here is a compile error. That keeps this list honest without
 * reintroducing a label table.
 */
const CAPABILITY_KEYS = [
  "coding",
  "agentic_tool_use",
  "computer_use",
  "web_research",
  "knowledge_reasoning",
  "math",
  "multimodal",
  "professional_knowledge_work",
  "safety_security",
  "efficiency_runtime",
  "embedding_retrieval",
  "composite",
] as const satisfies readonly CapabilityDomain[];

const MECHANISM_KEYS = [
  "execution_verification",
  "state_assertion",
  "rubric_llm_judge",
  "human_preference_elo",
  "exact_match",
  "composite_index",
  "pass_at_k",
] as const satisfies readonly ScoringMechanism[];

const SATURATION_KEYS = ["saturated", "contested", "frontier"] as const satisfies readonly SaturationStatus[];

const STANCE_KEYS = [
  "first_party",
  "vendor_tool",
  "third_party_evaluator",
  "academic",
  "community",
] as const satisfies readonly IssuerStance[];

const STRICTNESS_KEYS = [
  "all_or_nothing",
  "partial_credit",
  "single_answer",
] as const satisfies readonly Strictness[];

const CONTAMINATION_KEYS = ["low", "medium", "high"] as const satisfies readonly ContaminationRisk[];

const FRESHNESS_KEYS = ["fresh", "recent", "aging", "stale"] as const satisfies readonly Freshness[];

type Leaf = { path: string; value: string };

function leaves(obj: Record<string, unknown>, prefix = ""): Leaf[] {
  const out: Leaf[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") out.push({ path, value: v });
    else if (v && typeof v === "object") out.push(...leaves(v as Record<string, unknown>, path));
  }
  return out;
}

const enLeaves = leaves(en);
const zhLeaves = leaves(zh);

describe("i18n packs", () => {
  it("have identical key sets", () => {
    const enKeys = enLeaves.map(l => l.path).sort();
    const zhKeys = zhLeaves.map(l => l.path).sort();
    expect(zhKeys).toEqual(enKeys);
  });

  it("have no empty strings", () => {
    const emptyEn = enLeaves.filter(l => l.value.trim() === "").map(l => l.path);
    const emptyZh = zhLeaves.filter(l => l.value.trim() === "").map(l => l.path);
    expect(emptyEn).toEqual([]);
    expect(emptyZh).toEqual([]);
  });

  it("carry actual Chinese in the zh pack, except for proper nouns", () => {
    /*
     * Entries that legitimately carry no Chinese: the brand, a keyboard hint,
     * section numerals used as typographic ornament, a separator glyph, and a
     * numeric range. Everything outside this list must be translated — copying
     * the English through is type-correct but ships an English UI in Chinese.
     */
    const allowLatin = new Set([
      "brand.name",
      "nav.shortcutHint",
      "mechanism.pass_at_k",
      "mechanism.rubric_llm_judge",
      "mechanism.human_preference_elo",
      "common.of",
      "sourceType.paper",
      // Section numerals in the home-page narrative ("01".."05").
      "home.demoMarker",
      "home.evidenceMarker",
      "home.doorsMarker",
      "home.decideNum",
      "home.compareNum",
      "home.benchmarksNum",
      "home.radarNum",
      // A difficulty-coefficient range, identical in both languages.
      "benchmarks.difficultyMidNote",
    ]);
    const cjk = /[\u4e00-\u9fff]/;
    const untranslated = zhLeaves
      .filter(l => !allowLatin.has(l.path))
      .filter(l => !cjk.test(l.value))
      .map(l => l.path);
    expect(untranslated).toEqual([]);
  });
});

describe("vocabulary coverage against the meta-model enums", () => {
  const cases: Array<[string, readonly string[], Record<string, string>]> = [
    ["capability", CAPABILITY_KEYS, en.capability],
    ["mechanism", MECHANISM_KEYS, en.mechanism],
    ["saturation", SATURATION_KEYS, en.saturation],
    ["stance", STANCE_KEYS, en.stance],
    ["strictness", STRICTNESS_KEYS, en.strictness],
    ["contamination", CONTAMINATION_KEYS, en.contamination],
    ["freshness", FRESHNESS_KEYS, en.freshness],
  ];

  for (const [name, enumKeysRaw, pack] of cases) {
    it(`${name}: every enum key has an entry in both packs`, () => {
      const enumKeys = [...enumKeysRaw].sort();
      expect(Object.keys(pack).sort()).toEqual(enumKeys);
      const zhPack = (zh as unknown as Record<string, Record<string, string>>)[name];
      expect(Object.keys(zhPack).sort()).toEqual(enumKeys);
    });
  }

  /*
   * Scenarios are the case that actually broke: the server used to return their
   * Chinese title and summary, so the picker rendered Chinese under an English
   * UI. It now sends only `key`, which makes a missing dictionary entry render
   * as a blank heading — hence this check.
   */
  it("scenario: every scenario key has a title and summary in both packs", () => {
    const keys = SCENARIOS.map(s => s.key).sort();
    expect(Object.keys(en.scenario).sort()).toEqual(keys);
    expect(Object.keys(en.scenarioSummary).sort()).toEqual(keys);
    expect(Object.keys(zh.scenario).sort()).toEqual(keys);
    expect(Object.keys(zh.scenarioSummary).sort()).toEqual(keys);
  });
});
