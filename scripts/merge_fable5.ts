/**
 * Merge the `fable-5` row into `claude-fable-5`.
 *
 * The backfill research returned identical price, context window and release
 * date for both, and `fable-5` carries provider "Other" with 2 scores while
 * `claude-fable-5` carries provider "Anthropic" with 36. It is the same model
 * recorded without its vendor prefix.
 *
 * Same conservative approach as scripts/merge_model_aliases.mjs: re-point the
 * scores, drop rows that would duplicate an existing (benchmark, sourceUrl)
 * pair, then delete the alias row.
 */
import { sql } from "drizzle-orm";
import { getDb } from "../server/db";

const db = await getDb();
if (!db) throw new Error("no database connection");

async function one<T = Record<string, unknown>>(q: string): Promise<T[]> {
  const r = (await db!.execute(sql.raw(q))) as unknown;
  return (Array.isArray(r) && Array.isArray(r[0]) ? r[0] : r) as T[];
}

const rows = await one<{ id: number; slug: string; provider: string }>(
  "SELECT id, slug, provider FROM models WHERE slug IN ('fable-5','claude-fable-5')",
);
const alias = rows.find(r => r.slug === "fable-5");
const canonical = rows.find(r => r.slug === "claude-fable-5");

if (!alias || !canonical) {
  console.log("nothing to merge (one of the rows is absent)");
  process.exit(0);
}

const before = await one<{ n: number }>(
  `SELECT COUNT(*) AS n FROM scores WHERE modelId = ${alias.id}`,
);
console.log(`alias fable-5 (id ${alias.id}) holds ${before[0]?.n} scores`);

// Drop alias scores that would duplicate an existing canonical row.
await db.execute(
  sql.raw(
    `DELETE s FROM scores s
     JOIN scores c
       ON c.modelId = ${canonical.id}
      AND c.benchmarkId = s.benchmarkId
      AND (c.sourceUrl = s.sourceUrl OR (c.sourceUrl IS NULL AND s.sourceUrl IS NULL))
     WHERE s.modelId = ${alias.id}`,
  ),
);

await db.execute(sql.raw(`UPDATE scores SET modelId = ${canonical.id} WHERE modelId = ${alias.id}`));
await db.execute(sql.raw(`DELETE FROM models WHERE id = ${alias.id}`));

const after = await one<{ n: number }>(
  `SELECT COUNT(*) AS n FROM scores WHERE modelId = ${canonical.id}`,
);
console.log(`merged; claude-fable-5 now holds ${after[0]?.n} scores`);
process.exit(0);
