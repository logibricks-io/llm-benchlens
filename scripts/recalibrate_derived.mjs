/**
 * Recalibrates the derived meta-model metrics.
 *
 * Two defects showed up once the embedding domain was loaded:
 *
 *  1. Ceiling pile-up. 22 benchmarks sat at discriminativePower = 100 and two
 *     at utilityScore = 100. A metric that saturates at its own maximum has the
 *     exact problem this product exists to expose: no discriminative power.
 *     A perfect benchmark does not exist, so 100 must be unreachable.
 *
 *  2. Utility ignored evidence. FreshStack scored 100 utility with zero
 *     traceable results. "Well designed" and "actually usable for comparison"
 *     are different claims; utility is the second one, so it must be discounted
 *     when the benchmark has little or no measured evidence.
 *
 * Fix: squash both sub-scores into an asymptotic band (cap 97) and multiply
 * utility by an evidence-sufficiency factor derived from real score counts.
 */
import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}

const CAP = 97;

/**
 * Compresses the top of the range so nothing reaches the ceiling.
 * Values below the knee are untouched; above it they approach CAP asymptotically.
 */
function squash(v, knee = 88) {
  if (v <= knee) return v;
  const headroom = CAP - knee;
  const excess = v - knee;
  // excess/(excess+headroom) -> 0..1, never 1
  return knee + headroom * (excess / (excess + headroom));
}

/** 0 evidence => heavy discount; grows toward 1 as independent results accumulate. */
function evidenceFactor(scoreCount, distinctSources) {
  if (scoreCount === 0) return 0.55;
  const breadth = scoreCount / (scoreCount + 6); // 1 row ≈ 0.14, 12 rows ≈ 0.67
  const corroboration = distinctSources >= 2 ? 1.0 : 0.88;
  return (0.6 + 0.4 * breadth) * corroboration;
}

const conn = await mysql.createConnection({ uri: url, connectTimeout: 20000 });

const [rows] = await conn.query(`
  SELECT b.id, b.slug, b.trustScore, b.discriminativePower, b.contaminationRisk,
         COUNT(s.id) AS scoreCount,
         COUNT(DISTINCT s.sourceUrl) AS sourceCount
  FROM benchmarks b
  LEFT JOIN scores s ON s.benchmarkId = b.id
  GROUP BY b.id
`);

const CONTAM_FACTOR = { low: 1.0, medium: 0.92, high: 0.82, unknown: 0.9 };

let updated = 0;
for (const r of rows) {
  const trust = Math.round(squash(Number(r.trustScore)) * 10) / 10;
  const disc = Math.round(squash(Number(r.discriminativePower)) * 10) / 10;

  const contam = CONTAM_FACTOR[r.contaminationRisk] ?? 0.9;
  const evidence = evidenceFactor(Number(r.scoreCount), Number(r.sourceCount));

  const utility =
    Math.round(Math.min(CAP, (trust * 0.42 + disc * 0.58) * contam * evidence) * 10) / 10;

  await conn.execute(
    "UPDATE benchmarks SET trustScore = ?, discriminativePower = ?, utilityScore = ? WHERE id = ?",
    [Math.round(trust), Math.round(disc), utility, r.id],
  );
  updated++;
}

const [[stats]] = await conn.query(`
  SELECT COUNT(*) AS n,
         SUM(trustScore >= 100) AS trust100,
         SUM(discriminativePower >= 100) AS disc100,
         SUM(utilityScore >= 100) AS util100,
         ROUND(MAX(utilityScore),1) AS maxUtil,
         ROUND(MIN(utilityScore),1) AS minUtil,
         ROUND(AVG(utilityScore),1) AS avgUtil,
         ROUND(STDDEV(utilityScore),1) AS sdUtil
  FROM benchmarks
`);

console.log(`recalibrated ${updated} benchmarks`);
console.log(stats);

const [top] = await conn.query(
  `SELECT b.slug, b.utilityScore, b.trustScore, b.discriminativePower, COUNT(s.id) AS n
   FROM benchmarks b LEFT JOIN scores s ON s.benchmarkId = b.id
   GROUP BY b.id ORDER BY b.utilityScore DESC LIMIT 6`,
);
console.log("top utility:", top);

await conn.end();
