// Count CJK-bearing lines per file so the i18n extraction can be scoped.
// grep's locale collation chokes on the CJK range in this sandbox, so do it in JS.
import { readFileSync, globSync } from "node:fs";

const CJK = /[\u4e00-\u9fff]/;
const files = globSync(["client/src/**/*.{ts,tsx}", "shared/**/*.ts"], { cwd: process.cwd() })
  .filter(f => !f.includes("/components/ui/")) // shadcn primitives carry no product copy
  .filter(f => !f.includes("/_core/"));

const rows = [];
let total = 0;
for (const f of files) {
  const lines = readFileSync(f, "utf8").split("\n");
  const n = lines.filter(l => CJK.test(l)).length;
  if (n > 0) {
    rows.push([n, f]);
    total += n;
  }
}
rows.sort((a, b) => b[0] - a[0]);
for (const [n, f] of rows) console.log(String(n).padStart(4), f);
console.log(`\n${total} CJK-bearing lines across ${rows.length} files`);
