/** List zh-pack entries that contain no CJK, i.e. probably left in English. */
import { zh } from "../client/src/i18n/zh.ts";

const cjk = /[\u4e00-\u9fff]/;

function walk(obj, prefix = "") {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") {
      if (!cjk.test(v)) out.push([path, v]);
    } else if (v && typeof v === "object") {
      out.push(...walk(v, path));
    }
  }
  return out;
}

const hits = walk(zh);
for (const [p, v] of hits) console.log(p.padEnd(36), JSON.stringify(v));
console.log(`\n${hits.length} entr(ies) without CJK`);
