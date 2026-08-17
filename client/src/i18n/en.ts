/**
 * English is the source of truth for the key space.
 *
 * Design decision: the shared meta-model (shared/metaModel.ts) keeps exporting
 * bare enum keys ("coding", "saturated", ...) and never labels. Translation
 * happens only at the render layer, which means every API response stays
 * language-independent and cacheable, and the server never learns about locale.
 * The vocabulary dictionaries therefore live here, keyed by those same enums.
 *
 * zh.ts is typed as `typeof en`, so a missing or misspelled key is a compile
 * error rather than a runtime "undefined" leaking into the UI.
 */

export const en = {
  brand: {
    name: "BenchLens",
    tagline: "A meta-model for AI benchmarks",
  },

  nav: {
    home: "Overview",
    matrix: "Score matrix",
    benchmarks: "Benchmark library",
    models: "Model library",
    compare: "Head-to-head",
    decide: "Scenario picker",
    radar: "Release radar",
    admin: "Data ops",
    contents: "Contents",
    close: "Close",
    openContents: "Open contents",
    shortcutHint: "Ctrl K",
    theme: "Theme",
    themeDark: "Dark",
    themeLight: "Light",
    language: "Language",
    readNext: "Read next",
},

  navHint: {
    home: "Why scores are not comparable: the argument, a methodology audit, and benchmark utility",
    matrix: "The full model x benchmark comparison table",
    benchmarks: "A meta-model dossier and credibility rating for every benchmark",
    models: "Model roster ranked by evidence-weighted composite score",
    compare: "Two to four models measured item by item on the same yardstick",
    decide: "Recommended models with supporting evidence, per deployment scenario",
    radar: "Event stream of new models and new benchmarks",
    admin: "Coverage audit, stale evidence, and refresh history",
  },

  navKeywords: {
    home: "home overview argument audit",
    matrix: "table matrix grid compare",
    benchmarks: "benchmark dossier evaluation trust",
    models: "model ranking leaderboard composite",
    compare: "compare duel head to head versus",
    decide: "recommend decide scenario picker",
    radar: "release radar events timeline",
    admin: "admin data ops audit maintenance",
  },

  contents: {
    eyebrow: "Contents",
    typeToFilter: "Type to filter",
    escToExit: "Esc to exit",
    jumpTo: "Jump to...",
    noMatch: "No matching section. Press Esc to go back.",
    current: "Current",
    statBenchmarks: "Benchmarks",
    statModels: "Models",
    statEvidence: "Evidence",
    statCiDisclosure: "CI disclosed",
    switchToLight: "Switch to frost (light)",
    switchToDark: "Switch to night frost (dark)",
    switchToChinese: "Switch to Chinese",
    switchToEnglish: "Switch to English",
  },

  common: {
    loading: "Loading",
    empty: "No records",
    noPublicRecord: "No public record",
    all: "All",
    search: "Search",
    clear: "Clear",
    filters: "Filters",
    columns: "Columns",
    sortBy: "Sort by",
    of: "of",
    models: "models",
    benchmarks: "benchmarks",
    records: "records",
    score: "score",
    scores: "scores",
    evidence: "Evidence",
    source: "Source",
    measured: "Measured",
    difficulty: "Difficulty",
    trust: "Trust",
    resolution: "Resolution",
    utility: "Utility",
    composite: "Composite",
    observed: "Observed",
    normalized: "Normalized",
    raw: "Raw",
    provider: "Provider",
    price: "Price",
    outputPrice: "Output price",
    context: "Context",
    openWeights: "Open weights",
    closedWeights: "Closed",
    superseded: "Superseded",
    currentGen: "Current gen",
    reasoning: "Reasoning",
    perMillionTokens: "per 1M output tokens",
    viewSource: "View source",
    back: "Back",
    addModel: "Add model",
    searchModel: "Search models...",
    noModelFound: "No models found",
    recordsCount: "{n} records",
    noRecord: "No record",
    unlabeled: "Unlabeled",
},

  capability: {
    coding: "Coding",
    agentic_tool_use: "Agents & tools",
    computer_use: "Computer use",
    web_research: "Web research",
    knowledge_reasoning: "Knowledge & reasoning",
    math: "Mathematics",
    multimodal: "Multimodal",
    professional_knowledge_work: "Professional knowledge work",
    safety_security: "Safety & security",
    efficiency_runtime: "Efficiency & runtime",
    embedding_retrieval: "Embedding & retrieval",
    composite: "Composite index",
  },

  mechanism: {
    execution_verification: "Execution verification",
    state_assertion: "State assertion",
    rubric_llm_judge: "Rubric LLM judge",
    human_preference_elo: "Blind preference Elo",
    exact_match: "Exact match",
    composite_index: "Composite index",
    pass_at_k: "pass@k sampling",
  },

  mechanismExplain: {
    execution_verification:
      "Runs real tests or code to decide pass or fail. Lowest subjectivity, reproducible results.",
    state_assertion:
      "Checks whether the environment's final state satisfies assertions, catching the \"claimed done but didn't\" failure mode.",
    rubric_llm_judge:
      "Experts write a scoring rubric and a model judge applies it item by item. Suited to deliverables with no single right answer.",
    human_preference_elo:
      "Humans or models compare outputs pairwise in blind tests; win/loss records convert to an Elo rating.",
    exact_match:
      "Matches the reference answer exactly or by equivalence. Suited to questions with a unique solution.",
    composite_index:
      "Combines several sub-evaluations into one weighted index. Convenient for overviews, but it hides per-domain differences.",
    pass_at_k:
      "Samples each task k times and counts it as passed if any attempt succeeds. Larger k yields higher scores, so results at different k are not directly comparable — k must always be reported.",
  },

  strictness: {
    all_or_nothing: "All-or-nothing",
    partial_credit: "Partial credit",
    single_answer: "Single answer",
  },

  strictnessExplain: {
    all_or_nothing:
      "Every criterion must pass for the task to count. Catching eight of ten risks is not 80% useful — it is materially incomplete. Scores here are inherently low.",
    partial_credit:
      "Credit scales with how much was completed. Smoother scores, but they can mask failures at critical steps.",
    single_answer:
      "Independent right/wrong items summed up. The easiest to inflate, and the most exposed to training-data contamination.",
  },

  saturation: {
    saturated: "Saturated",
    contested: "Contested",
    frontier: "Frontier",
  },

  saturationExplain: {
    saturated:
      "Top models already exceed 85%; the remaining spread is mostly noise. This yardstick can barely separate models anymore.",
    contested:
      "Top models land between 40% and 85% and are steadily gaining ground. This is the most discriminating band right now.",
    frontier:
      "Top models score under 40%. The problem is far from solved, so results genuinely reflect the capability ceiling.",
  },

  contamination: {
    low: "Low contamination risk",
    medium: "Medium contamination risk",
    high: "High contamination risk",
  },

  contaminationExplain: {
    low: "Original tasks with unpublished or continuously refreshed answers, so training-data leakage is unlikely.",
    medium: "Some tasks or answers are public, so indirect learning is possible.",
    high:
      "Tasks come from openly crawlable data (GitHub PRs, past competition problems), so scores may include memorisation.",
  },

  stance: {
    first_party: "Model vendor",
    vendor_tool: "Tool vendor",
    third_party_evaluator: "Independent evaluator",
    academic: "Academic",
    community: "Community",
  },

  stanceExplain: {
    first_party:
      "Designed and published by the model vendor itself, which creates incentives for selective reporting and benchmark-directed optimisation.",
    vendor_tool:
      "Built by a tool or product company. Tasks track real product scenarios but may favour the vendor's own workflow.",
    third_party_evaluator:
      "Run by an independent evaluator that usually re-runs models rather than accepting vendor-reported numbers.",
    academic:
      "Published by a university or research institute. Methodology disclosure is the most complete, but update cadence is slower.",
    community:
      "Community-maintained. Broad coverage and fast iteration, with quality control resting on contributors.",
  },

  freshness: {
    fresh: "Within 30 days",
    recent: "Within 90 days",
    aging: "Within 8 months",
    stale: "Stale",
  },

  sourceType: {
    /* Keyed exactly as the database stores it, so `t.sourceType[row.sourceType]`
       resolves without an alias table. `self_reported` used to be spelled
       `vendor_self_reported` here, which forced a special case in SourceBadge
       and returned undefined for every other caller. */
    official_leaderboard: "Official leaderboard",
    third_party_aggregator: "Independent re-run",
    paper: "Paper",
    self_reported: "Vendor self-reported",
  },

  /* Recommendation caveats. The server sends CaveatCode values, never prose —
     it used to push finished Chinese sentences, which showed up untranslated
     under an English UI and could not be caught by scanning client source. */
  caveat: {
    all_self_reported: "All evidence is vendor self-reported; no independent re-run",
    mostly_saturated: "Most evidence comes from saturated benchmarks; limited resolution",
    mostly_stale: "Most evidence is over 8 months old",
    thin_evidence: "Thin evidence; ranking is highly uncertain",
  },

  sourceExplain: {
    official_leaderboard:
      "Recorded on a leaderboard the benchmark authors maintain themselves, with a uniform run environment. Fairly strong evidence.",
    third_party_aggregator:
      "Produced by an independent party re-running or aggregating results, unfiltered by the vendor. Strong evidence.",
    self_reported:
      "Published by the model vendor in its own release material, without an independent re-run. Selective reporting is possible.",
    paper: "An experimental result from a published paper. Method is inspectable but usually not refreshed as models update.",
  },

  freshnessExplain: {
    fresh: "Measured within 30 days; treat as currently valid.",
    recent: "Measured within 90 days; usually still usable.",
    aging: "More than 90 days old; the model or benchmark version may have moved on.",
    stale: "Over 8 months old or missing a measurement date. Cite with caution.",
  },

  metricExplain: {
    trust:
      "Trust score (0–100, effective ceiling 97): synthesised from methodology disclosure, issuer stance, open-source reproducibility, whether confidence intervals are published, and contamination risk. It measures whether the yardstick itself is trustworthy, independent of how high any model scores. The top end is asymptotically compressed — no benchmark deserves a perfect score.",
    discriminative:
      "Discriminative power (0–100, effective ceiling 97): how much model difference this benchmark can still resolve. A benchmark already pushed near its ceiling has very low resolution, and ranking gaps there are mostly noise.",
    difficulty:
      "Difficulty coefficient (0.6–2.0+): derived from strictness, saturation status, whether the task is agentic, and whether it contains negative assertions. A higher coefficient means the same percentage represents stronger real capability, and normalization scales it up accordingly.",
    utility:
      "Utility score (0–100, effective ceiling 97): trust and resolution combined, then discounted for contamination risk and evidence sufficiency. It answers whether this benchmark is worth looking at right now. A well-designed benchmark with no traceable results yet cannot be used to compare models, so its utility is markedly reduced — and the saturated benchmarks quoted most often at launch events usually score lowest.",
    normalized:
      "Normalized score: the raw score is first mapped onto a common 0–100 scale (Elo is converted against a 1000-point human-expert anchor), then non-linearly rescaled by the benchmark's difficulty coefficient to answer \"what would this result be worth on a neutral yardstick\". This is the only legitimate basis for cross-benchmark comparison.",
    composite:
      "Weighted mean of every normalized score for this model, then shrunk toward the library median (50) by evidence count: with n results the observed mean carries only n/(n+4) of the weight. That keeps a model with one or two lucky results from topping the table. The weights themselves combine benchmark trust, resolution, and provenance strength.",
    evidence:
      "How many results exist for this model, and the resulting confidence n/(n+4). Lower confidence pulls the composite further toward the median.",
  },

  /*
   * Scenario copy lives here, not in shared/metaModel.ts. The server used to
   * return `title`/`summary` inside the scenarios payload, which made the picker
   * render Chinese labels under an English UI with no way to react to a language
   * switch (the tRPC response is cached). The server now emits only the key.
   */
  scenario: {
    agentic_coding: "Agentic coding and autonomous development",
    repo_maintenance: "Legacy codebase maintenance and refactoring",
    computer_use_automation: "Computer use and process automation",
    deep_research: "Deep research and synthesis",
    legal_professional: "Legal and professional deliverables",
    customer_support_agent: "Customer support and business process agents",
    data_analysis: "Data analysis and scientific computing",
    multimodal_document: "Multimodal document understanding",
    security_engineering: "Security engineering and vulnerability research",
    frontier_reasoning: "Frontier reasoning and research capability",
  },

  scenarioSummary: {
    agentic_coding:
      "The model works autonomously through multi-step development tasks in a real repository, involving the terminal, tests, and tool calls.",
    repo_maintenance:
      "Bug fixes, migrations, and refactoring on large existing codebases, judged on verifiable execution results.",
    computer_use_automation:
      "Driving graphical interfaces or cross-system workflows. The failure mode to watch is reporting success while the world state is wrong.",
    deep_research:
      "Multi-hop retrieval, cross-verification, and long-form synthesis. Tests information location and resistance to hallucination.",
    legal_professional:
      "Deliverables that must survive professional review. All-or-nothing scoring is the norm here, so scores run structurally low.",
    customer_support_agent:
      "Completing business actions through tool calls inside policy-constrained dialogue, where prohibitions must be respected.",
    data_analysis:
      "The full path from data to conclusion, including code execution, chart interpretation, and research-grade reasoning.",
    multimodal_document:
      "Parsing documents, charts, and screenshots with complex layouts. OCR and structure recovery are the core.",
    security_engineering:
      "Vulnerability discovery and exploit chain construction, alongside assessing the model's own potential for misuse.",
    frontier_reasoning:
      "Reasoning and mathematics problems that remain unsolved, used to judge the capability ceiling rather than everyday usability.",
  },

  home: {
    metaModel: "Metric meta-model",
    /* v3 landing: answers first, argument second. The methodology narrative that
       used to open the page still exists below the fold, keyed as before. */
    heroTitle: "Which model, for what, at what cost",
    heroSub:
      "{models} models across {benchmarks} benchmarks and {scores} sourced scores. Every score is renormalised by benchmark difficulty before anything is ranked.",
    championsTitle: "Right now",
    championsNote: "Eligible models need at least {min} scores — {n} qualify.",
    champOverall: "Best overall",
    champValue: "Best value",
    champOpenWeight: "Best open weight",
    champLongContext: "Longest context",
    champBudget: "Best under ${price}/M",
    champNewest: "Newest release",
    champPerDollar: "pts per $/M out",
    champEvidence: "{n} scores",
    leaderboardTitle: "Leaderboard",
    leaderboardNote:
      "Composite score: difficulty-normalised, weighted by benchmark trust and provenance, then shrunk toward the library median by evidence count.",
    viewTable: "Table",
    viewScatter: "Quality vs cost",
    viewBars: "Bars",
    colRank: "#",
    colModel: "Model",
    colScore: "Composite",
    colEvidence: "Scores",
    colPriceOut: "Output $/M",
    colContext: "Context",
    scatterX: "Output price $/M",
    scatterY: "Composite score",
    scatterNote:
      "{n} of {total} models publish a price and carry enough evidence to place. Log axis by default — published prices span two orders of magnitude.",
    seeAll: "All {n} models",
    methodTitle: "Why these are not the published numbers",
    scoresNotComparable: "Scores",
    scoresNotComparableHighlight: "are not comparable",
    scoresNotComparableP1: "Only a handful of legal benchmarks use all-or-nothing scoring, while saturated math competitions approach perfect scores. Putting them side-by-side in the same table ",
    scoresNotComparableP1Highlight: "creates misinterpretation by design",
    scoresNotComparableP2: "BenchLens first decomposes each benchmark into a structural profile: capability domain × scoring mechanism × strictness × saturation status × issuer stance × contamination risk. It then uses the derived difficulty coefficient to non-linearly rescale the raw score.",
    includedBenchmarks: "Included benchmarks",
    frontierBenchmarks: "of which {n} remain at the frontier",
    evidenceCount: "Evidence records",
    evidenceCoverage: "Covering {b} benchmarks · {m} models · zero missing sources",
    ciDisclosure: "CI disclosure",
    ciDisclosedCount: "Only {n} publish error margins",
    ciHint: "The vast majority of benchmarks do not publish confidence intervals, meaning a 1–2 percentage point gap on a leaderboard is usually indistinguishable from noise. This is the most systemic methodological flaw in the industry.",
    saturatedBenchmarks: "Saturated benchmarks",
    saturatedNote: "Resolution nearly exhausted, ranking gaps mostly noise",
    saturatedHint: "Benchmarks where top models already score over 85%. They still appear frequently in release materials, but can barely separate models anymore.",
    demoMarker: "01",
    demoLabel: "the same reading, two rules",
    demoTitle1: "The same {n} score",
    demoTitle2: "is not the same thing",
    demoP1: "The length of the ruler is the difficulty coefficient of the benchmark. A lenient benchmark is a ",
    demoP1Highlight: "short ruler",
    demoP1Suffix: " — the same reading on it means significantly less real capability.",
    demoP2: "Normalization projects the reading onto a common neutral ruler. This is the only legitimate basis for cross-benchmark comparison.",
    evidenceMarker: "02",
    evidenceLabel: "which rules still measure",
    marginalNotes: "Marginal notes",
    mostUseful: "Highest utility",
    leastUseful: "Lowest utility",
    leastUsefulNote: "These often appear most prominently in release materials, yet are already saturated or under-disclosed — the most eye-catching numbers on a launch chart often carry the least information.",
    methodologyVitals: "Methodology vitals · Library mean",
    avgTrust: "Avg trust",
    avgDiscriminative: "Avg resolution",
    normalizationBasis: "Normalization basis: {explain}",
    freshnessStats: "Evidence freshness: {fresh} within 30 days · {recent} within 90 days · {aging} within 8 months · {stale} stale.",
    domainCoverage: "Domain coverage",
    doorsMarker: "03",
    doorsLabel: "into the data",
    matrixNum: "01 / Full comparison",
    matrixTitle: "Score matrix",
    matrixNote: "{b} benchmarks × {m} models, every cell traceable to source",
    matrixNoteFallback: "Full comparison, every cell traceable to source",
    decideNum: "02",
    decideTitle: "Scenario picker",
    decideNote: "Given a scenario and budget, outputs rankings and evidence",
    compareNum: "03",
    compareTitle: "Head-to-head",
    compareNote: "Two to four models, comparing only shared benchmarks",
    benchmarksNum: "04",
    benchmarksTitle: "Benchmark library",
    benchmarksNote: "Item-by-item meta-model dossiers and interpretation warnings",
    radarNum: "05",
    radarTitle: "Release radar",
    radarNote: "Recent frontier release events",
    trustAbbr: "T",
    discAbbr: "R",
    byDomainTitle: "Leadership by capability domain",
    byDomainNote:
      "The composite ranking above hides what usually decides a choice: the model that leads on reasoning is rarely the one that leads on coding or agentic work. A model needs at least two results inside a domain to be ranked here; the figure on the right is how many qualify.",
  },

  benchmarkDetail: {
    title: "Benchmark detail",
    notFound: "Benchmark not found",
    backToLibrary: "Back to library",
    readNextMatrixWhy: "Compare this rule side-by-side with others",
    readNextLibraryWhy: "Return to the meta-model dossier of all benchmarks",
    officialLink: "Official",
    paperLink: "Paper",
    thisRule: "This rule",
    lengthPct: "Length is {pct}% of full scale",
    difficultyHint: " (difficulty ×{diff}, max corpus strictness is ×{max})",
    currentSota: "Current SOTA",
    sotaNotOnScale: " (not on 0-100 scale, omitted from rule)",
    noPlottableScores: "The rule is drawn, but no traceable 0-100 scores fall on it yet.",
    markTitle: "Raw {raw} · Normalized {norm}",
    rulerShowsRaw: "The rule shows raw scores; see the normalized column below for cross-benchmark comparison.",
    rulerOmittedScores: " Only mutually resolvable readings are plotted; see table for the rest.",
    agenticTask: "Agentic task",
    negativeAssertions: "Negative assertions",
    openSource: "Open source reproducible",
    issuer: "Issuer",
    taskCount: "Task count",
    metricUnit: "Metric unit",
    humanBaseline: "Human baseline",
    humanBaselineHint: "Only benchmarks with an absolute human reference can answer whether models have reached professional levels. Without a baseline, scores can only be compared laterally.",
    confidenceInterval: "Confidence interval",
    notDisclosed: "Not disclosed",
    ciHint: "Without disclosed confidence intervals, a 1-2 point gap on the leaderboard cannot be distinguished from noise. Only ~13% of benchmarks publish error margins.",
    caveat: "Interpretation caveat",
    scenarioMapping: "Scenario mapping",
    scoreRecords: "Score records",
    noRecordsTitle: "No score records yet",
    noRecordsDesc: "This benchmark is in the meta-model library, but has no traceable model results yet.",
    colModel: "Model",
    openLicense: "Open",
    versionHistory: "Version history",
    noVersions: "No version records.",
    unlabeledVersion: "Unlabeled version",
    versionCount: "{n} records",
    versionCaveat: "Version number implies difficulty. Different versions of the same benchmark usually raise the difficulty ceiling deliberately, so cross-version scores are not directly comparable — putting v2.1's 88% next to v3.0's 26% is a typical misreading.",
  },

  compare: {
    title: "Head-to-head",
    subtitleEmpty: "Select 2–4 models for a head-to-head comparison",
    subtitleSelected: "{models} models · {benchmarks} comparable metrics",
    readNextDecide: "Scenario picker",
    readNextDecideWhy: "Not sure what to compare? Start with a scenario",
    readNextBenchmarks: "Benchmark library",
    readNextBenchmarksWhy: "Check the strictness and contamination risk of these yardsticks",
    noteSharedOnlyTitle: "Why default to shared metrics only?",
    noteSharedOnlyP1: "Only yardsticks measured by all selected models form a valid comparison. Mixing in one-sided records ",
    noteSharedOnlyP1Strong: "looks like a capability gap, but is actually a coverage gap.",
    noteTraceableTitle: "Every cell is traceable",
    noteTraceableP1: "Hover over any reading to see the raw score, normalized value, measurement date, and source link.",
    noteTraceableP2: "Scores without a source are not admitted to this library.",
    sharedOnly: "Shared metrics only",
    sharedOnlyTooltip: "Only metrics measured by all selected models form a true comparison. Turning this off shows all metrics, but empty cells mean no public record, not necessarily weak capability.",
    emptyStateTitle: "Add models above to start comparing",
    emptyStateDesc: "The head-to-head table only compares shared metrics, annotating every value with its source and date. Cross-metric total score differences are normalized to eliminate scale effects.",
    compositeScore: "Composite score",
    evidenceCount: "Evidence count",
    priceOutput: "Output ${price} / 1M tokens",
    metric: "Metric",
    rawScore: "Raw score",
    normalized: "Normalized",
    measuredAt: "Measured",
    source: "Source",
    noSharedMetrics: "These models have no shared metrics",
    thinIntersection:
      "models share only {n} benchmark(s) measured on all of them. Each column added shrinks the intersection, and what survives is usually a widely-reported, already-saturated yardstick. Remove a model, or turn off \"Shared metrics only\" to read the one-sided records with their coverage gaps visible.",
    noSharedMetricsDesc: "Turn off \"Shared metrics only\" to see their individual records, but note they do not form a direct comparison.",
  },

  decide: {
    title: "Scenario Decision",
    subtitle: "Rank models based on weighted benchmark evidence for specific use cases",
    readNextCompare: "Compare",
    readNextCompareWhy: "Examine candidate models side-by-side on the same scale",
    readNextBenchmarks: "Benchmarks",
    readNextBenchmarksWhy: "Verify the reliability of the metrics this scenario relies on",
    scenarioLabel: "SCENARIO",
    deploymentConstraints: "DEPLOYMENT CONSTRAINTS",
    openWeightOnly: "Open weight only",
    currentGenerationOnly: "Current generation only",
    maxOutputPrice: "Max output price",
    maxOutputPriceHint: "In USD per million output tokens. Leave empty for no limit; models with undisclosed pricing won't be excluded.",
    pricePlaceholder: "e.g. 15",
    emphasisMetrics: "Emphasis",
    noModelsMatch: "No models match current constraints",
    noModelsMatchHint: "This scenario requires at least 2 relevant benchmark evidences. Try relaxing the price limit or disabling 'Open weight only'.",
    openWeight: "Open Weight",
    superseded: "Superseded",
    fitScore: "Fit",
    weight: "Weight",
    evidenceCount: "{count} relevant evidences",
    outputPrice: "Output ${price}/M",
    fitScoreExplain: "Fit score is not an absolute capability score, but the 'normalized weighted performance on credible, unsaturated metrics relevant to this scenario'. Weights amplify key scenario metrics, agentic tasks, and benchmarks with negative assertions, and are discounted by source strength—vendor-reported data is weighted lower than third-party reproductions.",
  },

  desktop: {
    expand: "Expand",
    collapse: "Collapse",
    openWorkbench: "Open workbench",
    leaderboard: "Leaderboard",
    releases: "Releases",
    health: "Health",
    allDomains: "All domains",
    noRecordsInDomain: "No records in this domain",
    noReleaseEvents: "No release events",
    ciDisclosure: "CI disclosed",
    saturationWarning: "{saturated} benchmarks are saturated, {frontier} are at the frontier. Ranking differences on saturated benchmarks are mostly noise.",
    lowestUtility: "Lowest utility benchmarks",
    avgTrust: "Average trust",
    avgDiscriminative: "Average discriminative power",
    fresh: "fresh",
    stale: "stale",
    fullMatrix: "Full matrix",
  },

  matrix: {
    subtitle: "{models} models × {benchmarks} benchmarks · {records} records",
    visibleColumns: "Visible columns",
    sortComposite: "By composite",
    sortCoverage: "By coverage",
    sortName: "By name",
    searchPlaceholder: "Search model or provider",
    filterDomain: "Domain",
    filterSaturation: "Saturation",
    filterStance: "Issuer stance",
    filterMechanism: "Mechanism",
    filterAll: "(All)",
    noRecords: "No records match the current filters",
    noRecordsHint: "Try relaxing the domain or saturation filters",
    colModel: "Model",
    colMean: "Mean",
    meanHint: "Mean of measured benchmarks in this row, shrunk toward the library median (50) by evidence count: with n results the observed mean carries only n/(n+4) of the weight. This keeps a model with one or two lucky results from topping the table.",
    badgeSaturated: "Saturated",
    badgeOpen: "Open",
    badgeSuperseded: "Superseded",
    secondaryReading: "Secondary reading",
    benchmarkVersion: "Benchmark version",
    unmarked: "Unmarked",
    footerHint1: "The length of the short tick below the cell indicates the normalized score. A dot means the model has no traceable public record on this benchmark — absence is also information, as vendors usually only publish favorable metrics.",
    footerHint2: "Hover over any value to see the raw score, difficulty coefficient, benchmark version, measurement date, and source link.",
  },

  benchmarks: {
    sortByName: "By name",
    alphabetical: "Alphabetical",
    difficultyHard: "Strictest yardsticks",
    difficultyHardNote: "Difficulty ×1.60+",
    difficultyMid: "Moderately strict",
    difficultyMidNote: "×1.20 – ×1.60",
    difficultyLoose: "Loose yardsticks",
    difficultyLooseNote: "Under ×1.20",
    utilityHigh: "Most relevant now",
    utilityHighNote: "60+ points",
    utilityMid: "Still useful",
    utilityMidNote: "40 – 60 points",
    utilityLow: "Hard to distinguish",
    utilityLowNote: "Under 40 points",
    title: "Benchmark Library",
    subtitle: "Meta-model profiles for {filtered} / {total} benchmarks",
    readNextMatrix: "Score matrix",
    readNextMatrixWhy: "Align these yardsticks to see model readings on each",
    readNextDecide: "Scenario decision",
    readNextDecideWhy: "Pick which yardsticks to look at based on use case",
    howToRead: "How to read this page",
    howToReadP1_1: "The physical length of the ruler in the middle of each profile is its ",
    howToReadP1_2: "difficulty coefficient",
    howToReadP1_3: ", ranging 0.61–2.03 across the library. The longer the ruler, the heavier the same reading weighs.",
    howToReadP2: "The SOTA marker's position on the ruler shows how far this yardstick has currently been pushed.",
    methodologyGap: "Library methodology gap",
    methodologyGapCaption: "Proportion of benchmarks disclosing confidence intervals. For the rest, score gaps cannot be distinguished from sampling noise.",
    utilityMeaning: "Meaning of utility score",
    utilityMeaningP1_1: "It does not answer \"is this a good benchmark\", but rather ",
    utilityMeaningP1_2: "is it worth looking at right now",
    utilityMeaningP1_3: ": saturated rulers have low resolution, zero-evidence rulers cannot be compared, and both are discounted.",
    sortByUtility: "By utility",
    sortByTrust: "By trust",
    sortByDisc: "By discriminative power",
    sortByDifficulty: "By difficulty",
    sortByNameOption: "By name",
    gridView: "Grid view",
    listView: "List view",
    searchPlaceholder: "Search benchmark or issuer",
    filterDomain: "Domain",
    filterSaturation: "Saturation",
    filterStance: "Issuer stance",
    filterMechanism: "Scoring mechanism",
    clearFilters: "Clear",
    itemsCount: "items",
    noIssuer: "Unlabeled issuer",
    difficultyPrefix: "Difficulty",
    evidenceCount: "evidence",
    trustLabel: "Trust",
    discLabel: "Disc.",
    noTraceableScores: "No traceable scores",
    noCiDisclosed: "No CI disclosed",
    utilityLabel: "Utility",
    thBenchmark: "Benchmark",
    thDomain: "Domain",
    thMechanism: "Mechanism / Strictness",
    thStatus: "Status",
    thUtility: "Utility",
    thEvidence: "Evidence",
    evidenceHint: "Number of traceable scores collected under this benchmark. When 0, it cannot be used to compare models, and the utility score is discounted accordingly.",
    thTrust: "Trust",
    thDisc: "Disc.",
    thDifficulty: "Difficulty",
    allSuffix: " (All)",
  },

  models: {
    subtitle: "{filtered} / {total} models · Composite score weighted by evidence",
    readNextCompare: "Select two or three models for a head-to-head comparison",
    readNextMatrix: "Inspect the source and date of every single reading",
    noteCompositeTitle: "Why composite is not a simple average",
    noteCompositeP1Prefix: "The observed mean shrinks toward the library median based on evidence count: with n results, the observed mean carries only ",
    noteCompositeP1Suffix: " of the weight.",
    noteCompositeP2Prefix: "This prevents a model with one or two lucky results from topping the table — ",
    noteCompositeP2Strong: "sparse evidence is itself a form of uncertainty.",
    noteBlankTitle: "What blank cells mean",
    noteBlankP1Prefix: "A blank cell does not mean weak capability, it only means ",
    noteBlankP1Suffix: ". This library rejects scores without a traceable source.",
    sortComposite: "By composite score",
    sortCoverage: "By evidence count",
    sortPrice: "By output price",
    sortName: "By name",
    searchPlaceholder: "Search model or provider",
    providerAll: "Provider (All)",
    licensePlaceholder: "Weights",
    licenseAll: "Weights (All)",
    statusPlaceholder: "Generation",
    statusAll: "Generation (All)",
    colModel: "Model",
    colCoverage: "Capability coverage",
    confidenceTooltip: "Confidence {n}%",
    compareAction: "Compare",
    markForCompare: "Select for comparison",
    markedCount: "selected",
    compareMarked: "Compare selected",
  },

  admin: {
    title: "Data Operations",
    subtitle: "Coverage audit, stale evidence, and refresh logs",
    auth: {
      title: "Maintainers Only",
      desc: "Data refreshes rewrite the freshness state of the entire database, so this page is restricted to administrators. Browsing and comparison features do not require login.",
      login: "Log in",
      noAccess: "Current account {name} lacks administrator privileges",
      back: "Back to Overview →",
    },
    actions: {
      refreshAll: "Refresh All",
      refreshed: "Refreshed {n} records",
    },
    tiles: {
      coverage: "Benchmark Coverage",
      coverageNote: "{covered} / {total} benchmarks have scores",
      scores: "Score Records",
      scoresNote: "Every record includes a provenance link",
      missingProv: "Missing Provenance",
      missingProvZero: "Load script strictly rejects unprovenanced records",
      missingProvNeed: "Needs backfilling",
      ci: "CI Disclosure",
      ciNote: "Upstream methodology flaw, cannot be patched here",
    },
    source: {
      title: "Evidence Source Composition",
      desc: "Official leaderboards and papers carry higher evidence strength than vendor self-reports and third-party aggregators. The normalization engine weights by source strength when synthesizing composite scores, so this composition directly impacts rankings.",
      github: "Code Repository",
      vendor_blog: "Vendor Blog",
    },
    audit: {
      title: "Scheduled Audit",
      desc: "The Heartbeat cron job POSTs to /api/scheduled/auditData, recalculating coverage, evidence freshness distribution, and provenance completeness, writing the results to the refresh logs above. Requires a maintainer to create the cron job after site deployment.",
      philosophy1: "Automation only covers the 'checkup', not the 'collection'. The cron job continuously measures the health of the data foundation, letting stale data and gaps surface naturally;",
      philosophy2: "but scraping third-party leaderboards, resolving model aliases, and recalculating meta-model derivatives cannot be safely crammed into a two-minute stateless call—",
      philosophy3: "more importantly, silently importing unverified numbers would destroy the single non-negotiable premise of this system:",
      philosophy4: "Every single score must be traceable to a real source.",
      philosophy5: "Therefore, new scores are still loaded by maintainers explicitly running collection scripts and verifying them.",
    },
    gaps: {
      title: "Benchmarks to Backfill",
      allCovered: "Every benchmark has at least four score records.",
      uncovered: "No scores ({n}) — Meta-model profile created, but no traceable model scores found yet",
      thin: "Thin sample ({n}) — Fewer than four scores, ranking lacks statistical significance",
    },
    logs: {
      title: "Refresh Logs",
      desc: "Every verification leaves a trace: who triggered it, scope, and rows touched. Refreshes only update the 'last verified time', not the scores themselves—scores can only be recollected from original sources via load scripts.",
      empty: "No refresh logs yet.",
      rows: "{n} rows",
    },
    stale: {
      title: "Stalest Evidence",
      desc: "Sorted ascending by measurement time. Stale evidence doesn't mean it's wrong, but when a leaderboard has been updated several times, the reference value of these scores drops significantly.",
      empty: "No stale or aging records.",
      columns: {
        benchmark: "Benchmark",
        model: "Model",
        measuredAt: "Measured At",
        source: "Source",
      },
      unmarked: "Unmarked",
      sourceLink: "Source",
    },
  },

  mobile: {
    browse: "Browse",
    desktopVersion: "Desktop version",
    offlineWarning: "Offline · Showing last loaded scores. Sources and timestamps remain valid.",
    dataFoundation: "Data foundation",
    ciWarning: "Only {ci}% of benchmarks disclose confidence intervals, and {sat} are saturated. Small ranking gaps are often indistinguishable from noise.",
    searchBenchmarks: "Search benchmarks",
    trustShort: "Trust",
    discShort: "Disc.",
    searchModels: "Search models or providers",
    openWeightsOnly: "Open weights only",
    evidenceCount: "{n} evidence",
    noIssuer: "No issuer",
    difficultyMultiplier: "Difficulty ×{n}",
    noCi: "No CI",
    whatItMeasures: "What it measures",
    interpretationCaveat: "Interpretation caveat",
    scoreRecords: "Score records",
    modelA: "Model A",
    modelB: "Model B",
    duelEmptyState: "Select two models to swipe through their gaps on shared benchmarks.",
    noSharedBenchmarks: "No shared benchmarks",
    tryAnotherPair: "Try another pair.",
    nextItem: "Next item",
    duelHint: "Swipe left/right to flip through benchmarks. Bar length is normalized score, raw score in parentheses. Only shared benchmarks are shown — missing data is not a comparison.",
    modelLabel: "Model {label}",
    pleaseSelect: "Please select",
  },

  radar: {
    subtitle: "Event stream of new models and benchmarks, reverse chronological",
    readNextModelsWhy: "Check composite scores and evidence volume for these new models",
    readNextBenchmarksWhy: "New benchmarks are often more noteworthy than new models",
    noteLabel: "Release date ≠ comparability",
    noteText1: "New models often debut with single-digit evidence counts, pulling their composite score toward the median. ",
    noteText2: "Look at evidence volume first, then the score.",
    emptyFeed: "No release events",
  },

  trustScatter: {
    title: "Trust × Discriminative Power",
    hint: "X-axis is discriminative power (ability to distinguish models), Y-axis is trust (reliability of the benchmark itself). Top-right quadrant contains benchmarks worth citing; bottom-left contains noisy, saturated benchmarks that still appear in launch decks.",
    quadrantGood: "Trusted · Discriminative",
    quadrantBad: "Low Trust · Saturated",
    tooltipTrust: "Trust",
    tooltipDiscriminative: "Discriminative",
    tooltipUtility: "Utility",
    axisDiscriminative: "Discriminative Power →",
    axisTrust: "↑ Trust",
    legendSize: "Dot size ∝ Utility score",
  },

  notFound: {
    whyHome: "Why these scores are not directly comparable",
    whyBenchmarks: "The strictness and credibility of each of the 95 yardsticks",
    whyMatrix: "The full model × benchmark comparison",
    title: "This page is not in this publication",
    p1: "The address might be misspelled, or it points to a benchmark that has been renamed.",
    p2: "Benchmark detail page addresses change with methodology revisions, and old links are not guaranteed to remain valid.",
    elsewhere: "Elsewhere",
    shortcutHintPrefix: "You can also press",
    shortcutHintSuffix: "to open the contents and jump directly.",
  },

  installPrompt: {
    install: "Install",
    addToHomeScreen: "Add to Home Screen",
    offlineDesc: "Runs full-screen after installation. View previously loaded scores and sources offline.",
    safariStep1: "Tap",
    safariStep2: "Share in Safari, then select \"Add to Home Screen\".",
    closeAria: "Close install prompt",
  },

  ruler: {
    neutralRuler: "Neutral Ruler",
  },

  spread: {
    title: "Score spread",
    note: "Every result for this benchmark on one 0–100 axis, coloured by provider. The width of the cluster is the benchmark's remaining ability to tell models apart.",
    modelsWithin: "models within",
    pointsOf: "points —",
    compressed: "the field no longer separates on this ruler",
  },

  modelDetail: {
    eyebrow: "Model dossier",
    backToLibrary: "Model library",
    composite: "Composite",
    coverage: "Evidence",
    confidence: "Confidence",
    inputPrice: "Input $/M",
    outputPrice: "Output $/M",
    context: "Context",
    released: "Released",
    license: "Weights",
    status: "Generation",
    profileTitle: "Capability profile",
    profileNote:
      "One bar per capability domain, each an evidence-weighted mean of that domain's normalized scores. Domains with fewer than three results are marked thin — the score is real but the interval around it is wide.",
    thin: "thin",
    bestIn: "best on",
    peersTitle: "Nearest alternatives",
    peersNote:
      "Closest composite scores, capped at one model per provider. Same-lab variants cluster tightly and answer a different question than \"what else could I use\".",
    peerGap: "gap",
    scoresTitle: "All evidence",
    scoresNote: "Every score with its benchmark, difficulty coefficient, provenance, and measurement date.",
    colBenchmark: "Benchmark",
    colDomain: "Domain",
    colRaw: "Raw",
    colNormalized: "Normalized",
    colDifficulty: "Difficulty",
    colSource: "Source",
    colMeasured: "Measured",
    noScores: "No traceable results for this model yet.",
    commercialNote: "Pricing note",
    priceUnavailable: "No public USD pricing",
    compareWith: "Compare",
    notFound: "No model with this identifier is in the library.",
  },
};

/**
 * Note the absence of `as const`. With it, every value narrows to its own
 * literal type ("Paper"), and zh.ts then fails to typecheck because "论文" is
 * not assignable to "Paper". We want the *shape* to be enforced, not the
 * English wording, so values stay widened to `string`.
 */
export type Dict = typeof en;
