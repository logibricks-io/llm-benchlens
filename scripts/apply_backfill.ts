/**
 * Apply scripts/backfill_metadata.sql using the project's own drizzle client.
 *
 * A standalone mysql2 connection hung in this sandbox, but the dev server talks
 * to the database fine through `getDb()`, so reuse exactly that path.
 */
import { readFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { getDb } from "../server/db";

const file = process.argv[2] ?? "scripts/backfill_metadata.sql";
const statements = readFileSync(file, "utf8")
  .split(/;\s*(?:\n|$)/)
  .map(s => s.trim())
  .filter(Boolean);

const db = await getDb();
if (!db) throw new Error("no database connection");

let touched = 0;
let failed = 0;
for (const [i, stmt] of statements.entries()) {
  try {
    const res: unknown = await db.execute(sql.raw(stmt));
    const rows = (res as { rowsAffected?: number }[] | { rowsAffected?: number })
    touched += Array.isArray(rows) ? (rows[0]?.rowsAffected ?? 0) : (rows.rowsAffected ?? 0);
  } catch (err) {
    failed++;
    console.error(`stmt ${i} failed: ${(err as Error).message}`);
    console.error(`  ${stmt.slice(0, 160)}`);
  }
}
console.log(`executed ${statements.length} statements, ${failed} failed, ~${touched} rows affected`);
process.exit(failed ? 1 : 0);
