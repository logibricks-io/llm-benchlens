/*
 * Type-scale bump for the two non-desktop form factors.
 *
 * The desktop floor from v3 is 14px, but a phone is held further from the eye
 * than a monitor and has no hover to fall back on, so the mobile floor is set
 * higher: 15px for body copy, 13px for chrome/labels. Apple's own guidance puts
 * iOS body text at 17px, which is the direction this moves in without blowing
 * up a layout that was designed around a 12px scale.
 *
 * The desktop widget is the opposite case: it lives in a small always-on panel
 * where density matters more, so it only gets the 14px floor.
 *
 * Rewrites happen inside `text-[NNpx]` occurrences only, so nothing outside a
 * className string can be touched.
 */
import { readFileSync, writeFileSync } from "node:fs";

const JOBS = [
  { file: "client/src/pages/Mobile.tsx", map: { 10: 13, 11: 13, 12: 13, 13: 15 } },
  { file: "client/src/pages/Desktop.tsx", map: { 10: 12, 11: 12, 12: 13, 13: 14 } },
];

for (const { file, map } of JOBS) {
  const src = readFileSync(file, "utf8");
  const counts = {};
  const out = src.replace(/text-\[(\d+)px\]/g, (whole, px) => {
    const to = map[Number(px)];
    if (!to) return whole;
    counts[`${px}→${to}`] = (counts[`${px}→${to}`] ?? 0) + 1;
    return `text-[${to}px]`;
  });
  writeFileSync(file, out);
  const summary = Object.entries(counts).map(([k, v]) => `${k}: ${v}`).join(", ");
  console.log(`${file}  ${summary || "no change"}`);
}
