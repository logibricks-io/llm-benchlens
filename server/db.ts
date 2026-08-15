import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { benchmarks, InsertUser, models, refreshLog, releases, scores, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  for (const field of ["name", "email", "loginMethod"] as const) {
    const value = user[field];
    if (value === undefined) continue;
    values[field] = value ?? null;
    updateSet[field] = value ?? null;
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/* ------------------------------------------------------------------ queries */

export async function listBenchmarks() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(benchmarks).orderBy(desc(benchmarks.utilityScore));
}

export async function getBenchmarkBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(benchmarks).where(eq(benchmarks.slug, slug)).limit(1);
  return rows[0];
}

export async function listModels() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(models).orderBy(models.name);
}

export async function getModelBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(models).where(eq(models.slug, slug)).limit(1);
  return rows[0];
}

/** Full score matrix with benchmark + model identifiers joined in. */
export async function listScores() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: scores.id,
      modelId: scores.modelId,
      benchmarkId: scores.benchmarkId,
      modelSlug: models.slug,
      modelName: models.name,
      provider: models.provider,
      license: models.license,
      modelStatus: models.status,
      priceInput: models.priceInput,
      priceOutput: models.priceOutput,
      benchmarkSlug: benchmarks.slug,
      benchmarkName: benchmarks.name,
      capabilityDomain: benchmarks.capabilityDomain,
      scoreForm: benchmarks.scoreForm,
      strictness: benchmarks.strictness,
      saturationStatus: benchmarks.saturationStatus,
      scoringMechanism: benchmarks.scoringMechanism,
      issuerStance: benchmarks.issuerStance,
      contaminationRisk: benchmarks.contaminationRisk,
      isAgentic: benchmarks.isAgentic,
      hasNegativeAssertions: benchmarks.hasNegativeAssertions,
      trustScore: benchmarks.trustScore,
      discriminativePower: benchmarks.discriminativePower,
      difficultyCoefficient: benchmarks.difficultyCoefficient,
      rawScore: scores.rawScore,
      rawScoreSecondary: scores.rawScoreSecondary,
      secondaryLabel: scores.secondaryLabel,
      benchmarkVersion: scores.benchmarkVersion,
      sourceType: scores.sourceType,
      sourceName: scores.sourceName,
      sourceUrl: scores.sourceUrl,
      measuredAt: scores.measuredAt,
      lastUpdated: scores.lastUpdated,
    })
    .from(scores)
    .innerJoin(models, eq(models.id, scores.modelId))
    .innerJoin(benchmarks, eq(benchmarks.id, scores.benchmarkId));
}

export async function listScoresForBenchmark(benchmarkId: number) {
  const all = await listScores();
  return all.filter(s => s.benchmarkId === benchmarkId);
}

export async function listScoresForModelSlugs(slugs: string[]) {
  if (slugs.length === 0) return [];
  const all = await listScores();
  return all.filter(s => slugs.includes(s.modelSlug));
}

export async function listReleases(limit = 30) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(releases).orderBy(desc(releases.releasedAt)).limit(limit);
}

export async function coverageStats() {
  const db = await getDb();
  if (!db) return { models: 0, benchmarks: 0, scores: 0, coveredBenchmarks: 0, lastRefresh: null as Date | null };
  const [[m], [b], [s], [cb], recent] = await Promise.all([
    db.select({ n: sql<number>`count(*)` }).from(models),
    db.select({ n: sql<number>`count(*)` }).from(benchmarks),
    db.select({ n: sql<number>`count(*)` }).from(scores),
    db.select({ n: sql<number>`count(distinct ${scores.benchmarkId})` }).from(scores),
    db.select().from(refreshLog).orderBy(desc(refreshLog.createdAt)).limit(1),
  ]);
  return {
    models: Number(m?.n ?? 0),
    benchmarks: Number(b?.n ?? 0),
    scores: Number(s?.n ?? 0),
    coveredBenchmarks: Number(cb?.n ?? 0),
    lastRefresh: recent[0]?.createdAt ?? null,
  };
}

export async function touchScores(benchmarkSlugs?: string[]) {
  const db = await getDb();
  if (!db) return 0;
  if (benchmarkSlugs && benchmarkSlugs.length > 0) {
    const bms = await db
      .select({ id: benchmarks.id })
      .from(benchmarks)
      .where(inArray(benchmarks.slug, benchmarkSlugs));
    const ids = bms.map(b => b.id);
    if (ids.length === 0) return 0;
    const res = await db
      .update(scores)
      .set({ lastUpdated: new Date() })
      .where(inArray(scores.benchmarkId, ids));
    return (res as unknown as { affectedRows?: number }).affectedRows ?? 0;
  }
  const res = await db.update(scores).set({ lastUpdated: new Date() });
  return (res as unknown as { affectedRows?: number }).affectedRows ?? 0;
}

export async function recordRefresh(triggeredBy: string, scope: string, rowsTouched: number, note?: string) {
  const db = await getDb();
  if (!db) return;
  await db.insert(refreshLog).values({ triggeredBy, scope, rowsTouched, note: note ?? null });
}

export async function listRefreshLog(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(refreshLog).orderBy(desc(refreshLog.createdAt)).limit(limit);
}

export { and, eq };
