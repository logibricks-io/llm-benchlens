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

export const CAPABILITY_LABELS: Record<CapabilityDomain, string> = {
  coding: "编码工程",
  agentic_tool_use: "智能体与工具",
  computer_use: "计算机操作",
  web_research: "网络研究",
  knowledge_reasoning: "知识与推理",
  math: "数学",
  multimodal: "多模态",
  professional_knowledge_work: "专业知识工作",
  safety_security: "安全",
  efficiency_runtime: "效率与运行时",
  embedding_retrieval: "向量与检索",
  composite: "综合指数",
};

export const MECHANISM_LABELS: Record<ScoringMechanism, string> = {
  execution_verification: "执行验证",
  state_assertion: "状态断言",
  rubric_llm_judge: "Rubric 评委",
  human_preference_elo: "盲评对战 Elo",
  exact_match: "精确匹配",
  composite_index: "复合指数",
  pass_at_k: "pass@k 采样",
};

export const MECHANISM_EXPLAIN: Record<ScoringMechanism, string> = {
  execution_verification: "运行真实测试或代码来判定通过与否，主观性最低，结果可复现。",
  state_assertion: "任务结束后检查环境的最终状态是否符合断言，能捕捉「说做了但没做」的失败。",
  rubric_llm_judge: "由专家编写评分细则，再交由模型评委逐条判定，适合无唯一答案的专业交付物。",
  human_preference_elo: "人类或模型在盲评中两两对比，胜负关系换算为 Elo 等级分。",
  exact_match: "与标准答案精确匹配或等价判定，适合有唯一解的题目。",
  composite_index: "把多个子评测按权重合成一个指数，便于概览但会掩盖分项差异。",
  pass_at_k:
    "每题采样 k 次，只要有一次通过即算通过。k 越大分数越高，因此不同 k 值的成绩不可直接比较——报告时必须写明 k。",
};

export const STRICTNESS_LABELS: Record<Strictness, string> = {
  all_or_nothing: "全通过制",
  partial_credit: "部分给分",
  single_answer: "单题判定",
};

export const STRICTNESS_EXPLAIN: Record<Strictness, string> = {
  all_or_nothing: "所有判据必须全部通过才算完成，识别出十个风险中的八个不算 80% 有用，而算实质性不完整。这类分数天然偏低。",
  partial_credit: "按完成比例给分，分数更平滑，但可能掩盖关键步骤的失败。",
  single_answer: "单题对错累加，最容易被刷高，也最容易被训练数据污染。",
};

export const SATURATION_LABELS: Record<SaturationStatus, string> = {
  saturated: "已饱和",
  contested: "争夺中",
  frontier: "前沿未解",
};

export const SATURATION_EXPLAIN: Record<SaturationStatus, string> = {
  saturated: "顶级模型已超过 85%，剩余差距多为噪声，这把尺子几乎无法再区分模型。",
  contested: "顶级模型在 40%–85% 之间，正在被逐步攻克，是当前最有区分度的区间。",
  frontier: "顶级模型不足 40%，问题远未解决，能真实反映能力上限。",
};

export const CONTAMINATION_LABELS: Record<ContaminationRisk, string> = {
  low: "低污染风险",
  medium: "中等污染风险",
  high: "高污染风险",
};

export const CONTAMINATION_EXPLAIN: Record<ContaminationRisk, string> = {
  low: "任务原创、答案不公开或持续更新，训练数据泄漏的可能性较小。",
  medium: "部分任务或答案已公开，存在被间接学习的可能。",
  high: "任务来自可公开爬取的数据（如 GitHub PR、历年竞赛题），分数可能包含记忆成分。",
};

export const STANCE_LABELS: Record<IssuerStance, string> = {
  first_party: "模型厂商自建",
  vendor_tool: "工具厂商",
  third_party_evaluator: "第三方评测机构",
  academic: "学术机构",
  community: "社区共建",
};

export const STANCE_EXPLAIN: Record<IssuerStance, string> = {
  first_party: "由模型厂商自己设计并公布，存在选择性报告与向评测优化的动机。",
  vendor_tool: "由工具或产品公司建设，任务贴近真实产品场景，但可能偏向自家工作流。",
  third_party_evaluator: "由独立评测机构运行，通常自行复跑而非采信厂商自报数据。",
  academic: "由大学或研究机构发布，方法学披露最完整，但更新节奏较慢。",
  community: "社区共建维护，覆盖广、迭代快，质量控制依赖贡献者。",
};

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

export const FRESHNESS_LABELS: Record<Freshness, string> = {
  fresh: "30 天内",
  recent: "90 天内",
  aging: "8 个月内",
  stale: "陈旧",
};

/** ---------------------------------------------------------------------------
 * Scenario decision engine
 * ------------------------------------------------------------------------- */

export type ScenarioKey =
  | "agentic_coding" | "repo_maintenance" | "computer_use_automation"
  | "deep_research" | "legal_professional" | "customer_support_agent"
  | "data_analysis" | "multimodal_document" | "security_engineering" | "frontier_reasoning";

export type ScenarioDef = {
  key: ScenarioKey;
  title: string;
  summary: string;
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
    title: "智能体编码与自主开发",
    summary: "让模型在真实仓库中自主完成多步开发任务，涉及终端、测试与工具调用。",
    domainWeights: { coding: 0.5, agentic_tool_use: 0.35, computer_use: 0.15 },
    emphasisSlugs: ["terminal-bench-3-0", "swe-bench-pro", "senior-swe-bench", "deepswe", "frontiercode"],
    prefersAgentic: true,
    prefersNegativeAssertions: false,
  },
  {
    key: "repo_maintenance",
    title: "存量代码库维护与重构",
    summary: "在既有大型代码库上做缺陷修复、迁移与重构，看重可验证的执行结果。",
    domainWeights: { coding: 0.7, agentic_tool_use: 0.3 },
    emphasisSlugs: ["swe-bench-verified", "swe-rebench", "nl2repo-bench", "apex-swe", "cursorbench"],
    prefersAgentic: true,
    prefersNegativeAssertions: false,
  },
  {
    key: "computer_use_automation",
    title: "计算机操作与流程自动化",
    summary: "驱动图形界面或跨系统工作流，风险点在于「报告完成但世界状态是错的」。",
    domainWeights: { computer_use: 0.45, agentic_tool_use: 0.4, multimodal: 0.15 },
    emphasisSlugs: ["osworld-2-0", "automationbench", "toolathlon", "screenspot-pro"],
    prefersAgentic: true,
    prefersNegativeAssertions: true,
  },
  {
    key: "deep_research",
    title: "深度检索与研究综述",
    summary: "多跳检索、交叉验证与长文综述，考察信息定位与抗幻觉能力。",
    domainWeights: { web_research: 0.5, knowledge_reasoning: 0.3, agentic_tool_use: 0.2 },
    emphasisSlugs: ["browsecomp", "draco", "gaia-2", "humanity-s-last-exam", "simpleqa"],
    prefersAgentic: true,
    prefersNegativeAssertions: false,
  },
  {
    key: "legal_professional",
    title: "法律与专业知识交付",
    summary: "输出需要经得起专业审阅的交付物，全通过评分是常态，分数天然偏低。",
    domainWeights: { professional_knowledge_work: 0.75, knowledge_reasoning: 0.25 },
    emphasisSlugs: ["harvey-lab", "gdpval", "aa-briefcase", "vals-ai-caselaw-v2"],
    prefersAgentic: false,
    prefersNegativeAssertions: true,
  },
  {
    key: "customer_support_agent",
    title: "客服与业务流程智能体",
    summary: "在有政策约束的对话中调用工具完成业务动作，必须遵守禁止性规则。",
    domainWeights: { agentic_tool_use: 0.7, knowledge_reasoning: 0.3 },
    emphasisSlugs: ["tau2-bench", "tau-bench", "berkeley-function-calling-leaderboard", "mcp-atlas"],
    prefersAgentic: true,
    prefersNegativeAssertions: true,
  },
  {
    key: "data_analysis",
    title: "数据分析与科学计算",
    summary: "从数据到结论的完整链路，含代码执行、图表解读与科研级推理。",
    domainWeights: { coding: 0.35, knowledge_reasoning: 0.35, math: 0.3 },
    emphasisSlugs: ["scicode", "critpt", "charxiv", "frontiermath-2"],
    prefersAgentic: false,
    prefersNegativeAssertions: false,
  },
  {
    key: "multimodal_document",
    title: "多模态文档理解",
    summary: "解析版式复杂的文档、图表与截图，OCR 与结构还原是核心。",
    domainWeights: { multimodal: 0.8, knowledge_reasoning: 0.2 },
    emphasisSlugs: ["mmmu-pro", "omnidocbench", "cc-ocr-v2", "charxiv"],
    prefersAgentic: false,
    prefersNegativeAssertions: false,
  },
  {
    key: "security_engineering",
    title: "安全工程与漏洞研究",
    summary: "漏洞发现与利用链构造，同时需要评估模型自身的被滥用风险。",
    domainWeights: { safety_security: 0.8, coding: 0.2 },
    emphasisSlugs: ["cybergym", "cybench", "agentdojo", "harmbench"],
    prefersAgentic: true,
    prefersNegativeAssertions: true,
  },
  {
    key: "frontier_reasoning",
    title: "前沿推理与研究能力",
    summary: "面向尚未被攻克的推理与数学问题，用于判断能力上限而非日常可用性。",
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
