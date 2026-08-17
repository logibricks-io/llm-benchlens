/**
 * Rewrite every stored contextWindow string from its token count using the
 * shared formatter, so the UI shows "256K" instead of "262.144K".
 *
 * Also resolves two entity problems found while auditing the backfill:
 *  - fable-5 (provider "Other", 2 scores) is an alias of claude-fable-5
 *    (Anthropic, 36 scores) — same price, context and release date.
 *  - muse-spark vs muse-spark-1-1 are NOT the same model (262K vs 1M context,
 *    two months apart), but muse-spark had inherited 1.1's price. Clear it.
 */
import { sql } from "drizzle-orm";
import { formatContextWindow } from "../shared/formatContext";
import { getDb } from "../server/db";

const db = await getDb();
if (!db) throw new Error("no database connection");

const rows = (await db.execute(
  sql.raw("SELECT id, slug, contextTokens, contextWindow FROM models WHERE contextTokens IS NOT NULL"),
)) as unknown as Array<Array<{ id: number; slug: string; contextTokens: number; contextWindow: string | null }>>;

const list = Array.isArray(rows[0]) ? rows[0] : (rows as unknown as Array<{ id: number; slug: string; contextTokens: number; contextWindow: string | null }>);

let changed = 0;
for (const r of list) {
  const want = formatContextWindow(r.contextTokens);
  if (want && want !== r.contextWindow) {
    await db.execute(sql.raw(`UPDATE models SET contextWindow = '${want}' WHERE id = ${r.id}`));
    console.log(`  ${r.slug.padEnd(30)} ${String(r.contextWindow).padEnd(12)} -> ${want}`);
    changed++;
  }
}
console.log(`rewrote ${changed} context strings out of ${list.length}`);

// muse-spark inherited its sibling's price; it is a distinct earlier model.
await db.execute(
  sql.raw(
    `UPDATE models SET priceInput = NULL, priceOutput = NULL, priceSourceUrl = NULL, ` +
      `commercialNote = 'The recorded price had been copied from Muse Spark 1.1. This is the ` +
      `earlier 262K-context release (2026-04-08); no separate published price was found for it, ` +
      `so the figure is left empty rather than inherited.' WHERE slug = 'muse-spark'`,
  ),
);
console.log("cleared inherited price on muse-spark");

process.exit(0);
