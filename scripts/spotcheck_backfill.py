"""Spot-check the least plausible-looking entries before trusting the batch."""
import json

d = json.load(open("/home/ubuntu/backfill_model_metadata.json"))
by = {}
for r in d["results"]:
    o = r.get("output") or {}
    if o.get("slug"):
        by[o["slug"]] = o

SUSPECT = ["fable-5", "claude-fable-5", "claude-mythos-5", "claude-mythos-preview",
           "muse-spark", "muse-spark-1-1", "muse-spark-1-2", "inkling",
           "longcat-flash-thinking-2601", "gpt-5-6-sol", "gpt-5-6-terra",
           "gpt-5-6-luna", "qwen3-8-max", "kimi-k3", "minimax-m3"]

for s in SUSPECT:
    o = by.get(s)
    print("=" * 72)
    if not o:
        print(f"{s}: NOT IN RESULTS")
        continue
    print(f"{s}")
    print(f"  price   {o.get('price_input')} / {o.get('price_output')}")
    print(f"    src   {o.get('price_source_url')}")
    print(f"  context {o.get('context_tokens')}")
    print(f"    src   {o.get('context_source_url')}")
    print(f"  release {o.get('released_at')}")
    print(f"    src   {o.get('release_source_url')}")
    print(f"  exists  {o.get('model_exists')}")
    print(f"  notes   {(o.get('notes') or '')[:220]}")
