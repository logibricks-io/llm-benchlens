/**
 * Loads the wide-research score harvest into the score matrix.
 *
 * Design rules:
 *  - Only rows whose subtask reported found=true AND carries a per-score
 *    source_url are admitted. A score without provenance is not data.
 *  - Model names are canonicalised to slugs so the same model coming from two
 *    different leaderboards lands on one row.
 *  - Idempotent per benchmark: existing rows for a benchmark being loaded are
 *    deleted first, so re-running never duplicates.
 */
import { createConnection } from "mysql2/promise";
import { readFileSync } from "node:fs";

const HARVEST = "/home/ubuntu/benchmark_score_collection.json";

/** Providers keyed by a lowercase fragment of the model name. */
const PROVIDER_RULES = [
  [/^gpt|^o[1-9]|openai|^chatgpt|^codex/, "OpenAI"],
  [/claude|anthropic|opus|sonnet|haiku/, "Anthropic"],
  [/gemini|google|gemma/, "Google"],
  [/grok|xai/, "xAI"],
  [/deepseek/, "DeepSeek"],
  [/qwen|qwq|alibaba/, "Alibaba"],
  [/llama|meta/, "Meta"],
  [/kimi|moonshot/, "Moonshot AI"],
  [/glm|zhipu|z\.ai/, "Z.AI"],
  [/minimax/, "MiniMax"],
  [/mistral|magistral|devstral/, "Mistral"],
  [/command|cohere/, "Cohere"],
  [/nova|amazon/, "Amazon"],
  [/phi-|microsoft/, "Microsoft"],
  [/ernie|baidu/, "Baidu"],
  [/hunyuan|tencent/, "Tencent"],
  [/doubao|seed|bytedance/, "ByteDance"],
  [/step-/, "StepFun"],
  [/mimo|xiaomi/, "Xiaomi"],
  [/nemotron|nvidia/, "NVIDIA"],
  [/^gigachat/, "Sber"],
  [/^voyage/, "Voyage AI"],
  [/^bge|^baai/, "BAAI"],
  [/^e5|^multilingual-e5/, "Microsoft"],
  [/^stella|^jasper/, "Community"],
  [/^nv-embed/, "NVIDIA"],
];

function providerOf(name) {
  const n = name.toLowerCase();
  for (const [re, p] of PROVIDER_RULES) if (re.test(n)) return p;
  return "Other";
}

/** Open-weight families, matched on the canonical slug. */
const OPEN_WEIGHT = /^(deepseek|qwen|qwq|llama|kimi|glm|minimax|mistral|magistral|devstral|gemma|phi|nemotron|bge|e5|stella|nv-embed|gpt-oss|olmo|internvl|intern|yi-|command-r|granite|ernie-4-5|hunyuan|seed-oss|step-3|mimo|apriel|ling-|ring-|dots|moonlight)/;

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9.+-]+/g, "-")
    .replace(/\.+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Normalise "2026-05" / "May 2026" into a "YYYY-MM" string, else null. */
function parseMeasuredAt(v) {
  if (!v || typeof v !== "string") return null;
  const s = v.trim();
  let m = /^(\d{4})-(\d{1,2})/.exec(s);
  if (m) return `${m[1]}-${String(+m[2]).padStart(2, "0")}`;
  m = /^(\d{4})$/.exec(s);
  if (m) return m[1];
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

const SCORE_FORM_MAP = {
  percentage: "percentage",
  elo: "elo",
  raw_points: "raw_points",
  win_rate: "percentage",
};

const main = async () => {
  const harvest = JSON.parse(readFileSync(HARVEST, "utf8"));
  console.log("[1] harvest parsed");
  const conn = await createConnection({ uri: process.env.DATABASE_URL, connectTimeout: 20000 });
  console.log("[2] connected");

  const [bmRows] = await conn.execute("SELECT id, slug, name FROM benchmarks");
  const bmBySlug = new Map(bmRows.map(b => [b.slug, b]));

  const [modelRows] = await conn.execute("SELECT id, slug FROM models");
  const modelBySlug = new Map(modelRows.map(m => [m.slug, m.id]));
  console.log(`[3] loaded ${bmRows.length} benchmarks, ${modelRows.length} models`);

  let admitted = 0;
  let rejectedNoUrl = 0;
  let rejectedNoScore = 0;
  const newModels = new Map();
  const pending = [];
  const touchedBenchmarks = new Set();
  const perBenchmark = [];

  for (const entry of harvest.results ?? []) {
    const o = entry.output ?? {};
    const bm = bmBySlug.get(o.benchmark_slug);
    if (!bm) continue;
    if (!o.found) continue;

    let parsed;
    try {
      parsed = JSON.parse(o.scores_json || "[]");
    } catch {
      continue;
    }
    if (!Array.isArray(parsed) || parsed.length === 0) continue;

    let kept = 0;

    for (const row of parsed) {
      const modelName = String(row.model ?? "").trim();
      const score = Number(row.score);
      const url = String(row.source_url ?? o.primary_source_url ?? "").trim();

      if (!modelName || !Number.isFinite(score)) {
        rejectedNoScore++;
        continue;
      }
      // Provenance is non-negotiable: no URL, no row.
      if (!/^https?:\/\//.test(url)) {
        rejectedNoUrl++;
        continue;
      }

      const mslug = slugify(modelName);
      if (!mslug) continue;

      if (!modelBySlug.has(mslug) && !newModels.has(mslug)) {
        newModels.set(mslug, {
          slug: mslug,
          name: modelName,
          provider: providerOf(modelName),
          license: OPEN_WEIGHT.test(mslug) ? "open" : "proprietary",
        });
      }

      pending.push({
        benchmarkId: bm.id,
        benchmarkSlug: bm.slug,
        modelSlug: mslug,
        rawScore: score,
        version: row.version ? String(row.version).slice(0, 64) : null,
        sourceUrl: url.slice(0, 500),
        sourceType: o.source_type === "none" ? "third_party_aggregator" : (o.source_type ?? "official_leaderboard"),
        sourceName: o.official_name ? String(o.official_name).slice(0, 200) : null,
        measuredAt: parseMeasuredAt(row.measured_at),
      });
      kept++;
      admitted++;
    }

    if (kept > 0) {
      touchedBenchmarks.add(bm.id);
      perBenchmark.push(`${bm.slug}: ${kept}`);
    }
  }

  // Insert newly seen models.
  if (newModels.size > 0) {
    console.log(`[4] inserting ${newModels.size} new models`);
    const values = Array.from(newModels.values());
    const chunk = 200;
    for (let i = 0; i < values.length; i += chunk) {
      const slice = values.slice(i, i + chunk);
      await conn.query(
        `INSERT IGNORE INTO models (slug, name, provider, license, status) VALUES ${slice
          .map(() => "(?,?,?,?,'current')")
          .join(",")}`,
        slice.flatMap(m => [m.slug, m.name, m.provider, m.license]),
      );
    }
    const [refreshed] = await conn.execute("SELECT id, slug FROM models");
    modelBySlug.clear();
    for (const m of refreshed) modelBySlug.set(m.slug, m.id);
  }

  // Idempotency: clear existing rows for the benchmarks we are about to fill.
  if (touchedBenchmarks.size > 0) {
    console.log(`[5] clearing scores for ${touchedBenchmarks.size} benchmarks`);
    const ids = Array.from(touchedBenchmarks);
    await conn.query(`DELETE FROM scores WHERE benchmarkId IN (${ids.map(() => "?").join(",")})`, ids);
  }

  // Insert scores, de-duplicating on (benchmark, model, version).
  const seen = new Set();
  const rows = [];
  for (const p of pending) {
    const modelId = modelBySlug.get(p.modelSlug);
    if (!modelId) continue;
    const key = `${p.benchmarkId}|${modelId}|${p.version ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push([
      p.benchmarkId,
      modelId,
      p.rawScore,
      p.version,
      p.sourceUrl,
      p.sourceType,
      p.sourceName,
      p.measuredAt,
    ]);
  }

  const chunk = 150;
  console.log(`[6] inserting ${rows.length} score rows`);
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk);
    await conn.query(
      `INSERT INTO scores (benchmarkId, modelId, rawScore, benchmarkVersion, sourceUrl, sourceType, sourceName, measuredAt)
       VALUES ${slice.map(() => "(?,?,?,?,?,?,?,?)").join(",")}`,
      slice.flat(),
    );
  }
  console.log("[7] insert done");

  const [[tally]] = await conn.query(
    `SELECT (SELECT COUNT(*) FROM scores) AS scores,
            (SELECT COUNT(*) FROM models) AS models,
            (SELECT COUNT(DISTINCT benchmarkId) FROM scores) AS coveredBenchmarks,
            (SELECT COUNT(*) FROM scores WHERE sourceUrl IS NULL OR sourceUrl = '') AS missingUrl`,
  );

  console.log("=== load report ===");
  console.log("admitted score rows :", admitted);
  console.log("inserted (deduped)  :", rows.length);
  console.log("rejected (no url)   :", rejectedNoUrl);
  console.log("rejected (bad score):", rejectedNoScore);
  console.log("new models          :", newModels.size);
  console.log("benchmarks filled   :", touchedBenchmarks.size);
  console.log("--- totals ---");
  console.log(tally);
  console.log("--- per benchmark ---");
  console.log(perBenchmark.join(" | "));

  await conn.end();
};

main().catch(e => {
  console.error(e);
  process.exit(1);
});
