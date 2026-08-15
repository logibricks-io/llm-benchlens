/**
 * Broadens the thinnest capability domain (embedding_retrieval had exactly one
 * benchmark) using the parallel meta-model survey in
 * /home/ubuntu/embedding_benchmark_meta.json.
 *
 * The existing MTEB row stays as the canonical MTEB entry; the survey's `mteb`
 * result is merged into it rather than inserted as a duplicate.
 *
 * Derived metrics (trust / discriminative power / difficulty / utility) are
 * computed with the SAME formulas used for the original 90 rows, so the new
 * benchmarks are directly comparable instead of being special-cased.
 */
import { readFileSync } from "node:fs";
import mysql from "mysql2/promise";

const SURVEY = "/home/ubuntu/embedding_benchmark_meta.json";

/* ----------------------------------------------------- derived metric model */

const STANCE_TRUST = {
  independent_academic: 100,
  third_party_evaluator: 92,
  vendor_neutral_consortium: 88,
  vendor_affiliated: 55,
  commercial_vendor: 45,
  unknown: 60,
};

const CONTAM_PENALTY = { low: 0, medium: 12, high: 26, unknown: 14 };

const STRICTNESS_FACTOR = {
  lenient: 0.82,
  moderate: 1.0,
  strict: 1.24,
  brutal: 1.5,
  unknown: 1.0,
};

const MECHANISM_FACTOR = {
  all_pass: 1.3,
  execution: 1.16,
  exact_match: 1.0,
  partial_credit: 0.94,
  pass_at_k: 0.96,
  weighted_composite: 0.98,
  llm_judge: 0.9,
  human_pref: 0.92,
  unknown: 1.0,
};

const SATURATION_DISC = { frontier: 96, contested: 74, saturated: 18, unknown: 50 };
const SATURATION_DIFF = { frontier: 1.5, contested: 1.12, saturated: 0.7, unknown: 1.0 };

function trustScore(stance, contamination, disclosesCi) {
  const base = STANCE_TRUST[stance] ?? 60;
  const penalty = CONTAM_PENALTY[contamination] ?? 14;
  const ciBonus = disclosesCi ? 8 : 0;
  return Math.max(0, Math.min(100, Math.round(base - penalty + ciBonus)));
}

function discriminativePower(saturation, strictness) {
  const base = SATURATION_DISC[saturation] ?? 50;
  const bump = { lenient: -6, moderate: 0, strict: 5, brutal: 9, unknown: 0 }[strictness] ?? 0;
  return Math.max(0, Math.min(100, Math.round(base + bump)));
}

function difficultyCoefficient(saturation, strictness, mechanism) {
  const raw =
    (SATURATION_DIFF[saturation] ?? 1.0) *
    (STRICTNESS_FACTOR[strictness] ?? 1.0) *
    (MECHANISM_FACTOR[mechanism] ?? 1.0);
  return Math.round(Math.max(0.5, Math.min(2.2, raw)) * 100) / 100;
}

function utilityScore(trust, disc, contamination) {
  const contamFactor = { low: 1.0, medium: 0.92, high: 0.82, unknown: 0.9 }[contamination] ?? 0.9;
  return Math.round(Math.min(100, (trust * 0.42 + disc * 0.58) * contamFactor) * 10) / 10;
}

/* ------------------------------------------------------------------- loader */

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}

const survey = JSON.parse(readFileSync(SURVEY, "utf8")).results;
const conn = await mysql.createConnection({ uri: url, connectTimeout: 20000 });

// The pre-existing MTEB row we must not duplicate.
const MTEB_EXISTING = "massive-text-embedding-benchmark";

let benchInserted = 0;
let scoreInserted = 0;
let scoreSkipped = 0;

for (const entry of survey) {
  const o = entry.output;
  if (!o || !o.slug || o.slug === "unknown") continue;
  if (!o.official_url || !o.official_url.startsWith("http")) {
    console.warn(`  skip benchmark ${o.slug}: no official url`);
    continue;
  }

  const stance = o.issuer_stance ?? "unknown";
  const mechanism = o.scoring_mechanism ?? "unknown";
  const strictness = o.strictness ?? "unknown";
  const saturation = o.saturation_status ?? "unknown";
  const contamination = o.contamination_risk ?? "unknown";
  const ci = o.discloses_ci === true;

  const trust = trustScore(stance, contamination, ci);
  const disc = discriminativePower(saturation, strictness);
  const diff = difficultyCoefficient(saturation, strictness, mechanism);
  const utility = utilityScore(trust, disc, contamination);

  // Reuse the canonical MTEB row instead of inserting a near-duplicate.
  const slug = o.slug === "mteb" ? MTEB_EXISTING : o.slug;

  const [existing] = await conn.execute("SELECT id FROM benchmarks WHERE slug = ? LIMIT 1", [slug]);
  let benchmarkId = existing[0]?.id ?? null;

  if (benchmarkId) {
    // Enrich the existing row with survey findings, but keep its identity.
    await conn.execute(
      `UPDATE benchmarks SET
         issuer = COALESCE(NULLIF(issuer, ''), ?),
         interpretationCaveat = COALESCE(NULLIF(interpretationCaveat, ''), ?),
         scenarioMapping = COALESCE(NULLIF(scenarioMapping, ''), ?),
         officialUrl = COALESCE(NULLIF(officialUrl, ''), ?)
       WHERE id = ?`,
      [o.issuer ?? null, o.interpretation_caveat ?? null, o.capability_summary ?? null, o.official_url, benchmarkId],
    );
  } else {
    const [res] = await conn.execute(
      `INSERT INTO benchmarks
        (slug, name, issuer, capabilityDomain, issuerStance, scoringMechanism, strictness,
         saturationStatus, contaminationRisk, ciDisclosed, scoreForm,
         metricUnit, taskCount, currentSotaScore, isAgentic, hasNegativeAssertions, isOpenSource,
         trustScore, discriminativePower, difficultyCoefficient, utilityScore,
         interpretationCaveat, scenarioMapping, officialUrl, notes)
       VALUES (?, ?, ?, 'embedding_retrieval', ?, ?, ?, ?, ?, ?, 'percentage', ?, ?, ?, 0, 0, 1, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        slug,
        o.official_name,
        o.issuer ?? null,
        stance,
        mechanism,
        strictness,
        saturation,
        contamination,
        ci ? 1 : 0,
        o.metric_unit ?? null,
        o.task_count && o.task_count !== "unknown" ? String(o.task_count) : null,
        o.current_best && o.current_best !== "unknown" ? o.current_best : null,
        trust,
        disc,
        diff,
        utility,
        o.interpretation_caveat ?? null,
        o.capability_summary ?? null,
        o.official_url,
        o.contamination_basis ?? null,
      ],
    );
    benchmarkId = res.insertId;
    benchInserted++;
  }

  // ── scores ───────────────────────────────────────────────────────────────
  let rows = [];
  try {
    rows = JSON.parse(o.scores_json || "[]");
  } catch {
    rows = [];
  }

  for (const s of rows) {
    const score = Number(s.score);
    if (!Number.isFinite(score)) {
      scoreSkipped++;
      continue;
    }
    // Provenance is a hard gate.
    if (!s.source_url || !String(s.source_url).startsWith("http")) {
      scoreSkipped++;
      continue;
    }

    const name = String(s.model).trim();
    const mslug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (!mslug) {
      scoreSkipped++;
      continue;
    }

    const [mrows] = await conn.execute("SELECT id FROM models WHERE slug = ? LIMIT 1", [mslug]);
    let modelId = mrows[0]?.id ?? null;
    if (!modelId) {
      const [res] = await conn.execute(
        "INSERT INTO models (slug, name, provider, license, status) VALUES (?, ?, ?, 'closed', 'current')",
        [mslug, name, s.provider ?? "unknown"],
      );
      modelId = res.insertId;
    }

    const [dupe] = await conn.execute(
      "SELECT id FROM scores WHERE modelId = ? AND benchmarkId = ? AND sourceUrl = ? LIMIT 1",
      [modelId, benchmarkId, s.source_url],
    );
    if (dupe.length > 0) {
      scoreSkipped++;
      continue;
    }

    // Embedding leaderboards are community-run trackers, not vendor pages.
    const sourceType = /leaderboard|mteb|huggingface/i.test(s.source_name ?? "") ? "aggregator" : "official";

    await conn.execute(
      `INSERT INTO scores (modelId, benchmarkId, rawScore, sourceType, sourceName, sourceUrl, measuredAt, lastUpdated)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [modelId, benchmarkId, score, sourceType, s.source_name ?? null, s.source_url, s.measured_at ?? null],
    );
    scoreInserted++;
  }
}

const [[cov]] = await conn.query(
  "SELECT COUNT(DISTINCT benchmarkId) AS benches, COUNT(*) AS rows_, COUNT(DISTINCT modelId) AS models FROM scores",
);
const [[total]] = await conn.query("SELECT COUNT(*) AS n FROM benchmarks");
const [[dom]] = await conn.query(
  "SELECT COUNT(*) AS n FROM benchmarks WHERE capabilityDomain = 'embedding_retrieval'",
);
const [[missing]] = await conn.query(
  "SELECT COUNT(*) AS n FROM scores WHERE sourceUrl IS NULL OR sourceUrl = ''",
);

console.log(`benchmarks inserted: ${benchInserted} (total now ${total.n})`);
console.log(`embedding_retrieval domain size: ${dom.n}`);
console.log(`scores inserted: ${scoreInserted}, skipped: ${scoreSkipped}`);
console.log(`coverage: ${cov.benches} benchmarks / ${cov.models} models / ${cov.rows_} rows`);
console.log(`rows missing provenance: ${missing.n}`);

await conn.end();
