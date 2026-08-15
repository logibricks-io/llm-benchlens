/**
 * Generates the benchmark meta-model seed SQL from the research dataset.
 * Source: /home/ubuntu/benchmark_base.json (produced by the meta-model scoring pass)
 */
import { readFileSync, writeFileSync } from 'node:fs';

const rows = JSON.parse(readFileSync('/home/ubuntu/benchmark_base.json', 'utf8'));

const q = v => {
  if (v === null || v === undefined) return 'NULL';
  return "'" + String(v).replace(/\\/g, '\\\\').replace(/'/g, "''") + "'";
};
const b = v => (v ? '1' : '0');
const clean = (v, fallback = null) => {
  if (v === null || v === undefined) return fallback;
  const s = String(v).trim();
  if (!s || ['unknown', 'na', 'n/a', 'none'].includes(s.toLowerCase())) return fallback;
  return s;
};
const trunc = (v, n) => (v === null ? null : String(v).slice(0, n));

const seen = new Set();
const values = [];
for (const r of rows) {
  let slug = r.slug || '';
  if (!slug) continue;
  // Two OSWorld 2.0 entries came back from different sources; disambiguate.
  let base = slug, i = 2;
  while (seen.has(slug)) slug = `${base}-${i++}`;
  seen.add(slug);

  values.push(
    '(' +
      [
        q(slug),
        q(trunc(r.benchmark_name, 200)),
        q(trunc(clean(r.version), 120)),
        q(trunc(clean(r.issuer), 200)),
        q(r.issuer_stance),
        q(r.capability_domain),
        q(trunc(clean(r.task_count), 120)),
        q(r.scoring_mechanism),
        q(r.strictness),
        q(trunc(clean(r.metric_unit), 200)),
        q(r.score_form),
        q(clean(r.human_baseline)),
        q(trunc(clean(r.current_sota_score), 200)),
        q(r.saturation_status),
        q(r.contamination_risk),
        b(r.uses_llm_judge),
        b(r.has_negative_assertions),
        b(r.is_agentic),
        b(r.is_open_source),
        b(r.reports_cost),
        b(r.ci_disclosed),
        q(trunc(clean(r.confidence_interval), 120)),
        r.trust_score,
        r.discriminative_power,
        r.difficulty_coefficient,
        r.utility_score,
        q(clean(r.scenario_mapping)),
        q(clean(r.interpretation_caveat)),
        q(clean(r.notes)),
        q(trunc(clean(r.official_url), 500)),
        q(trunc(clean(r.paper_url), 500)),
      ].join(',') +
      ')',
  );
}

const cols = [
  'slug','name','version','issuer','issuerStance','capabilityDomain','taskCount',
  'scoringMechanism','strictness','metricUnit','scoreForm','humanBaseline','currentSotaScore',
  'saturationStatus','contaminationRisk','usesLlmJudge','hasNegativeAssertions','isAgentic',
  'isOpenSource','reportsCost','ciDisclosed','confidenceInterval','trustScore',
  'discriminativePower','difficultyCoefficient','utilityScore','scenarioMapping',
  'interpretationCaveat','notes','officialUrl','paperUrl',
].map(c => '`' + c + '`').join(',');

// Chunk to keep each statement well under packet limits.
const chunks = [];
for (let i = 0; i < values.length; i += 15) {
  chunks.push(`INSERT INTO \`benchmarks\` (${cols}) VALUES\n${values.slice(i, i + 15).join(',\n')};`);
}

writeFileSync('/home/ubuntu/benchlens/scripts/seed_benchmarks.sql', chunks.join('\n\n'));
console.log(`generated ${values.length} benchmark rows in ${chunks.length} statements`);
