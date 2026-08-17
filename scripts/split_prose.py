"""Writes one file per benchmark holding its three Chinese prose fields.

Parallel subtasks each translate a single file; passing paths rather than raw
strings keeps the prompts small and avoids quoting problems.
"""
import json, os, pathlib

SRC = "/home/ubuntu/prose_zh.json"
OUT = pathlib.Path("/home/ubuntu/prose_chunks")
OUT.mkdir(exist_ok=True)

rows = json.load(open(SRC))
paths = []
chars = 0
for r in rows:
    payload = {
        "slug": r["slug"],
        "name": r["name"],
        "scenarioMapping": r.get("scenarioMapping") or "",
        "interpretationCaveat": r.get("interpretationCaveat") or "",
        "notes": r.get("notes") or "",
    }
    chars += sum(len(payload[k]) for k in ("scenarioMapping", "interpretationCaveat", "notes"))
    p = OUT / f"{r['slug']}.json"
    p.write_text(json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8")
    paths.append(str(p))

print(f"rows={len(rows)} chars={chars}")
open("/home/ubuntu/prose_paths.txt", "w").write("\n".join(paths))
print(f"wrote {len(paths)} chunk files")
