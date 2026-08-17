import { describe, expect, it } from "vitest";
import * as db from "./db";
import { en } from "../client/src/i18n/en";
import { zh } from "../client/src/i18n/zh";

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
    // exists to remove. Labels now live in the i18n packs, so check both.
    const rows = await db.listScores();

    for (const type of new Set(rows.map(r => r.sourceType))) {
      expect(en.sourceType[type as keyof typeof en.sourceType], `en.sourceType missing "${type}"`).toBeTruthy();
      expect(zh.sourceType[type as keyof typeof zh.sourceType], `zh.sourceType missing "${type}"`).toBeTruthy();
    }
  });

  it("has a label for every value of every meta-model enum, not just sourceType", async () => {
    /*
     * Same failure mode as sourceType, found on the FreshStack detail page: newly
     * loaded benchmarks used strictness "strict" and stance
     * "independent_academic", which no label table knew about, so the page showed
     * bare English identifiers next to Chinese ones. The vocabularies are closed
     * by design — assert that, rather than trusting each loader script to have
     * picked from the right list.
     *
     * The lookup used to grep shared/metaModel.ts for `<value>:`. Those Chinese
     * label tables have been deleted (display copy in the shared layer is what
     * leaked Chinese into the English UI), so resolve against the i18n packs —
     * which is also what the pages actually render from.
     */
    const benchmarks = await db.listBenchmarks();

    /* [db field, dictionary namespace, accessor] */
    const fields: Array<[string, keyof typeof en, (b: (typeof benchmarks)[number]) => string]> = [
      ["scoringMechanism", "mechanism", b => b.scoringMechanism],
      ["strictness", "strictness", b => b.strictness],
      ["issuerStance", "stance", b => b.issuerStance],
      ["contaminationRisk", "contamination", b => b.contaminationRisk],
      ["saturationStatus", "saturation", b => b.saturationStatus],
      ["capabilityDomain", "capability", b => b.capabilityDomain],
    ];

    const missing: string[] = [];
    for (const [field, ns, get] of fields) {
      const enNs = en[ns] as Record<string, string>;
      const zhNs = (zh as unknown as Record<string, Record<string, string>>)[ns];
      for (const value of new Set(benchmarks.map(get))) {
        if (!value) continue;
        if (!enNs?.[value]) missing.push(`en ${field}="${value}"`);
        if (!zhNs?.[value]) missing.push(`zh ${field}="${value}"`);
      }
    }

    expect(missing, `unlabelled enum values: ${missing.join(", ")}`).toEqual([]);
  });
});
