"""Pick the backfill target list from the live models.list response."""
import json

d = json.load(open("/tmp/models.json"))

def find(o):
    if isinstance(o, list) and o and isinstance(o[0], dict) and "slug" in o[0]:
        return o
    if isinstance(o, dict):
        for v in o.values():
            r = find(v)
            if r:
                return r
    return None

rows = find(d)
print(f"total models: {len(rows)}")

have_price = [r for r in rows if r["priceInput"] is not None]
have_ctx = [r for r in rows if r["contextWindow"]]
have_rel = [r for r in rows if r["releasedAt"]]
print(f"have price: {len(have_price)}  ctx: {len(have_ctx)}  release: {len(have_rel)}")

# coverage == number of benchmarks this model has evidence on
by_cov = sorted(rows, key=lambda r: (-(r.get("coverage") or 0), r["name"]))

targets = [r for r in by_cov
           if (r.get("coverage") or 0) >= 2
           and (r["priceInput"] is None or not r["contextWindow"] or not r["releasedAt"])]
print(f"models with >=2 evidence needing backfill: {len(targets)}")

out = [{
    "slug": r["slug"],
    "name": r["name"],
    "provider": r["provider"],
    "license": r["license"],
    "coverage": r.get("coverage") or 0,
    "needPrice": r["priceInput"] is None,
    "needContext": not r["contextWindow"],
    "needRelease": not r["releasedAt"],
} for r in targets]

json.dump(out, open("/home/ubuntu/backfill_targets.json", "w"), ensure_ascii=False, indent=2)
print("wrote /home/ubuntu/backfill_targets.json")

print("\ncoverage>=2 breakdown:")
print(f"  need price:   {sum(1 for r in out if r['needPrice'])}")
print(f"  need context: {sum(1 for r in out if r['needContext'])}")
print(f"  need release: {sum(1 for r in out if r['needRelease'])}")

print("\ntop 60:")
for r in out[:60]:
    need = "+".join(k for k, v in
                    [("price", r["needPrice"]), ("ctx", r["needContext"]), ("rel", r["needRelease"])] if v)
    print(f"  {r['coverage']:>3}  {r['slug'][:38]:38} {r['provider'][:14]:14} {need}")
