/**
 * Load both packs for real and diff their structure.
 *
 * Text-level grepping of the .ts files proved unreliable (indentation varies),
 * so this actually imports them and compares object shapes — the same thing the
 * TypeScript checker does, but with a readable report.
 */
import { en } from "../client/src/i18n/en.ts";
import { zh } from "../client/src/i18n/zh.ts";

const enKeys = Object.keys(en).sort();
const zhKeys = Object.keys(zh).sort();

console.log(`en namespaces: ${enKeys.length}`);
console.log(`zh namespaces: ${zhKeys.length}`);

const missingInZh = enKeys.filter(k => !zhKeys.includes(k));
const extraInZh = zhKeys.filter(k => !enKeys.includes(k));
if (missingInZh.length) console.log("missing in zh:", missingInZh.join(", "));
if (extraInZh.length) console.log("extra in zh:", extraInZh.join(", "));

console.log("\nper-namespace key counts:");
let mismatches = 0;
for (const ns of enKeys) {
  const e = en[ns] && typeof en[ns] === "object" ? Object.keys(en[ns]) : [];
  const z = zh[ns] && typeof zh[ns] === "object" ? Object.keys(zh[ns]) : [];
  const onlyEn = e.filter(k => !z.includes(k));
  const onlyZh = z.filter(k => !e.includes(k));
  const flag = onlyEn.length || onlyZh.length ? "  <-- MISMATCH" : "";
  if (flag) mismatches += 1;
  console.log(`  ${ns.padEnd(22)} en=${String(e.length).padStart(3)} zh=${String(z.length).padStart(3)}${flag}`);
  if (onlyEn.length) console.log(`      only in en: ${onlyEn.join(", ")}`);
  if (onlyZh.length) console.log(`      only in zh: ${onlyZh.join(", ")}`);
}

console.log(`\n${mismatches} namespace(s) with key mismatches`);
