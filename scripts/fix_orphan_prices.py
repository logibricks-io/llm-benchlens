"""
Resolve the 8 models that held a price with no source URL.

Policy: a figure that cannot be traced is removed, not kept. Tencent Hy3 also
held 0.000/0.000, which is worse than missing — a zero wins every "cheapest"
comparison and breaks a log price axis — so it is cleared unconditionally.
"""
import json, re

d = json.load(open("/home/ubuntu/verify_orphan_prices.json"))
URL = re.compile(r"^https?://", re.I)

# Subtasks sometimes "tidy" the slug they were given (glm-5-1 -> glm-5.1).
# Such an UPDATE matches zero rows and fails silently, so pin the slug to the
# input line instead of trusting the returned field.
INPUT_SLUGS = {}
for r in d["results"]:
    first = (r.get("input") or "").split("|")[0].strip()
    out = r.get("output") or {}
    if first:
        INPUT_SLUGS[id(r)] = first

def num(v):
    if isinstance(v, (int, float)):
        return float(v)
    if isinstance(v, str):
        try:
            return float(v.strip().replace("$", "").replace(",", ""))
        except ValueError:
            return None
    return None

def esc(s):
    return str(s).replace("\\", "\\\\").replace("'", "''")

def human_ctx(n):
    if n >= 1_000_000:
        return f"{n/1_000_000:g}M"
    if n >= 1000:
        return f"{n/1000:g}K"
    return str(n)

stmts = []
report = []

# Hy3: recorded 0.000/0.000 with no source. Clear it.
stmts.append(
    "UPDATE models SET priceInput = NULL, priceOutput = NULL, "
    "commercialNote = 'Price was recorded as 0.00 with no source; cleared pending a "
    "verifiable figure. A zero would otherwise win every price comparison.' "
    "WHERE slug = 'hy3';"
)
report.append(("hy3", "CLEARED", "recorded 0.000/0.000, unsourced"))

for r in d["results"]:
    o = r.get("output") or {}
    slug = INPUT_SLUGS.get(id(r)) or o.get("slug")
    if not slug:
        continue
    src = (o.get("price_source_url") or "").strip()
    pi, po = num(o.get("correct_price_input")), num(o.get("correct_price_output"))
    ct = num(o.get("context_tokens"))
    ra = (o.get("released_at") or "").strip()
    csrc = (o.get("context_source_url") or "").strip()
    rsrc = (o.get("release_source_url") or "").strip()
    note = (o.get("notes") or "").strip()

    sets = []
    if URL.match(src) and pi is not None and pi >= 0:
        sets.append(f"priceInput = {pi:.3f}")
        if po is not None and po >= 0:
            sets.append(f"priceOutput = {po:.3f}")
        sets.append(f"priceSourceUrl = '{esc(src)}'")
        status = "SOURCED" if o.get("price_confirmed") else "CORRECTED"
    else:
        sets.append("priceInput = NULL")
        sets.append("priceOutput = NULL")
        status = "CLEARED"

    if URL.match(csrc) and ct is not None and 1000 <= ct <= 20_000_000:
        sets.append(f"contextTokens = {int(ct)}")
        sets.append(f"contextWindow = '{human_ctx(int(ct))}'")
        sets.append(f"contextSourceUrl = '{esc(csrc)}'")
    if URL.match(rsrc) and re.fullmatch(r"\d{4}-\d{2}-\d{2}", ra):
        sets.append(f"releasedAt = '{ra}'")
        sets.append(f"releaseSourceUrl = '{esc(rsrc)}'")
    if note and note.lower() != "none":
        sets.append(f"commercialNote = '{esc(note[:600])}'")

    stmts.append(f"UPDATE models SET {', '.join(sets)} WHERE slug = '{esc(slug)}';")
    report.append((slug, status, note[:90] or "-"))

path = "/home/ubuntu/benchlens/scripts/fix_orphan_prices.sql"
open(path, "w").write("\n".join(stmts) + "\n")

print(f"{'slug':26} {'action':10} note")
for s, st, n in report:
    print(f"{s:26} {st:10} {n}")
print(f"\nwrote {len(stmts)} statements to {path}")
