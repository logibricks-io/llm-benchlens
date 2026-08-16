/**
 * Tests for the ruler motif's arithmetic.
 *
 * The ruler is the one piece of proprietary form language in this product, and
 * it makes a factual claim every time it is drawn: this rule is *this* long
 * because the benchmark is *this* hard, and this mark sits *here* because the
 * score is *that*. Those are assertions about data, so they get tests —
 * screenshots cannot tell a correct mark from one that silently collapsed onto
 * the origin, which is exactly the bug that shipped once already.
 *
 * Logic under test is re-stated here rather than imported, because the source
 * module is a .tsx React component and this suite runs in a plain node
 * environment. Any change to Ruler.tsx must be mirrored here — that coupling is
 * deliberate and cheap at this size.
 */
import { describe, expect, it } from "vitest";

const MAX_DIFFICULTY = 2.03;

/** Mirrors `parseLeadingNumber` in client/src/components/Ruler.tsx. */
function parseLeadingNumber(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const m = String(raw).match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

/** Mirrors the `frac` computation: drawn length as a share of the full measure. */
function drawnFraction(difficulty: number | null): number {
  if (difficulty == null) return 1;
  return Math.max(0.12, Math.min(1, difficulty / MAX_DIFFICULTY));
}

/** A reading may sit on the rule only if it shares the rule's 0–100 scale. */
function isPlottable(value: number | null): boolean {
  return value !== null && value >= 0 && value <= 100;
}

describe("ruler length ∝ difficulty", () => {
  it("draws the hardest benchmark in the corpus at full measure", () => {
    expect(drawnFraction(MAX_DIFFICULTY)).toBe(1);
  });

  it("draws a lenient benchmark visibly shorter than a strict one", () => {
    const lenient = drawnFraction(0.61); // MMLU-Pro, the loosest ruler measured
    const strict = drawnFraction(2.03); // AutomationBench, the strictest
    expect(lenient).toBeLessThan(strict);
    // The whole argument rests on this gap being obvious, not subtle.
    expect(strict - lenient).toBeGreaterThan(0.5);
  });

  it("keeps a floor so an extremely lenient rule is still a visible object", () => {
    expect(drawnFraction(0.05)).toBe(0.12);
    expect(drawnFraction(0)).toBe(0.12);
  });

  it("never exceeds full measure, even if a coefficient is later raised", () => {
    expect(drawnFraction(3.5)).toBe(1);
  });

  it("treats the neutral rule as always full length", () => {
    expect(drawnFraction(null)).toBe(1);
  });
});

describe("parsing issuer-published SOTA strings", () => {
  it("reads a plain percentage", () => {
    expect(parseLeadingNumber("42.7%")).toBe(42.7);
  });

  it("reads a score that carries a trailing attribution", () => {
    expect(parseLeadingNumber("12.6% (GPT-5 high)")).toBe(12.6);
  });

  it("reads a score published with an error bar", () => {
    expect(parseLeadingNumber("74% ±4%")).toBe(74);
  });

  it("reads an Elo rating as a number", () => {
    expect(parseLeadingNumber("1315 Elo")).toBe(1315);
  });

  it("returns null rather than NaN when there is nothing plottable", () => {
    // The original bug: Number("n/a") is NaN, and NaN% put every mark on the
    // origin, so a 12.6% benchmark and an 84.4% one drew identically.
    expect(parseLeadingNumber("n/a")).toBeNull();
    expect(parseLeadingNumber("")).toBeNull();
    expect(parseLeadingNumber(null)).toBeNull();
    expect(parseLeadingNumber(undefined)).toBeNull();
  });
});

describe("only same-scale readings go on the rule", () => {
  it("plots percentage readings", () => {
    expect(isPlottable(parseLeadingNumber("42.7%"))).toBe(true);
    expect(isPlottable(parseLeadingNumber("0%"))).toBe(true);
    expect(isPlottable(parseLeadingNumber("100%"))).toBe(true);
  });

  it("refuses Elo readings — they are not on this rule's scale", () => {
    expect(isPlottable(parseLeadingNumber("1315 Elo"))).toBe(false);
    expect(isPlottable(parseLeadingNumber("1753"))).toBe(false);
  });

  it("refuses unparseable values instead of drawing them at zero", () => {
    expect(isPlottable(parseLeadingNumber("未公布"))).toBe(false);
  });
});

describe("mark labels stay inside the drawn rule", () => {
  /** Mirrors the anchor choice that keeps a label from running off either end. */
  function anchorFor(value: number, difficulty: number): string {
    const frac = drawnFraction(difficulty);
    const pos = frac * value;
    if (pos < 12) return "0%";
    if (pos > frac * 100 - 12) return "-100%";
    return "-50%";
  }

  it("left-aligns a label near the origin so it cannot overrun the row text", () => {
    expect(anchorFor(2, 2.03)).toBe("0%");
  });

  it("right-aligns a label near the far end", () => {
    expect(anchorFor(99, 2.03)).toBe("-100%");
  });

  it("centres a label in the middle of the rule", () => {
    expect(anchorFor(50, 2.03)).toBe("-50%");
  });

  it("anchors against the rule's own end, not the page's", () => {
    /*
     * A lenient rule is short, so "near the end" happens at a much smaller
     * page offset. 60 on a ×0.61 rule sits at ~18% of the page but only 60% of
     * the way along that rule, so it still centres; 96 on the same rule is at
     * ~28% of the page yet genuinely at the rule's end, and must right-align.
     */
    expect(anchorFor(60, 0.61)).toBe("-50%");
    expect(anchorFor(96, 0.61)).toBe("-100%");
  });
});

/**
 * Mirrors `assignLabelRows`. Spacing marks by dot position alone is not enough:
 * the dots can clear each other while the labels beside them still collide,
 * because label width depends on the model's name.
 */
function assignLabelRows(
  marks: Array<{ value: number; label?: string }>,
  frac: number,
  ruleWidthPx: number,
): number[] {
  const PAD_PX = 10;
  const labelWidth = (s: string) => {
    let w = 0;
    for (const ch of s) w += /[\u3000-\u9fff\uff00-\uffef]/.test(ch) ? 9.2 : 5.2;
    return w;
  };
  const rows: Array<Array<[number, number]>> = [];
  return marks.map(m => {
    if (!m.label) return 0;
    const centerPx = ((frac * m.value) / 100) * ruleWidthPx;
    const halfPx = labelWidth(m.label) / 2 + PAD_PX;
    const span: [number, number] = [centerPx - halfPx, centerPx + halfPx];
    for (let r = 0; r < rows.length; r++) {
      if (!rows[r].some(([lo, hi]) => span[0] < hi && span[1] > lo)) {
        rows[r].push(span);
        return r;
      }
    }
    rows.push([span]);
    return rows.length - 1;
  });
}

describe("stacking labels that would collide", () => {
  it("keeps well-separated labels on a single row", () => {
    expect(
      assignLabelRows(
        [
          { value: 10, label: "A 10" },
          { value: 50, label: "B 50" },
          { value: 90, label: "C 90" },
        ],
        1,
        800,
      ),
    ).toEqual([0, 0, 0]);
  });

  it("stacks on a hard rule where every reading is a single digit", () => {
    /* CritPt: readings 12.6 / 9.1 / 0.6. The arithmetic gaps look adequate but
       the dots land within a few pixels of one another. */
    const rows = assignLabelRows(
      [
        { value: 12.6, label: "GPT-5 12.6" },
        { value: 9.1, label: "Gemini 3 Pro 9.1" },
        { value: 0.6, label: "o4-mini (high) 0.6" },
      ],
      0.95,
      760,
    );
    expect(rows[0]).toBe(0);
    expect(rows[1]).toBeGreaterThan(0);
  });

  it("stacks on a saturated short rule where readings bunch near the end", () => {
    /* MMLU-Pro: drawn at 30% of full measure, readings all in the 83–94 band. */
    const rows = assignLabelRows(
      [
        { value: 93.9, label: "Claude Mythos 5 93.9" },
        { value: 87.6, label: "Claude Opus 4.8 87.6" },
        { value: 83.6, label: "GPT-5.6 Sol 83.6" },
      ],
      0.3,
      760,
    );
    expect(new Set(rows).size).toBe(3);
  });

  it("measures CJK glyphs as wider than latin ones", () => {
    /*
     * The gap must fall between the two half-widths doubled: a 6-glyph latin
     * label spans ±25.6px (needs >51.2px), the same count of CJK spans ±37.6px
     * (needs >75.2px). 64px therefore clears latin and collides for CJK. Drop
     * the script weighting and the CJK pair wrongly shares a row on screen.
     */
    const latin = assignLabelRows(
      [
        { value: 40, label: "aaaaaa" },
        { value: 48, label: "aaaaaa" },
      ],
      1,
      800,
    );
    const cjk = assignLabelRows(
      [
        { value: 40, label: "中文标签中文" },
        { value: 48, label: "中文标签中文" },
      ],
      1,
      800,
    );
    expect(latin).toEqual([0, 0]);
    expect(cjk[1]).toBeGreaterThan(0);
  });

  it("leaves unlabelled marks on the base row", () => {
    expect(assignLabelRows([{ value: 50 }, { value: 51 }], 1, 800)).toEqual([0, 0]);
  });
});
