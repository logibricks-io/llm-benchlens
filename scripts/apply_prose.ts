/**
 * Writes the audited English prose into the three *En columns.
 * Runs through the app's drizzle client; a direct mysql2 connection from this
 * sandbox hangs.
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import { getDb } from "../server/db";
import { benchmarks } from "../drizzle/schema";

type Row = {
  output?: { slug?: string; scenario_mapping_en?: string; interpretation_caveat_en?: string; notes_en?: string };
};

const results: Row[] = JSON.parse(
  readFileSync("/home/ubuntu/translate_benchmark_prose.json", "utf8"),
).results;

const db = await getDb();
let updated = 0;
for (const r of results) {
  const o = r.output;
  if (!o?.slug) continue;
  await db
    .update(benchmarks)
    .set({
      scenarioMappingEn: o.scenario_mapping_en?.trim() || null,
      interpretationCaveatEn: o.interpretation_caveat_en?.trim() || null,
      notesEn: o.notes_en?.trim() || null,
    })
    .where(eq(benchmarks.slug, o.slug));
  updated++;
}
console.log(`updated ${updated} benchmarks`);
process.exit(0);
