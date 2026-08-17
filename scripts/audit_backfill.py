"""
Audit the parallel backfill before anything touches the database.

Rules the project already lives by: a value without a retrievable source URL is
not admissible. So here we (a) count what came back, (b) drop any value whose
source field is NA/empty, (c) flag models the researchers could not verify exist,
(d) sanity-check magnitudes so a mis-scaled price cannot slip in.
"""
import json, re
from collections import Counter

d = json.load(open("/home/ubuntu/backfill_model_metadata.json"))
res = [r for r in d["results"] if r.get("output")]
print(f"subtasks returned: {len(res)}")

URL = re.compile(r"^https?://", re.I)

def has_url(v):
    return isinstance(v, str) and URL.match(v.strip())

def num(v):
    """Subtasks sometimes return numbers as strings; coerce or give None."""
    if isinstance(v, (int, float)):
        return float(v)
    if isinstance(v, str):
        s = v.strip().replace(",", "").replace("$", "")
        try:
            return float(s)
        except ValueError:
            return None
    return None

not_exist, admissible, rejected = [], [], []
for r in res:
    o = r["output"]
    slug = o.get("slug", "?")
    if o.get("model_exists") is False:
        not_exist.append((slug, o.get("notes", "")[:110]))
        continue
    rec = {"slug": slug}
    drops = []

    pi, po = num(o.get("price_input")), num(o.get("price_output"))
    if pi is not None and pi >= 0 and has_url(o.get("price_source_url")):
        # sanity: published per-1M prices sit roughly in 0.01 .. 200 USD
        if 0 <= pi <= 200 and (po is None or po < 0 or 0 <= po <= 600):
            rec["priceInput"] = pi
            if po is not None and po >= 0:
                rec["priceOutput"] = po
            rec["priceSrc"] = o["price_source_url"].strip()
        else:
            drops.append(f"price out of range ({pi}/{po})")
    elif pi is not None and pi >= 0:
        drops.append("price without source")

    ct = num(o.get("context_tokens"))
    if ct is not None and ct > 0 and has_url(o.get("context_source_url")):
        if 1000 <= ct <= 20_000_000:
            rec["contextTokens"] = int(ct)
            rec["contextSrc"] = o["context_source_url"].strip()
        else:
            drops.append(f"context out of range ({ct})")
    elif ct is not None and ct > 0:
        drops.append("context without source")

    ra = (o.get("released_at") or "").strip()
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", ra) and has_url(o.get("release_source_url")):
        if "2019-01-01" <= ra <= "2026-12-31":
            rec["releasedAt"] = ra
            rec["releaseSrc"] = o["release_source_url"].strip()
        else:
            drops.append(f"release date implausible ({ra})")
    elif re.fullmatch(r"\d{4}-\d{2}-\d{2}", ra):
        drops.append("release date without source")

    if len(rec) > 1:
        rec["notes"] = (o.get("notes") or "").strip()
        admissible.append(rec)
    if drops:
        rejected.append((slug, drops))

print(f"\nmodels researchers could NOT verify exist: {len(not_exist)}")
for s, n in not_exist:
    print(f"  {s:34} {n}")

print(f"\nmodels with at least one admissible sourced value: {len(admissible)}")
print(f"  with price:   {sum('priceInput' in r for r in admissible)}")
print(f"  with context: {sum('contextTokens' in r for r in admissible)}")
print(f"  with release: {sum('releasedAt' in r for r in admissible)}")

print(f"\nvalues dropped for missing source or bad range: {len(rejected)}")
for s, ds in rejected[:25]:
    print(f"  {s:34} {'; '.join(ds)}")

json.dump(admissible, open("/home/ubuntu/backfill_admissible.json", "w"),
          ensure_ascii=False, indent=2)
print("\nwrote /home/ubuntu/backfill_admissible.json")

# how many domains do the sources come from? a spread of one domain would be suspicious
doms = Counter()
for r in admissible:
    for k in ("priceSrc", "contextSrc", "releaseSrc"):
        if r.get(k):
            doms[re.sub(r"^https?://(www\.)?([^/]+).*$", r"\2", r[k])] += 1
print("\ntop source domains:")
for dom, n in doms.most_common(15):
    print(f"  {n:>4}  {dom}")
