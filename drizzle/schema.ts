import { boolean, decimal, index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * The Metric Meta-Model. This is the core table of BenchLens: it describes each
 * benchmark structurally so that heterogeneous scores become comparable.
 */
export const benchmarks = mysqlTable(
  "benchmarks",
  {
    id: int("id").autoincrement().primaryKey(),
    slug: varchar("slug", { length: 128 }).notNull().unique(),
    name: varchar("name", { length: 200 }).notNull(),
    version: varchar("version", { length: 120 }),
    issuer: varchar("issuer", { length: 200 }),
    /** first_party | vendor_tool | third_party_evaluator | academic | community */
    issuerStance: varchar("issuerStance", { length: 40 }).notNull(),
    /** coding | agentic_tool_use | computer_use | web_research | knowledge_reasoning |
     *  math | multimodal | professional_knowledge_work | safety_security |
     *  efficiency_runtime | embedding_retrieval | composite */
    capabilityDomain: varchar("capabilityDomain", { length: 48 }).notNull(),
    taskCount: varchar("taskCount", { length: 120 }),
    /** execution_verification | state_assertion | rubric_llm_judge |
     *  human_preference_elo | exact_match | composite_index */
    scoringMechanism: varchar("scoringMechanism", { length: 40 }).notNull(),
    /** all_or_nothing | partial_credit | single_answer */
    strictness: varchar("strictness", { length: 24 }).notNull(),
    metricUnit: varchar("metricUnit", { length: 200 }),
    /** percentage | elo | index | other */
    scoreForm: varchar("scoreForm", { length: 16 }).notNull(),
    humanBaseline: text("humanBaseline"),
    currentSotaScore: varchar("currentSotaScore", { length: 200 }),
    /** saturated | contested | frontier */
    saturationStatus: varchar("saturationStatus", { length: 16 }).notNull(),
    /** low | medium | high */
    contaminationRisk: varchar("contaminationRisk", { length: 12 }).notNull(),
    usesLlmJudge: boolean("usesLlmJudge").default(false).notNull(),
    hasNegativeAssertions: boolean("hasNegativeAssertions").default(false).notNull(),
    isAgentic: boolean("isAgentic").default(false).notNull(),
    isOpenSource: boolean("isOpenSource").default(false).notNull(),
    reportsCost: boolean("reportsCost").default(false).notNull(),
    ciDisclosed: boolean("ciDisclosed").default(false).notNull(),
    confidenceInterval: varchar("confidenceInterval", { length: 120 }),
    /** Derived meta-model metrics */
    trustScore: int("trustScore").notNull(),
    discriminativePower: int("discriminativePower").notNull(),
    difficultyCoefficient: decimal("difficultyCoefficient", { precision: 5, scale: 3 }).notNull(),
    utilityScore: decimal("utilityScore", { precision: 5, scale: 1 }).notNull(),
    scenarioMapping: text("scenarioMapping"),
    interpretationCaveat: text("interpretationCaveat"),
    notes: text("notes"),
    officialUrl: varchar("officialUrl", { length: 500 }),
    paperUrl: varchar("paperUrl", { length: 500 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    domainIdx: index("benchmarks_domain_idx").on(table.capabilityDomain),
    saturationIdx: index("benchmarks_saturation_idx").on(table.saturationStatus),
    utilityIdx: index("benchmarks_utility_idx").on(table.utilityScore),
  }),
);

export type Benchmark = typeof benchmarks.$inferSelect;
export type InsertBenchmark = typeof benchmarks.$inferInsert;

/** Tracked models. */
export const models = mysqlTable(
  "models",
  {
    id: int("id").autoincrement().primaryKey(),
    slug: varchar("slug", { length: 128 }).notNull().unique(),
    name: varchar("name", { length: 200 }).notNull(),
    provider: varchar("provider", { length: 120 }).notNull(),
    /** open | closed */
    license: varchar("license", { length: 16 }).default("closed").notNull(),
    /** current | superseded */
    status: varchar("status", { length: 16 }).default("current").notNull(),
    isReasoning: boolean("isReasoning").default(false).notNull(),
    contextWindow: varchar("contextWindow", { length: 40 }),
    priceInput: decimal("priceInput", { precision: 10, scale: 3 }),
    priceOutput: decimal("priceOutput", { precision: 10, scale: 3 }),
    releasedAt: varchar("releasedAt", { length: 20 }),
    /**
     * Context window as a plain token count, so it can be sorted and plotted.
     * `contextWindow` above stays as the human string ("200K", "1M").
     */
    contextTokens: int("contextTokens"),
    /**
     * Provenance for the commercial facts. The scores table has required
     * per-row sourceUrl; price and context deserve the same treatment, or the
     * quality×price chart would rest on unverifiable numbers.
     */
    priceSourceUrl: varchar("priceSourceUrl", { length: 500 }),
    contextSourceUrl: varchar("contextSourceUrl", { length: 500 }),
    releaseSourceUrl: varchar("releaseSourceUrl", { length: 500 }),
    /** Caveats such as tiered pricing or gated access, surfaced in the UI. */
    commercialNote: text("commercialNote"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    providerIdx: index("models_provider_idx").on(table.provider),
    statusIdx: index("models_status_idx").on(table.status),
  }),
);

export type Model = typeof models.$inferSelect;
export type InsertModel = typeof models.$inferInsert;

/** Model x Benchmark score entries, every row carries source provenance. */
export const scores = mysqlTable(
  "scores",
  {
    id: int("id").autoincrement().primaryKey(),
    modelId: int("modelId").notNull(),
    benchmarkId: int("benchmarkId").notNull(),
    /** Raw reported value in the benchmark's native unit. */
    rawScore: decimal("rawScore", { precision: 10, scale: 3 }).notNull(),
    /** Optional secondary reading, e.g. HLE with-tools vs without-tools. */
    rawScoreSecondary: decimal("rawScoreSecondary", { precision: 10, scale: 3 }),
    secondaryLabel: varchar("secondaryLabel", { length: 80 }),
    /** Benchmark version the score was measured against. */
    benchmarkVersion: varchar("benchmarkVersion", { length: 120 }),
    /** self_reported | third_party | leaderboard */
    sourceType: varchar("sourceType", { length: 24 }).default("self_reported").notNull(),
    sourceName: varchar("sourceName", { length: 200 }),
    sourceUrl: varchar("sourceUrl", { length: 500 }),
    /** When the score was published/measured (ISO date string). */
    measuredAt: varchar("measuredAt", { length: 20 }),
    lastUpdated: timestamp("lastUpdated").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    modelIdx: index("scores_model_idx").on(table.modelId),
    benchmarkIdx: index("scores_benchmark_idx").on(table.benchmarkId),
  }),
);

export type Score = typeof scores.$inferSelect;
export type InsertScore = typeof scores.$inferInsert;

/** Release radar events. */
export const releases = mysqlTable("releases", {
  id: int("id").autoincrement().primaryKey(),
  modelName: varchar("modelName", { length: 200 }).notNull(),
  provider: varchar("provider", { length: 120 }).notNull(),
  headline: text("headline"),
  releasedAt: varchar("releasedAt", { length: 20 }).notNull(),
  sourceUrl: varchar("sourceUrl", { length: 500 }),
  confirmed: boolean("confirmed").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Release = typeof releases.$inferSelect;
export type InsertRelease = typeof releases.$inferInsert;

/** Tracks admin-triggered data refresh runs, powering the freshness layer. */
export const refreshLog = mysqlTable("refreshLog", {
  id: int("id").autoincrement().primaryKey(),
  triggeredBy: varchar("triggeredBy", { length: 64 }).notNull(),
  scope: varchar("scope", { length: 40 }).notNull(),
  rowsTouched: int("rowsTouched").default(0).notNull(),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RefreshLog = typeof refreshLog.$inferSelect;

/**
 * Daily snapshot of each model's composite standing, so movement becomes
 * observable over time. Nothing in the UI may claim a trend until there are at
 * least two distinct snapshot days for the model in question.
 */
export const rankSnapshots = mysqlTable(
  "rankSnapshots",
  {
    id: int("id").autoincrement().primaryKey(),
    modelId: int("modelId").notNull(),
    /** UTC calendar day, YYYY-MM-DD. One row per model per day. */
    snapshotDay: varchar("snapshotDay", { length: 10 }).notNull(),
    compositeScore: decimal("compositeScore", { precision: 6, scale: 2 }),
    rankOverall: int("rankOverall"),
    evidenceCount: int("evidenceCount").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    dayIdx: index("rank_snapshots_day_idx").on(table.snapshotDay),
    modelDayIdx: uniqueIndex("rank_snapshots_model_day_idx").on(
      table.modelId,
      table.snapshotDay,
    ),
  }),
);

export type RankSnapshot = typeof rankSnapshots.$inferSelect;
export type InsertRankSnapshot = typeof rankSnapshots.$inferInsert;
