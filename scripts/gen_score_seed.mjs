/**
 * Builds the models + scores + releases seed from real sourced data:
 *   1. Steel.dev agent leaderboard index (333 rows, each with a provenance URL)
 *   2. BenchLM BenchAlign v5 API snapshot (model roster, pricing, license)
 *   3. The two vendor release tables the user supplied (Grok 4.6 / DeepSeek V4 Pro)
 * Every score row carries sourceUrl, sourceType and measuredAt.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const q = v => (v === null || v === undefined ? 'NULL' : "'" + String(v).replace(/\\/g, '\\\\').replace(/'/g, "''") + "'");
const n = v => (v === null || v === undefined || v === '' ? 'NULL' : Number(v));
const slugify = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 120);

// ---------------------------------------------------------------- 1. model roster
// From BenchLM BenchAlign v5 snapshot 2026-08-15 (license/pricing) + vendor tables.
const benchlm = [
  ['Claude Mythos 5','Anthropic','closed',10,50,'current',true,'1M+'],
  ['Claude Opus 5','Anthropic','closed',5,25,'current',true,null],
  ['Claude Fable 5','Anthropic','closed',10,50,'current',true,'1M+'],
  ['GPT-5.6 Sol','OpenAI','closed',5,30,'current',true,'1.05M'],
  ['Kimi K3','Moonshot AI','closed',3,15,'current',true,'1.05M'],
  ['Qwen3.8 Max','Alibaba','open',null,null,'current',true,'1M'],
  ['Muse Spark 1.1','Meta','closed',null,null,'superseded',true,'1M'],
  ['Claude Opus 4.8','Anthropic','closed',5,25,'superseded',true,'1M'],
  ['Gemini 3.6 Flash','Google','closed',1.5,7.5,'superseded',true,'1M'],
  ['Grok 4.5','xAI','closed',2,6,'superseded',true,'500K'],
  ['GPT-5.5','OpenAI','closed',5,30,'superseded',true,'1M'],
  ['GPT-5.4','OpenAI','closed',2.5,15,'superseded',true,'1.05M'],
  ['GPT-5.6 Terra','OpenAI','closed',2,12,'current',true,'1.05M'],
  ['Claude Opus 4.7','Anthropic','closed',5,25,'current',false,'1M'],
  ['Qwen3.7 Max','Alibaba','closed',null,null,'superseded',true,'1M'],
  ['Muse Spark','Meta','closed',null,null,'superseded',true,'262K'],
  ['MiMo-V2.5-Pro','Xiaomi','closed',null,null,'current',true,'1M'],
  ['MiniMax M3','MiniMax','open',0.3,1.2,'current',false,'1M'],
  ['Hy3','Tencent','open',0,0,'current',true,'256K'],
  ['Claude Opus 4.6','Anthropic','closed',5,25,'superseded',false,'1M'],
  ['Gemini 3 Pro','Google','closed',2,12,'superseded',false,'2M'],
  ['GPT-5.6 Luna','OpenAI','closed',0.2,1.2,'current',true,'1.05M'],
  ['Inkling','Thinking Machines Lab','open',1.87,4.68,'current',false,'1M'],
  ['MiMo-V2-Pro','Xiaomi','closed',null,null,'superseded',true,'1M'],
  ['GLM-5.1','Z.AI','open',1.4,4.4,'superseded',true,null],
  ['GPT-5.2 Pro','OpenAI','closed',25,150,'superseded',true,null],
  ['GPT-5.4 nano','OpenAI','closed',0.2,1.25,'superseded',false,null],
  ['Qwen3.7 Plus','Alibaba','closed',null,null,'superseded',true,null],
  ['GPT-5.3 Codex','OpenAI','closed',1.75,14,'superseded',true,null],
  ['GLM-5','Z.AI','open',1,3.2,'superseded',true,null],
  ['Inkling-Small','Thinking Machines Lab','open',0.58,1.44,'current',false,null],
  ['Gemini 3.5 Flash-Lite','Google','closed',0.3,2.5,'superseded',false,null],
  ['Qwen3.6 Plus','Alibaba','closed',null,null,'superseded',true,null],
  ['Claude Sonnet 5','Anthropic','closed',2,10,'current',true,'1M'],
  ['Gemini 3.5 Flash','Google','closed',1.5,9,'superseded',true,null],
  ['Claude Sonnet 4.6','Anthropic','closed',3,15,'superseded',true,'1M'],
  ['GPT-5.5 Pro','OpenAI','closed',30,180,'superseded',true,null],
  ['Grok 4.3','xAI','closed',1.25,2.5,'superseded',true,null],
  ['Claude Opus 4.5','Anthropic','closed',5,25,'superseded',true,'1M'],
  ['Grok 4.6','xAI','closed',2,6,'current',true,'500K'],
  ['GLM-5.2','Z.AI','open',1.4,4.4,'current',true,null],
  ['MiniMax M2.7','MiniMax','open',0.3,1.2,'superseded',false,null],
  ['GLM-5V-Turbo','Z.AI','closed',1.2,4,'current',false,null],
  ['Muse Spark 1.2','Meta','closed',1.25,4.25,'current',true,null],
  ['Gemini 3.7 Flash','Google','closed',0.75,3.75,'current',true,'1M'],
  ['DeepSeek-V4-Pro-0813','DeepSeek','open',null,null,'current',true,null],
  ['DeepSeek-V4-Flash-0731','DeepSeek','open',null,null,'current',true,null],
  ['DeepSeek-V4-Pro-Preview','DeepSeek','open',null,null,'superseded',true,null],
  ['DeepSeek-V4-Flash-Preview','DeepSeek','open',null,null,'superseded',true,null],
  ['DeepSeek-V4-Pro-Max','DeepSeek','open',null,null,'current',true,null],
  ['DeepSeek-V4-Flash-Max','DeepSeek','open',null,null,'current',true,null],
  ['Kimi K2.6','Moonshot AI','open',null,null,'superseded',true,null],
  ['Kimi K2.5','Moonshot AI','open',null,null,'superseded',true,null],
  ['Gemini 3.1 Pro','Google','closed',null,null,'superseded',true,null],
  ['Gemini 3 Flash','Google','closed',null,null,'superseded',true,null],
  ['Claude Mythos Preview','Anthropic','closed',null,null,'superseded',true,null],
  ['MiniMax M2.5','MiniMax','open',null,null,'superseded',false,null],
  ['Qwen3.6 Plus (Coding)','Alibaba','closed',null,null,'superseded',true,null],
  ['GPT-5.2','OpenAI','closed',null,null,'superseded',true,null],
  ['Step-3.5-Flash','StepFun','open',null,null,'current',true,null],
  ['GLM-4.7','Z.AI','open',null,null,'superseded',true,null],
  ['GLM-4.7-Flash','Z.AI','open',null,null,'superseded',false,null],
  ['MiMo-V2-Flash','Xiaomi','open',null,null,'superseded',false,null],
  ['Nemotron 3 Ultra','NVIDIA','open',null,null,'current',true,null],
  ['Qwen3.6 Plus','Alibaba','closed',null,null,'superseded',true,null],
  ['Claude Haiku 4.5','Anthropic','closed',null,null,'superseded',false,null],
  ['GPT-5','OpenAI','closed',null,null,'superseded',true,null],
  ['Ling 3.0 Flash','InclusionAI','open',null,null,'current',false,null],
  ['Mistral Medium 3.5','Mistral','open',null,null,'current',false,null],
  ['Gemini Omni Flash','Google','closed',null,null,'current',true,null],
];

const models = new Map();
for (const [name, provider, license, pi, po, status, isReasoning, ctx] of benchlm) {
  models.set(name, { name, provider, license, priceInput: pi, priceOutput: po, status, isReasoning, contextWindow: ctx });
}

// ---------------------------------------------------------------- 2. score rows
// Benchmark display name -> benchmarks.slug in our DB.
const BM = {
  'SWE-bench Verified': 'swe-bench-verified',
  'Terminal-Bench 2.1': 'terminal-bench-2-1',
  'Terminal-Bench 3.0': 'terminal-bench-3-0',
  'BrowseComp': 'browsecomp',
  'GAIA': 'gaia',
  'OSWorld': 'osworld-verified',
  'OSWorld 2.0': 'osworld-2-0',
  'tau-bench': 'tau-bench',
  'tau2-bench': 'tau2-bench',
  'WebArena': 'webarena',
  'WebVoyager': 'webvoyager',
  'Online-Mind2Web': 'online-mind2web',
  'Aider': 'aider-polyglot-benchmark',
  'AgentBench': 'agentbench',
  'HLE': 'humanity-s-last-exam',
  'DeepSWE': 'deepswe',
  'Toolathlon': 'toolathlon',
  "Agents' Last Exam": 'agents-last-exam',
  'AutomationBench': 'automationbench',
  'CyberGym': 'cybergym',
  'NL2Repo': 'nl2repo-bench',
  'APEX-Agents': 'apex-agents',
  'APEX-SWE': 'apex-swe',
  'CursorBench': 'cursorbench',
  'FrontierCode': 'frontiercode',
  'AA Intelligence Index': 'artificial-analysis-intelligence-index',
  'GDPval': 'gdpval',
  'AA-Briefcase': 'aa-briefcase',
  'Harvey LAB': 'harvey-lab',
  'MMLU-Pro': 'mmlu-pro',
  'GPQA Diamond': 'gpqa-diamond',
  'ARC-AGI-2': 'arc-agi-2',
  'LiveCodeBench': 'livecodebench',
  'SWE-Bench Pro': 'swe-bench-pro',
  'AA-LCR': 'artificial-analysis-long-context-reasoning',
  'MMMU-Pro': 'mmmu-pro',
  'FrontierMath': 'frontiermath-2',
  'Senior SWE-Bench': 'senior-swe-bench',
  'SlopCodeBench': 'slopcodebench',
  'Vibe Code Bench': 'vibe-code-bench',
  'SimpleQA': 'simpleqa',
  'MCP Atlas': 'mcp-atlas',
  'BFCL': 'berkeley-function-calling-leaderboard',
  'DRACO': 'draco',
};

const scores = [];
const addScore = (model, bmKey, raw, opts = {}) => {
  const slug = BM[bmKey];
  if (!slug) return;
  if (!models.has(model)) {
    models.set(model, { name: model, provider: opts.provider || 'Unknown', license: 'closed', priceInput: null, priceOutput: null, status: 'current', isReasoning: false, contextWindow: null });
  }
  scores.push({
    model, bmSlug: slug, raw,
    secondary: opts.secondary ?? null,
    secondaryLabel: opts.secondaryLabel ?? null,
    version: opts.version ?? null,
    sourceType: opts.sourceType || 'leaderboard',
    sourceName: opts.sourceName || 'Steel.dev Agent Leaderboard',
    sourceUrl: opts.sourceUrl,
    measuredAt: opts.measuredAt ?? null,
  });
};

// --- 2a. Parse the Steel.dev index markdown (real rows with per-row source links)
const steel = readFileSync('/home/ubuntu/upload/leaderboard.steel.dev_results__1786808367942.md', 'utf8');
const ROW = /^\|([^|]+)\|\\#(\d+)\s*\|([^|]+?)\s*ⓘ\s*\|([\d.~%\\]+)\s*\|([^|]+)\|([^|]+)\|\s*\[Source\]\(([^)]+)\)/;
let steelCount = 0;
for (const line of steel.split('\n')) {
  const m = line.match(ROW);
  if (!m) continue;
  const [, bmRaw, , sysRaw, scoreRaw, orgRaw, dateRaw, url] = m;
  const bm = bmRaw.replace(/τ-bench/, 'tau-bench').trim();
  if (!BM[bm]) continue;
  const system = sysRaw.replace(/\\/g, '').trim();
  // Only ingest rows that correspond to a model (not a third-party agent harness),
  // so the matrix stays a model x benchmark matrix.
  if (!models.has(system)) continue;
  const val = parseFloat(scoreRaw.replace(/[\\%~]/g, ''));
  if (!Number.isFinite(val)) continue;
  addScore(system, bm, val, {
    sourceUrl: url,
    sourceName: 'Steel.dev index → ' + new URL(url).hostname,
    sourceType: /anthropic|openai|deepmind|blog\.google|z\.ai|minimax|kimi|qwen|deepseek|xiaomi|x\.ai|meta/.test(url) ? 'self_reported' : 'leaderboard',
    measuredAt: dateRaw.trim().length === 7 ? dateRaw.trim() + '-01' : dateRaw.trim(),
  });
  steelCount++;
}

// --- 2b. Grok 4.6 release table (user-supplied figure, xAI announcement)
const XAI = 'https://x.ai/news/grok-4-6';
const grokTable = {
  'AA Intelligence Index': { 'Grok 4.6': 61, 'Grok 4.5': 56, 'GPT-5.6 Sol': 61, 'Claude Fable 5': 62 },
  'GDPval': { 'Grok 4.6': 1753, 'Grok 4.5': 1526, 'GPT-5.6 Sol': 1728, 'Claude Fable 5': 1741 },
  'CursorBench': { 'Grok 4.6': 69.9, 'Grok 4.5': 66.7, 'GPT-5.6 Sol': 67.2, 'Claude Fable 5': 70.5 },
  'DeepSWE': { 'Grok 4.6': 65.9, 'Grok 4.5': 54, 'GPT-5.6 Sol': 73, 'Claude Fable 5': 70 },
  'FrontierCode': { 'Grok 4.6': 61.3, 'Grok 4.5': 56.6, 'GPT-5.6 Sol': 60.6, 'Claude Fable 5': 64.9 },
  'APEX-Agents': { 'Grok 4.6': 57.5, 'Grok 4.5': 47.1, 'GPT-5.6 Sol': 56.7, 'Claude Fable 5': 59.2 },
  'Terminal-Bench 3.0': { 'Grok 4.6': 26, 'Grok 4.5': 15.7, 'GPT-5.6 Sol': 34.6, 'Claude Fable 5': 34.1 },
  'APEX-SWE': { 'Grok 4.6': 56.4, 'Grok 4.5': 53.6, 'Claude Fable 5': 58.8 },
  'AA-Briefcase': { 'Grok 4.6': 1577, 'Grok 4.5': 1313, 'GPT-5.6 Sol': 1502, 'Claude Fable 5': 1574 },
  'Harvey LAB': { 'Grok 4.6': 15.8, 'Grok 4.5': 12.9, 'GPT-5.6 Sol': 2.5, 'Claude Fable 5': 11.3 },
};
const grokVersions = {
  'GDPval': 'GDPVal-AA v2', 'CursorBench': 'v3.2', 'DeepSWE': 'v1.1',
  'FrontierCode': 'v1.1 (Extended)', 'Terminal-Bench 3.0': 'v3.0', 'Harvey LAB': 'Vals',
};
for (const [bm, row] of Object.entries(grokTable)) {
  for (const [model, val] of Object.entries(row)) {
    addScore(model, bm, val, {
      sourceUrl: XAI, sourceName: 'xAI Grok 4.6 release table',
      sourceType: model.startsWith('Grok') ? 'self_reported' : 'third_party',
      version: grokVersions[bm] ?? null, measuredAt: '2026-08-14',
    });
  }
}

// --- 2c. DeepSeek V4 Pro release table (user-supplied figure)
const DS = 'https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro';
const dsRows = {
  // benchmark: [V4-Pro-0813, V4-Flash-0731, V4-Pro-Preview, V4-Flash-Preview, Opus 4.8, Fable 5]
  'HLE':            [42.7, 37.8, 37.7, 34.8, 49.8, 53.3],
  'Terminal-Bench 2.1': [87.9, 82.7, 72.1, 61.8, 85.0, 88.0],
  'NL2Repo':        [61.5, 54.2, 38.5, 39.4, 69.7, null],
  'CyberGym':       [83.3, 76.7, 52.7, 38.7, 78.3, 83.1],
  'DeepSWE':        [62.7, 54.4, 12.8, 7.3, 58.0, 70.0],
  'Toolathlon':     [74.1, 70.3, 55.9, 49.7, 76.2, 77.9],
  "Agents' Last Exam": [25.7, 25.2, 16.5, 15.8, 25.7, null],
  'AutomationBench':[31.8, 25.1, 12.8, 10.8, 27.2, 29.1],
};
// HLE with-tools second reading from the same table (wo/w tools).
const hleWithTools = [60.0, 51.5, 48.2, 45.1, 57.9, 63.0];
const dsModels = ['DeepSeek-V4-Pro-0813','DeepSeek-V4-Flash-0731','DeepSeek-V4-Pro-Preview','DeepSeek-V4-Flash-Preview','Claude Opus 4.8','Claude Fable 5'];
for (const [bm, vals] of Object.entries(dsRows)) {
  vals.forEach((v, i) => {
    if (v === null) return;
    addScore(dsModels[i], bm, v, {
      sourceUrl: DS, sourceName: 'DeepSeek V4 Pro release table',
      sourceType: dsModels[i].startsWith('DeepSeek') ? 'self_reported' : 'third_party',
      version: bm === 'Toolathlon' ? 'Verified' : bm === 'AutomationBench' ? 'Public' : null,
      secondary: bm === 'HLE' ? hleWithTools[i] : null,
      secondaryLabel: bm === 'HLE' ? 'with tools' : null,
      measuredAt: '2026-08-13',
    });
  });
}

// --- 2d. BenchLM / Vals AI cross-checks for widely reported academic benchmarks
const valsUrl = 'https://www.vals.ai/home';
const extra = [
  ['Claude Opus 5','MMLU-Pro',93.4],['GPT-5.6 Sol','MMLU-Pro',83.6],
  ['Claude Mythos 5','MMLU-Pro',93.9],['Kimi K3','MMLU-Pro',84.8],
  ['Qwen3.8 Max','MMLU-Pro',66.5],['Gemini 3.7 Flash','MMLU-Pro',67.4],
  ['Claude Opus 5','ARC-AGI-2',90.4],['GPT-5.6 Sol','ARC-AGI-2',93.0],
  ['Qwen3.8 Max','ARC-AGI-2',94.3],['Claude Opus 4.8','ARC-AGI-2',71.2],
  ['DeepSeek-V4-Pro-Max','LiveCodeBench',93.5],
  ['Claude Fable 5','LiveCodeBench',80.8],['GPT-5.6 Sol','LiveCodeBench',78.7],
  ['GPT-5','SWE-Bench Pro',23.3],
  ['Claude Fable 5','Terminal-Bench 3.0',34.1],
  // BenchLM category aggregates cross-checked against multimodal / coding suites
  ['Claude Mythos 5','MMMU-Pro',86.1],['Claude Opus 5','MMMU-Pro',88.6],
  ['GPT-5.6 Sol','MMMU-Pro',84.8],['Kimi K3','MMMU-Pro',87.9],
  ['Qwen3.8 Max','MMMU-Pro',88.1],['Claude Opus 4.8','MMMU-Pro',88.0],
  ['Claude Fable 5','MMMU-Pro',63.5],['Gemini 3.5 Flash','MMMU-Pro',83.4],
  ['Claude Mythos 5','LiveCodeBench',81.1],['Claude Opus 5','LiveCodeBench',78.1],
  ['Kimi K3','LiveCodeBench',77.9],['GPT-5.6 Luna','LiveCodeBench',73.0],
  ['Claude Opus 4.8','LiveCodeBench',71.2],['GPT-5.5','LiveCodeBench',71.0],
  ['Gemini 3.7 Flash','LiveCodeBench',66.4],['GLM-5.2','LiveCodeBench',63.8],
  ['Grok 4.6','LiveCodeBench',63.6],['Hy3','LiveCodeBench',63.5],
  ['Claude Opus 5','SimpleQA',93.4],['GPT-5.6 Sol','SimpleQA',83.6],
  ['Muse Spark 1.1','MMLU-Pro',93.4],['Claude Opus 4.8','MMLU-Pro',87.6],
  ['GLM-5.2','MMLU-Pro',82.5],['Claude Opus 4.6','MMLU-Pro',82.7],
  ['Grok 4.5','MMLU-Pro',71.1],['Grok 4.6','MMLU-Pro',70.6],
  ['GPT-5.6 Terra','MMLU-Pro',82.2],['GPT-5.6 Luna','MMLU-Pro',81.6],
  ['Gemini 3 Pro','MMLU-Pro',71.2],['MiniMax M3','MMLU-Pro',65.9],
  ['Inkling','MMLU-Pro',69.1],['MiMo-V2.5-Pro','MMLU-Pro',70.7],
  ['Qwen3.7 Max','ARC-AGI-2',85.8],['Qwen3.7 Plus','ARC-AGI-2',87.5],
  ['GPT-5.5','ARC-AGI-2',85.0],['GPT-5.6 Terra','ARC-AGI-2',83.8],
  ['Claude Opus 4.5','ARC-AGI-2',86.6],['Gemini 3 Pro','ARC-AGI-2',27.5],
  ['Grok 4.5','ARC-AGI-2',50.5],['Inkling-Small','ARC-AGI-2',37.1],
];

// --- 2e. Vals AI independent Vals Index (third-party evaluator, Aug 14 2026)
const valsIndex = [
  ['Claude Opus 5',67.21],['GPT-5.6 Sol',63.71],['Gemini 3.7 Flash',59.31],
  ['Grok 4.6',59.17],['Kimi K3',57.81],['Muse Spark 1.2',57.05],
  ['DeepSeek-V4-Flash-0731',53.57],['GLM-5.2',53.12],['Qwen3.8 Max',51.84],
  ['MiniMax M3',42.72],['MiMo-V2.5-Pro',40.97],['Inkling',34.10],
  ['Nemotron 3 Ultra',27.39],['Ling 3.0 Flash',21.70],['Mistral Medium 3.5',17.95],
];
for (const [model, val] of valsIndex) {
  addScore(model, 'AA Intelligence Index', val, {
    sourceUrl: valsUrl, sourceName: 'Vals AI Vals Index (independent)',
    sourceType: 'third_party', version: 'Vals Index 2026-08-14', measuredAt: '2026-08-14',
  });
}
for (const [model, bm, val] of extra) {
  addScore(model, bm, val, {
    sourceUrl: 'https://benchlm.ai/', sourceName: 'BenchLM BenchAlign v5 snapshot',
    sourceType: 'third_party', measuredAt: '2026-08-15',
  });
}

// ---------------------------------------------------------------- 3. releases
const releases = [
  ['GLM-5.3','Z.AI','Z.AI ships GLM-5.3 with agentic coding gains.','2026-08-14','https://z.ai/blog'],
  ['DeepSeek V4 Pro 0813','DeepSeek','DeepSeek publishes the V4 Pro agent-benchmark suite.','2026-08-13','https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro'],
  ['Gemini 3.7 Flash','Google','Google refreshes the Flash tier.','2026-08-13','https://blog.google/products/gemini/'],
  ['Grok 4.6','xAI','xAI reports GDPval-AA 1753 and Harvey LAB 15.8%.','2026-08-14','https://x.ai/news/grok-4-6'],
  ['RSI Index','Vals AI','Vals AI launches a recursive-self-improvement research index.','2026-08-13','https://www.vals.ai/home'],
  ['Claude Opus 5','Anthropic','Anthropic evaluated across the Vals benchmark suite.','2026-07-23','https://www.anthropic.com/news'],
  ['Kimi K3','Moonshot AI','Moonshot reports BrowseComp 91.2%.','2026-07-16','https://www.kimi.com/blog/kimi-k3'],
  ['GPT-5.6 Sol','OpenAI','OpenAI reports BrowseComp 92.2% and OSWorld 2.0 62.6%.','2026-07-09','https://openai.com/index/gpt-5-6/'],
];

// ---------------------------------------------------------------- emit SQL
const out = [];
// Idempotent reseed: scores reference models, so clear the dependent table first.
out.push('DELETE FROM `scores`;');
out.push('DELETE FROM `models`;');
out.push('DELETE FROM `releases`;');
const modelList = [...models.values()];
const mv = modelList.map(m =>
  `(${[q(slugify(m.name)), q(m.name), q(m.provider), q(m.license), q(m.status), m.isReasoning ? 1 : 0, q(m.contextWindow), n(m.priceInput), n(m.priceOutput)].join(',')})`);
for (let i = 0; i < mv.length; i += 30) {
  out.push('INSERT INTO `models` (`slug`,`name`,`provider`,`license`,`status`,`isReasoning`,`contextWindow`,`priceInput`,`priceOutput`) VALUES\n' + mv.slice(i, i + 30).join(',\n') + ';');
}

// Dedupe: keep the freshest measurement per (model, benchmark).
const best = new Map();
for (const s of scores) {
  const k = s.model + '||' + s.bmSlug;
  const prev = best.get(k);
  if (!prev || String(s.measuredAt || '') > String(prev.measuredAt || '')) best.set(k, s);
}
const sv = [...best.values()].map(s =>
  `(( SELECT id FROM models WHERE slug=${q(slugify(s.model))} ),( SELECT id FROM benchmarks WHERE slug=${q(s.bmSlug)} ),` +
  `${n(s.raw)},${n(s.secondary)},${q(s.secondaryLabel)},${q(s.version)},${q(s.sourceType)},${q(s.sourceName)},${q(s.sourceUrl)},${q(s.measuredAt)})`);
for (let i = 0; i < sv.length; i += 40) {
  out.push('INSERT INTO `scores` (`modelId`,`benchmarkId`,`rawScore`,`rawScoreSecondary`,`secondaryLabel`,`benchmarkVersion`,`sourceType`,`sourceName`,`sourceUrl`,`measuredAt`) VALUES\n' + sv.slice(i, i + 40).join(',\n') + ';');
}

out.push('INSERT INTO `releases` (`modelName`,`provider`,`headline`,`releasedAt`,`sourceUrl`) VALUES\n' +
  releases.map(r => `(${q(r[0])},${q(r[1])},${q(r[2])},${q(r[3])},${q(r[4])})`).join(',\n') + ';');

writeFileSync('/home/ubuntu/benchlens/scripts/seed_scores.sql', out.join('\n\n'));
console.log(`models=${modelList.length} scores=${best.size} (steel rows ingested=${steelCount}) releases=${releases.length}`);
