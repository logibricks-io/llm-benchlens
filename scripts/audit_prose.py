"""Audits the parallel translation results before they touch the database.

Checks, in order of how badly each would corrupt the data:
  1. slug must match a row that exists in the export (a "corrected" slug would
     silently update nothing, which is what happened with the orphan prices)
  2. no CJK left in any English field
  3. no markdown fences (a previous batch returned ```tsx wrappers)
  4. empty-in / empty-out must agree, so nothing was invented or dropped
"""
import json, re, sys

CJK = re.compile(r"[\u4e00-\u9fff]")
FENCE = re.compile(r"```")
FULLWIDTH = re.compile(r"[（），。；：、]")

src = {r["slug"]: r for r in json.load(open("/home/ubuntu/prose_zh.json"))}
res = json.load(open("/home/ubuntu/translate_benchmark_prose.json"))["results"]

FIELDS = [
    ("scenario_mapping_en", "scenarioMapping"),
    ("interpretation_caveat_en", "interpretationCaveat"),
    ("notes_en", "notes"),
]

bad_slug, cjk, fence, fullwidth, mismatch, ok = [], [], [], [], [], 0
for r in res:
    o = r.get("output") or {}
    slug = (o.get("slug") or "").strip()
    if slug not in src:
        bad_slug.append((r.get("input", "?"), slug))
        continue
    row = src[slug]
    trouble = False
    for en_key, zh_key in FIELDS:
        en = (o.get(en_key) or "").strip()
        zh = (row.get(zh_key) or "").strip()
        if CJK.search(en):
            cjk.append((slug, en_key, en[:70])); trouble = True
        if FENCE.search(en):
            fence.append((slug, en_key)); trouble = True
        if FULLWIDTH.search(en):
            fullwidth.append((slug, en_key, FULLWIDTH.findall(en)[:5])); trouble = True
        if bool(zh) != bool(en):
            mismatch.append((slug, en_key, f"zh={len(zh)} en={len(en)}")); trouble = True
    if not trouble:
        ok += 1

print(f"results={len(res)} clean={ok}")
print(f"unmatched slug={len(bad_slug)} cjk={len(cjk)} fences={len(fence)} fullwidth={len(fullwidth)} empty-mismatch={len(mismatch)}")
for label, items in (("UNMATCHED SLUG", bad_slug), ("CJK LEFT", cjk), ("FENCE", fence),
                     ("FULLWIDTH PUNCT", fullwidth), ("EMPTY MISMATCH", mismatch)):
    if items:
        print(f"\n--- {label} ---")
        for it in items[:12]:
            print("  ", it)
