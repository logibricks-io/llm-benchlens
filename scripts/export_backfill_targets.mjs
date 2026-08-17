/**
 * Export the list of models that need price / context / release-date backfill.
 * The SQL tool truncates at 20 rows, so go through the app's own db layer.
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const conn = await mysql.createConnection({
  uri: process.env.DATABASE_URL,
  connectTimeout: 20000,
});

const [rows] = await conn.query(`
  SELECT m.slug, m.name, m.provider, m.license, m.isReasoning,
         m.priceInput, m.priceOutput, m.contextWindow, m.releasedAt,
         COUNT(s.id) AS n
  FROM models m JOIN scores s ON s.modelId = m.id
  GROUP BY m.id
  HAVING n >= 2
  ORDER BY n DESC, m.name ASC
`);

const missing = rows.filter(
  r => r.priceInput === null || !r.contextWindow || !r.releasedAt,
);

console.log(`models with >=2 evidence: ${rows.length}`);
console.log(`of those, missing something: ${missing.length}`);
console.log(`  missing price:   ${rows.filter(r => r.priceInput === null).length}`);
console.log(`  missing context: ${rows.filter(r => !r.contextWindow).length}`);
console.log(`  missing release: ${rows.filter(r => !r.releasedAt).length}`);

const out = missing.map(r => ({
  slug: r.slug,
  name: r.name,
  provider: r.provider,
  license: r.license,
  evidence: Number(r.n),
  needPrice: r.priceInput === null,
  needContext: !r.contextWindow,
  needRelease: !r.releasedAt,
}));

const fs = await import("node:fs");
fs.writeFileSync("/home/ubuntu/backfill_targets.json", JSON.stringify(out, null, 2));
console.log("\nwrote /home/ubuntu/backfill_targets.json");
console.log("\ntop 40 by evidence count:");
for (const r of out.slice(0, 40)) {
  const need = [r.needPrice && "price", r.needContext && "ctx", r.needRelease && "rel"]
    .filter(Boolean).join("+");
  console.log(`  ${String(r.evidence).padStart(3)}  ${r.slug.padEnd(34)} ${r.provider.padEnd(16)} ${need}`);
}

await conn.end();
