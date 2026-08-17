/**
 * The Metric Meta-Model vocabulary and the normalization engine.
 *
 * Root problem this solves: benchmark scores are not comparable. A 60% on an
 * all-or-nothing frontier agentic benchmark and a 60% on a saturated
 * single-answer quiz describe entirely different capabilities. We make them
 * comparable by describing each benchmark structurally, then rescaling scores
 * with a difficulty coefficient derived from that structure.
 */

export type CapabilityDomain =
  | "coding" | "agentic_tool_use" | "computer_use" | "web_research"
  | "knowledge_reasoning" | "math" | "multimodal" | "professional_knowledge_work"
  | "safety_security" | "efficiency_runtime" | "embedding_retrieval" | "composite";

export type ScoringMechanism =
  | "execution_verification" | "state_assertion" | "rubric_llm_judge"
  | "human_preference_elo" | "exact_match" | "composite_index" | "pass_at_k";

export type Strictness = "all_or_nothing" | "partial_credit" | "single_answer";
export type SaturationStatus = "saturated" | "contested" | "frontier";
export type ContaminationRisk = "low" | "medium" | "high";
export type IssuerStance =
  | "first_party" | "vendor_tool" | "third_party_evaluator" | "academic" | "community";
export type ScoreForm = "percentage" | "elo" | "index" | "other";

/** ---------------------------------------------------------------------------
 * Normalization engine
 * ------------------------------------------------------------------------- */

export type NormalizableBenchmark = {
  scoreForm: string;
  difficultyCoefficient: number;
  trustScore: number;
  discriminativePower: number;
  saturationStatus: string;
};

/**
 * Elo readings live on a completely different scale from percentages. We map
 * them onto 0-100 using the human-expert anchor convention (1000 Elo = parity
 * with a human professional's one-shot deliverable), where +400 Elo is roughly
 * a 10x odds advantage. 1000 -> 50, 1400 -> ~76, 1800 -> ~90.
 */
export function eloToPercent(elo: number): number {
  const p = 1 / (1 + Math.pow(10, (1000 - elo) / 400));
  return clamp(p * 100, 0, 100);
}

export function toCommonScale(raw: number, scoreForm: string): number {
  if (scoreForm === "elo") return eloToPercent(raw);
  // Some suites report 0-1 pass rates instead of percentages.
  if (raw > 0 && raw <= 1) return raw * 100;
  return clamp(raw, 0, 100);
}

/**
 * The core transform. A raw score is first put on a common 0-100 scale, then
 * weighted by how hard the benchmark's structure makes that score to obtain.
 * The result is a "difficulty-adjusted score": what this achievement would be
 * worth on a neutral yardstick (difficultyCoefficient = 1.0).
 *
 * We deliberately compress rather than multiply linearly, so a lenient
 * benchmark cannot be discounted into meaninglessness and a brutal benchmark
 * cannot inflate past 100.
 */
export function normalizedScore(raw: number, bm: NormalizableBenchmark): number {
  const base = toCommonScale(raw, bm.scoreForm);
  const k = bm.difficultyCoefficient || 1;
  // Exponent < 1 lifts scores on hard benchmarks, > 1 damps easy ones.
  const adjusted = 100 * Math.pow(base / 100, 1 / Math.max(0.35, k));
  return round1(clamp(adjusted, 0, 100));
}

/**
 * Evidence weight of a single measurement, used when aggregating a model's
 * standing across many benchmarks. A score from a saturated, low-trust,
 * low-resolution benchmark should barely move the needle.
 */
export function evidenceWeight(bm: NormalizableBenchmark, sourceType?: string): number {
  const trust = bm.trustScore / 100;
  const disc = bm.discriminativePower / 100;
  /*
   * Provenance discount, keyed on the normalised four-value vocabulary. An
   * independent re-run outranks an official leaderboard, which outranks a
   * vendor's own number. (The earlier version keyed on "third_party" and
   * "leaderboard", values that no longer exist after the source-type merge, so
   * every row silently fell through to the 0.72 self-reported discount.)
   */
  const provenance =
    sourceType === "third_party_aggregator" || sourceType === "paper"
      ? 1
      : sourceType === "official_leaderboard"
        ? 0.9
        : 0.72;
  return round3(trust * 0.45 + disc * 0.35 + provenance * 0.2);
}

/** Freshness buckets for the staleness indicator. */
export type Freshness = "fresh" | "recent" | "aging" | "stale";

export function freshnessOf(measuredAt?: string | null, now = new Date()): Freshness {
  if (!measuredAt) return "stale";
  const t = Date.parse(measuredAt);
  if (Number.isNaN(t)) return "stale";
  const days = (now.getTime() - t) / 86_400_000;
  if (days <= 30) return "fresh";
  if (days <= 90) return "recent";
  if (days <= 240) return "aging";
  return "stale";
}

/** ---------------------------------------------------------------------------
 * Scenario decision engine
 * ------------------------------------------------------------------------- */

export type ScenarioKey =
  | "agentic_coding" | "repo_maintenance" | "computer_use_automation"
  | "deep_research" | "legal_professional" | "customer_support_agent"
  | "data_analysis" | "multimodal_document" | "security_engineering" | "frontier_reasoning";

export type ScenarioDef = {
  key: ScenarioKey;
  /** Capability domain weights; must be interpreted relatively, not absolutely. */
  domainWeights: Partial<Record<CapabilityDomain, number>>;
  /** Benchmarks that are especially diagnostic for this scenario. */
  emphasisSlugs: string[];
  /** Structural preferences: what kind of yardstick actually predicts success here. */
  prefersAgentic: boolean;
  prefersNegativeAssertions: boolean;
};

export const SCENARIOS: ScenarioDef[] = [
  {
    key: "agentic_coding",
    domainWeights: { coding: 0.5, agentic_tool_use: 0.35, computer_use: 0.15 },
    emphasisSlugs: ["terminal-bench-3-0", "swe-bench-pro", "senior-swe-bench", "deepswe", "frontiercode"],
    prefersAgentic: true,
    prefersNegativeAssertions: false,
  },
  {
    key: "repo_maintenance",
    domainWeights: { coding: 0.7, agentic_tool_use: 0.3 },
    emphasisSlugs: ["swe-bench-verified", "swe-rebench", "nl2repo-bench", "apex-swe", "cursorbench"],
    prefersAgentic: true,
    prefersNegativeAssertions: false,
  },
  {
    key: "computer_use_automation",
    domainWeights: { computer_use: 0.45, agentic_tool_use: 0.4, multimodal: 0.15 },
    emphasisSlugs: ["osworld-2-0", "automationbench", "toolathlon", "screenspot-pro"],
    prefersAgentic: true,
    prefersNegativeAssertions: true,
  },
  {
    key: "deep_research",
    domainWeights: { web_research: 0.5, knowledge_reasoning: 0.3, agentic_tool_use: 0.2 },
    emphasisSlugs: ["browsecomp", "draco", "gaia-2", "humanity-s-last-exam", "simpleqa"],
    prefersAgentic: true,
    prefersNegativeAssertions: false,
  },
  {
    key: "legal_professional",
    domainWeights: { professional_knowledge_work: 0.75, knowledge_reasoning: 0.25 },
    emphasisSlugs: ["harvey-lab", "gdpval", "aa-briefcase", "vals-ai-caselaw-v2"],
    prefersAgentic: false,
    prefersNegativeAssertions: true,
  },
  {
    key: "customer_support_agent",
    domainWeights: { agentic_tool_use: 0.7, knowledge_reasoning: 0.3 },
    emphasisSlugs: ["tau2-bench", "tau-bench", "berkeley-function-calling-leaderboard", "mcp-atlas"],
    prefersAgentic: true,
    prefersNegativeAssertions: true,
  },
  {
    key: "data_analysis",
    domainWeights: { coding: 0.35, knowledge_reasoning: 0.35, math: 0.3 },
    emphasisSlugs: ["scicode", "critpt", "charxiv", "frontiermath-2"],
    prefersAgentic: false,
    prefersNegativeAssertions: false,
  },
  {
    key: "multimodal_document",
    domainWeights: { multimodal: 0.8, knowledge_reasoning: 0.2 },
    emphasisSlugs: ["mmmu-pro", "omnidocbench", "cc-ocr-v2", "charxiv"],
    prefersAgentic: false,
    prefersNegativeAssertions: false,
  },
  {
    key: "security_engineering",
    domainWeights: { safety_security: 0.8, coding: 0.2 },
    emphasisSlugs: ["cybergym", "cybench", "agentdojo", "harmbench"],
    prefersAgentic: true,
    prefersNegativeAssertions: true,
  },
  {
    key: "frontier_reasoning",
    domainWeights: { knowledge_reasoning: 0.45, math: 0.4, composite: 0.15 },
    emphasisSlugs: ["arc-agi-2", "frontiermath-2", "critpt", "humanity-s-last-exam"],
    prefersAgentic: false,
    prefersNegativeAssertions: false,
  },
];

export function scenarioByKey(key: string): ScenarioDef | undefined {
  return SCENARIOS.find(s => s.key === key);
}

/**
 * Per-measurement weight under a scenario. Combines the scenario's domain
 * priorities, an explicit emphasis boost, structural fit (agentic /
 * guardrail-aware benchmarks predict agentic deployments better), and the
 * generic evidence weight.
 */
export function scenarioWeight(
  scenario: ScenarioDef,
  bm: NormalizableBenchmark & {
    slug: string;
    capabilityDomain: string;
    isAgentic: boolean;
    hasNegativeAssertions: boolean;
  },
  sourceType?: string,
): number {
  const domain = scenario.domainWeights[bm.capabilityDomain as CapabilityDomain] ?? 0;
  if (domain === 0 && !scenario.emphasisSlugs.includes(bm.slug)) return 0;
  let w = Math.max(domain, scenario.emphasisSlugs.includes(bm.slug) ? 0.25 : 0);
  if (scenario.emphasisSlugs.includes(bm.slug)) w *= 1.6;
  if (scenario.prefersAgentic && bm.isAgentic) w *= 1.25;
  if (scenario.prefersNegativeAssertions && bm.hasNegativeAssertions) w *= 1.2;
  return round3(w * evidenceWeight(bm, sourceType));
}

export function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}
export function round1(v: number) {
  return Math.round(v * 10) / 10;
}
export function round3(v: number) {
  return Math.round(v * 1000) / 1000;
}
