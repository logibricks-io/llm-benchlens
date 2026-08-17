/**
 * The compact matrix endpoint exists purely as a payload optimisation: it must
 * carry exactly the same information as the flat one, just without repeating
 * each model's and benchmark's metadata on all 857 rows.
 *
 * That makes equivalence the only thing worth asserting. A silent divergence
 * here would show up as wrong numbers in the matrix cells, which is the single
 * place in the product where a reader is meant to check a figure against its
 * source — so the test reconstructs the flat shape from the compact one and
 * compares them cell by cell.
 */
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";

const caller = appRouter.createCaller({ user: null } as never);

describe("models.matrixCompact", () => {
  it("carries every cell the flat matrix carries", async () => {
    const [flat, compact] = await Promise.all([
      caller.models.matrix(),
      caller.models.matrixCompact(),
    ]);

    expect(compact.cells.length).toBe(flat.length);
    // Every referenced slug must resolve, or the client-side join drops rows.
    const modelSlugs = new Set(compact.models.map(m => m.slug));
    const benchSlugs = new Set(compact.benchmarks.map(b => b.slug));
    const dangling = compact.cells.filter(c => !modelSlugs.has(c.m) || !benchSlugs.has(c.b));
    expect(dangling).toEqual([]);
  });

  it("reproduces the flat rows exactly after the client-side join", async () => {
    const [flat, compact] = await Promise.all([
      caller.models.matrix(),
      caller.models.matrixCompact(),
    ]);

    const mBySlug = new Map(compact.models.map(m => [m.slug, m]));
    const bBySlug = new Map(compact.benchmarks.map(b => [b.slug, b]));

    const key = (m: string, b: string) => `${m}::${b}`;
    const flatByKey = new Map(flat.map(r => [key(r.modelSlug, r.benchmarkSlug), r]));

    for (const c of compact.cells) {
      const src = flatByKey.get(key(c.m, c.b));
      expect(src, `no flat row for ${c.m}/${c.b}`).toBeTruthy();
      if (!src) continue;
      const m = mBySlug.get(c.m)!;
      const b = bBySlug.get(c.b)!;

      // The numbers a reader actually reads off the matrix.
      expect(c.raw).toBe(src.rawScore);
      expect(c.norm).toBe(src.normalized);
      expect(c.scale).toBe(src.commonScale);
      expect(c.w).toBe(src.evidenceWeight);
      // Provenance, which the hover panel shows verbatim.
      expect(c.su).toBe(src.sourceUrl);
      expect(c.st).toBe(src.sourceType);
      expect(c.at).toBe(src.measuredAt);
      // De-duplicated metadata must match the row it was lifted from.
      expect(m.provider).toBe(src.provider);
      expect(b.difficultyCoefficient).toBe(src.difficultyCoefficient);
      expect(b.saturationStatus).toBe(src.saturationStatus);
      expect(b.trustScore).toBe(src.trustScore);
    }
  });

  it("is materially smaller on the wire than the flat shape", async () => {
    const [flat, compact] = await Promise.all([
      caller.models.matrix(),
      caller.models.matrixCompact(),
    ]);
    const flatBytes = JSON.stringify(flat).length;
    const compactBytes = JSON.stringify(compact).length;
    // Measured at roughly 0.36x; assert a loose bound so the test tracks the
    // intent (a large win) rather than an exact figure that shifts with data.
    expect(compactBytes).toBeLessThan(flatBytes * 0.55);
  });
});
