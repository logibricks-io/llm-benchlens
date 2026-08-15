/**
 * Fills the last coverage gaps in the score matrix.
 *
 * Rules that must not be relaxed:
 *  - every row carries a real sourceUrl (no URL => no row)
 *  - sourceType is honest: `vendor` for self-reported, `aggregator` for
 *    third-party trackers, `official` for the benchmark's own leaderboard
 *  - measuredAt reflects when the number was published/collected, not now
 */
import mysql from "mysql2/promise";

const ROWS = [
  // ── CyberSecEval 4 ─────────────────────────────────────────────────────────
  // The only benchmark left without a single traceable score. Public coverage is
  // genuinely thin: llm-stats tracks exactly one model, self-reported and
  // unverified. We record it as-is rather than inventing companions — a single
  // honest row plus the evidence-shrinkage machinery is the correct
  // representation of "barely measured".
  {
    benchmark: "cyberseceval-4",
    model: "MAI-Thinking-1",
    provider: "Microsoft",
    raw: 63.0,
    sourceType: "vendor",
    sourceName: "LLM Stats — CyberSecEval 4 leaderboard (self-reported, unverified)",
    sourceUrl: "https://llm-stats.com/benchmarks/cyberseceval-4",
    measuredAt: "2026-08-15",
  },
];

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}

const conn = await mysql.createConnection({ uri: url, connectTimeout: 20000 });

async function idFor(table, slugOrName, column) {
  const [rows] = await conn.execute(`SELECT id FROM ${table} WHERE ${column} = ? LIMIT 1`, [slugOrName]);
  return rows[0]?.id ?? null;
}

let inserted = 0;
let skipped = 0;

for (const r of ROWS) {
  if (!r.sourceUrl) {
    skipped++;
    continue;
  }

  const benchmarkId = await idFor("benchmarks", r.benchmark, "slug");
  if (!benchmarkId) {
    console.warn(`  skip: unknown benchmark ${r.benchmark}`);
    skipped++;
    continue;
  }

  // Reuse the model row if we already track it, otherwise create it.
  const slug = r.model.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  let modelId = await idFor("models", slug, "slug");
  if (!modelId) {
    const [res] = await conn.execute(
      `INSERT INTO models (slug, name, provider, license, status) VALUES (?, ?, ?, 'closed', 'current')`,
      [slug, r.model, r.provider],
    );
    modelId = res.insertId;
  }

  const [dupe] = await conn.execute(
    `SELECT id FROM scores WHERE modelId = ? AND benchmarkId = ? AND sourceUrl = ? LIMIT 1`,
    [modelId, benchmarkId, r.sourceUrl],
  );
  if (dupe.length > 0) {
    skipped++;
    continue;
  }

  await conn.execute(
    `INSERT INTO scores (modelId, benchmarkId, rawScore, sourceType, sourceName, sourceUrl, measuredAt, lastUpdated)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
    [modelId, benchmarkId, r.raw, r.sourceType, r.sourceName, r.sourceUrl, r.measuredAt],
  );
  inserted++;
}

const [[cov]] = await conn.query(
  `SELECT COUNT(DISTINCT benchmarkId) AS benches, COUNT(*) AS rows_, COUNT(DISTINCT modelId) AS models FROM scores`,
);
const [[missing]] = await conn.query(`SELECT COUNT(*) AS n FROM scores WHERE sourceUrl IS NULL OR sourceUrl = ''`);

console.log(`inserted ${inserted}, skipped ${skipped}`);
console.log(`coverage: ${cov.benches} benchmarks / ${cov.models} models / ${cov.rows_} rows`);
console.log(`rows missing provenance: ${missing.n}`);

await conn.end();
