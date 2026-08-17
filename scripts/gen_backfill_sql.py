"""
Turn the audited backfill into UPDATE statements.

Only values that survived scripts/audit_backfill.py (i.e. have a retrievable
source URL and a plausible magnitude) are emitted. contextWindow keeps the
human-readable string the UI already shows; contextTokens carries the sortable
integer that the new charts need.
"""
import json

rows = json.load(open("/home/ubuntu/backfill_admissible.json"))

def esc(s):
    return str(s).replace("\\", "\\\\").replace("'", "''")

def human_ctx(n):
    if n >= 1_000_000:
        v = n / 1_000_000
        return f"{v:g}M"
    if n >= 1000:
        v = n / 1000
        return f"{v:g}K"
    return str(n)

out = []
stats = {"price": 0, "ctx": 0, "rel": 0, "note": 0}
for r in rows:
    sets = []
    if "priceInput" in r:
        sets.append(f"priceInput = {r['priceInput']:.3f}")
        if "priceOutput" in r:
            sets.append(f"priceOutput = {r['priceOutput']:.3f}")
        sets.append(f"priceSourceUrl = '{esc(r['priceSrc'])}'")
        stats["price"] += 1
    if "contextTokens" in r:
        sets.append(f"contextTokens = {r['contextTokens']}")
        sets.append(f"contextWindow = '{human_ctx(r['contextTokens'])}'")
        sets.append(f"contextSourceUrl = '{esc(r['contextSrc'])}'")
        stats["ctx"] += 1
    if "releasedAt" in r:
        sets.append(f"releasedAt = '{r['releasedAt']}'")
        sets.append(f"releaseSourceUrl = '{esc(r['releaseSrc'])}'")
        stats["rel"] += 1
    note = (r.get("notes") or "").strip()
    if note and note.lower() != "none":
        sets.append(f"commercialNote = '{esc(note[:600])}'")
        stats["note"] += 1
    if sets:
        out.append(f"UPDATE models SET {', '.join(sets)} WHERE slug = '{esc(r['slug'])}';")

path = "/home/ubuntu/benchlens/scripts/backfill_metadata.sql"
open(path, "w").write("\n".join(out) + "\n")
print(f"wrote {len(out)} UPDATE statements to {path}")
print(f"  price rows:   {stats['price']}")
print(f"  context rows: {stats['ctx']}")
print(f"  release rows: {stats['rel']}")
print(f"  with caveat:  {stats['note']}")
print("\nfirst 3:")
for s in out[:3]:
    print("  " + s[:200])
