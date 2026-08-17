/**
 * Dumps the three prose columns for every benchmark so they can be translated.
 * Reads through the app's own drizzle client because a direct mysql2 connection
 * from this sandbox hangs.
 */
import "dotenv/config";
import { writeFileSync } from "node:fs";
import { getDb } from "../server/db";
import { benchmarks } from "../drizzle/schema";

const db = await getDb();
const rows = await db
  .select({
    slug: benchmarks.slug,
    name: benchmarks.name,
    scenarioMapping: benchmarks.scenarioMapping,
    interpretationCaveat: benchmarks.interpretationCaveat,
    notes: benchmarks.notes,
  })
  .from(benchmarks);

writeFileSync("/home/ubuntu/prose_zh.json", JSON.stringify(rows, null, 2));
console.log(`exported ${rows.length} benchmarks`);
process.exit(0);
