/**
 * Collapses duplicate model identities.
 *
 * Different sources name the same model differently: a vendor page says
 * "Claude Opus 5", a tracker says "claude-opus-5-high", another says
 * "claude-opus-5-max". Loaded naively they became three separate rows, so the
 * matrix showed one model three times and evidence that belongs together was
 * split — which then fed the confidence-shrinkage the wrong numbers.
 *
 * Reasoning-effort suffixes (-high / -max / -low / -medium / -minimal / -xhigh)
 * are an inference SETTING, not a different model, so they merge into the
 * canonical row. Dated snapshots (-0813, -20250219), size variants (-8b) and
 * lifecycle variants (-preview, -flash, -turbo, -pro) are genuinely different
 * artifacts and are deliberately left alone.
 *
 * Merge is conservative: only when a canonical row already exists AND both rows
 * share the same provider. Scores are re-pointed, duplicates (same benchmark +
 * same sourceUrl) dropped, then the alias row is deleted.
 */
import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}

/** Suffixes that denote reasoning effort / verbosity, not a distinct model. */
const EFFORT_SUFFIX = /-(x?high|max|low|medium|minimal|thinking)$/;

const conn = await mysql.createConnection({ uri: url, connectTimeout: 20000 });

const [models] = await conn.query("SELECT id, slug, name, provider FROM models");
const bySlug = new Map(models.map(m => [m.slug, m]));

// Resolve the alias -> canonical plan in memory first, then execute it with a
// handful of set-based statements. Per-row round trips against a remote DB were
// far too slow (hundreds of aliases x 2 queries each).
const plan = [];
for (const m of models) {
  const match = m.slug.match(EFFORT_SUFFIX);
  if (!match) continue;
  const canonicalSlug = m.slug.replace(EFFORT_SUFFIX, "");
  const canonical = bySlug.get(canonicalSlug);
  if (!canonical || canonical.id === m.id) continue;
  if (canonical.provider !== m.provider) continue;
  plan.push({ aliasId: m.id, aliasSlug: m.slug, canonicalId: canonical.id, canonicalSlug, tier: match[1] });
}

console.log(`planned merges: ${plan.length}`);

let merged = 0;
let rePointed = 0;
let dropped = 0;

for (const p of plan) {
  // 1. Drop alias rows that would collide with an existing canonical row.
  const [del] = await conn.execute(
    `DELETE a FROM scores a
     JOIN scores c
       ON c.modelId = ? AND c.benchmarkId = a.benchmarkId AND c.sourceUrl = a.sourceUrl
     WHERE a.modelId = ?`,
    [p.canonicalId, p.aliasId],
  );
  dropped += del.affectedRows ?? 0;

  // 2. Re-point what remains, tagging the reasoning-effort setting.
  const [upd] = await conn.execute(
    `UPDATE scores
     SET modelId = ?, benchmarkVersion = COALESCE(NULLIF(benchmarkVersion,''), ?)
     WHERE modelId = ?`,
    [p.canonicalId, `effort:${p.tier}`, p.aliasId],
  );
  rePointed += upd.affectedRows ?? 0;

  await conn.execute("DELETE FROM models WHERE id = ?", [p.aliasId]);
  merged++;
  console.log(`  ${p.aliasSlug} -> ${p.canonicalSlug} (+${upd.affectedRows ?? 0} / -${del.affectedRows ?? 0})`);
}

const [[stats]] = await conn.query(`
  SELECT (SELECT COUNT(*) FROM models) AS models,
         (SELECT COUNT(*) FROM scores) AS scores,
         (SELECT COUNT(DISTINCT benchmarkId) FROM scores) AS covered,
         (SELECT COUNT(*) FROM scores WHERE sourceUrl IS NULL OR sourceUrl='') AS noProvenance
`);

console.log(`\nmerged ${merged} alias rows · re-pointed ${rePointed} scores · dropped ${dropped} duplicates`);
console.log(stats);

await conn.end();
