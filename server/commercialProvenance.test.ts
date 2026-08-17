import { describe, expect, it } from "vitest";
import { listModels } from "./db";

/**
 * The scores table has always required a per-row sourceUrl. Price, context
 * window and release date arrived later and initially had nowhere to record
 * provenance, which let 8 unsourced prices (one of them 0.00) sit in the table.
 * These tests hold the same bar for commercial facts as for benchmark scores.
 */
describe("commercial field provenance", () => {
  it("every recorded price has a source URL", async () => {
    const rows = await listModels();
    const orphans = rows
      .filter(m => m.priceInput !== null && m.priceInput !== undefined)
      .filter(m => !m.priceSourceUrl)
      .map(m => m.slug);
    expect(orphans, `prices without a source: ${orphans.join(", ")}`).toEqual([]);
  });

  it("every recorded context window has a source URL", async () => {
    const rows = await listModels();
    const orphans = rows
      .filter(m => m.contextTokens !== null && m.contextTokens !== undefined)
      .filter(m => !m.contextSourceUrl)
      .map(m => m.slug);
    expect(orphans, `context windows without a source: ${orphans.join(", ")}`).toEqual([]);
  });

  it("every recorded release date has a source URL", async () => {
    const rows = await listModels();
    const orphans = rows
      .filter(m => m.releasedAt && m.releasedAt !== "NULL")
      .filter(m => !m.releaseSourceUrl)
      .map(m => m.slug);
    expect(orphans, `release dates without a source: ${orphans.join(", ")}`).toEqual([]);
  });

  it("no model is priced at zero", async () => {
    // A 0.00 price is not "free" — it is an uncollected value that would win
    // every cheapest-model comparison and break a logarithmic price axis.
    const rows = await listModels();
    const zeros = rows
      .filter(m => m.priceInput !== null && Number(m.priceInput) === 0)
      .map(m => m.slug);
    expect(zeros, `models priced at 0.00: ${zeros.join(", ")}`).toEqual([]);
  });

  it("recorded prices stay within a plausible published range", async () => {
    const rows = await listModels();
    const absurd = rows
      .filter(m => m.priceInput !== null)
      .filter(m => {
        const v = Number(m.priceInput);
        return !Number.isFinite(v) || v < 0.01 || v > 200;
      })
      .map(m => `${m.slug}=${m.priceInput}`);
    expect(absurd, `implausible input prices: ${absurd.join(", ")}`).toEqual([]);
  });

  it("context windows are stored as sortable token counts, not just strings", async () => {
    const rows = await listModels();
    // Anything with a human string must also carry the integer, otherwise the
    // scatter plot silently drops it.
    const stringOnly = rows
      .filter(m => m.contextWindow && m.contextWindow !== "NULL")
      .filter(m => m.contextTokens === null || m.contextTokens === undefined)
      .map(m => m.slug);
    expect(stringOnly, `context string without token count: ${stringOnly.join(", ")}`).toEqual([]);
  });
});
