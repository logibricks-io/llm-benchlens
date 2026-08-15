import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import * as db from "./db";

/**
 * Identity hygiene. Two different strings that denote the same real-world thing
 * must not occupy two points in the representation space — otherwise every
 * aggregate built on top (composite score, evidence confidence, source mix)
 * silently double-counts or splits evidence.
 */
describe("entity identity", () => {
  it("normalizes sourceType to a closed vocabulary", async () => {
    const rows = await db.listScores();
    const allowed = new Set(["official_leaderboard", "third_party_aggregator", "self_reported", "paper"]);
    const seen = new Set(rows.map(r => r.sourceType));

    for (const s of seen) {
      expect(allowed.has(s), `unexpected sourceType "${s}"`).toBe(true);
    }
    // Synonyms like "leaderboard"/"official" or "third_party"/"aggregator" must
    // already be folded, otherwise the source-mix chart shows one label twice.
    expect(seen.size).toBeLessThanOrEqual(4);
  });

  it("keeps no reasoning-effort alias alongside its canonical model", async () => {
    const models = await db.listModels();
    const slugs = new Set(models.map(m => m.slug));
    const EFFORT = /-(xhigh|high|max|low|medium|minimal|thinking)$/;

    const leaked: string[] = [];
    for (const m of models) {
      if (!EFFORT.test(m.slug)) continue;
      const canonical = m.slug.replace(EFFORT, "");
      if (slugs.has(canonical)) leaked.push(`${m.slug} vs ${canonical}`);
    }

    expect(leaked, `unmerged effort aliases: ${leaked.join(", ")}`).toEqual([]);
  });

  it("has no duplicate (model, benchmark, source) evidence rows", async () => {
    const rows = await db.listScores();
    const seen = new Set<string>();
    const dupes: string[] = [];

    for (const r of rows) {
      const key = `${r.modelId}|${r.benchmarkId}|${r.sourceUrl ?? ""}`;
      if (seen.has(key)) dupes.push(key);
      seen.add(key);
    }

    expect(dupes.length, `duplicate evidence rows: ${dupes.slice(0, 5).join(", ")}`).toBe(0);
  });

  it("still guarantees provenance on every row after the merge", async () => {
    const rows = await db.listScores();
    expect(rows.filter(r => !r.sourceUrl).length).toBe(0);
  });

  it("has a human-readable label for every sourceType actually stored", async () => {
    // A missing label leaks a raw snake_case value like "third_party_aggregator"
    // into the UI, which is exactly the kind of unexplained jargon this product
    // exists to remove.
    const badges = readFileSync(
      resolve(__dirname, "..", "client", "src", "components", "MetaBadges.tsx"),
      "utf8",
    );
    const rows = await db.listScores();

    for (const t of new Set(rows.map(r => r.sourceType))) {
      expect(badges.includes(`${t}:`), `SOURCE_LABELS missing "${t}"`).toBe(true);
    }
  });
});
