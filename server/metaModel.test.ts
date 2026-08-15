import { describe, expect, it } from "vitest";
import {
  eloToPercent,
  evidenceWeight,
  freshnessOf,
  normalizedScore,
  SCENARIOS,
  scenarioByKey,
  scenarioWeight,
  toCommonScale,
} from "../shared/metaModel";

const lenient = {
  scoreForm: "percentage",
  difficultyCoefficient: 0.612, // AIME-like: single_answer + saturated
  trustScore: 57,
  discriminativePower: 12,
  saturationStatus: "saturated",
};

const brutal = {
  scoreForm: "percentage",
  difficultyCoefficient: 2.027, // Terminal-Bench 3.0-like: all_or_nothing + frontier + agentic
  trustScore: 100,
  discriminativePower: 88,
  saturationStatus: "frontier",
};

describe("toCommonScale", () => {
  it("passes percentages through", () => {
    expect(toCommonScale(61.3, "percentage")).toBe(61.3);
  });

  it("treats 0-1 pass rates as fractions", () => {
    expect(toCommonScale(0.87, "percentage")).toBeCloseTo(87, 5);
  });

  it("anchors Elo at the human-expert baseline of 1000", () => {
    expect(eloToPercent(1000)).toBeCloseTo(50, 5);
    expect(toCommonScale(1753, "elo")).toBeGreaterThan(85);
    expect(toCommonScale(1313, "elo")).toBeGreaterThan(eloToPercent(1000));
    expect(toCommonScale(600, "elo")).toBeLessThan(50);
  });

  it("clamps out-of-range percentages", () => {
    expect(toCommonScale(140, "percentage")).toBe(100);
    expect(toCommonScale(-5, "percentage")).toBe(0);
  });
});

describe("normalizedScore", () => {
  it("lifts scores earned on structurally harder benchmarks", () => {
    const hard = normalizedScore(60, brutal);
    const easy = normalizedScore(60, lenient);
    expect(hard).toBeGreaterThan(60);
    expect(easy).toBeLessThan(60);
    // The same raw 60% is worth materially more on the frontier yardstick.
    expect(hard - easy).toBeGreaterThan(20);
  });

  it("keeps the 0 and 100 endpoints fixed", () => {
    expect(normalizedScore(0, brutal)).toBe(0);
    expect(normalizedScore(100, brutal)).toBe(100);
    expect(normalizedScore(100, lenient)).toBe(100);
  });

  it("is monotonic in the raw score", () => {
    let prev = -1;
    for (const raw of [5, 15, 30, 45, 60, 75, 90]) {
      const v = normalizedScore(raw, brutal);
      expect(v).toBeGreaterThan(prev);
      prev = v;
    }
  });

  it("normalizes Elo readings onto the same 0-100 space", () => {
    const elo = normalizedScore(1577, { ...brutal, scoreForm: "elo", difficultyCoefficient: 1.43 });
    expect(elo).toBeGreaterThan(0);
    expect(elo).toBeLessThanOrEqual(100);
  });

  it("never exceeds the valid range even with an extreme coefficient", () => {
    const v = normalizedScore(95, { ...brutal, difficultyCoefficient: 9 });
    expect(v).toBeLessThanOrEqual(100);
    expect(v).toBeGreaterThanOrEqual(0);
  });
});

describe("evidenceWeight", () => {
  it("ranks an independent frontier benchmark above a saturated self-reported one", () => {
    expect(evidenceWeight(brutal, "third_party")).toBeGreaterThan(evidenceWeight(lenient, "self_reported"));
  });

  it("discounts self-reported provenance relative to third-party", () => {
    expect(evidenceWeight(brutal, "self_reported")).toBeLessThan(evidenceWeight(brutal, "third_party"));
  });
});

describe("freshnessOf", () => {
  const now = new Date("2026-08-16T00:00:00Z");

  it("buckets by age", () => {
    expect(freshnessOf("2026-08-01", now)).toBe("fresh");
    expect(freshnessOf("2026-06-20", now)).toBe("recent");
    expect(freshnessOf("2026-02-01", now)).toBe("aging");
    expect(freshnessOf("2024-10-01", now)).toBe("stale");
  });

  it("treats missing or invalid dates as stale", () => {
    expect(freshnessOf(null, now)).toBe("stale");
    expect(freshnessOf("not-a-date", now)).toBe("stale");
  });
});

describe("scenario definitions", () => {
  it("exposes unique keys and non-empty emphasis lists", () => {
    const keys = SCENARIOS.map(s => s.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const s of SCENARIOS) {
      expect(s.emphasisSlugs.length).toBeGreaterThan(0);
      const total = Object.values(s.domainWeights).reduce((a, b) => a + (b ?? 0), 0);
      expect(total).toBeCloseTo(1, 2);
    }
  });

  it("resolves by key and rejects unknown keys", () => {
    expect(scenarioByKey("agentic_coding")?.title).toBeTruthy();
    expect(scenarioByKey("nope")).toBeUndefined();
  });
});

describe("scenarioWeight", () => {
  const coding = scenarioByKey("agentic_coding")!;
  const base = {
    ...brutal,
    slug: "terminal-bench-3-0",
    capabilityDomain: "coding",
    isAgentic: true,
    hasNegativeAssertions: false,
  };

  it("gives zero weight to benchmarks outside the scenario", () => {
    const w = scenarioWeight(coding, { ...base, slug: "omnidocbench", capabilityDomain: "multimodal" }, "third_party");
    expect(w).toBe(0);
  });

  it("boosts benchmarks the scenario explicitly emphasises", () => {
    const emphasised = scenarioWeight(coding, base, "third_party");
    const plain = scenarioWeight(coding, { ...base, slug: "some-other-coding-bench" }, "third_party");
    expect(emphasised).toBeGreaterThan(plain);
  });

  it("rewards guardrail-aware benchmarks in automation scenarios", () => {
    const automation = scenarioByKey("computer_use_automation")!;
    const bm = {
      ...brutal,
      slug: "automationbench",
      capabilityDomain: "agentic_tool_use",
      isAgentic: true,
      hasNegativeAssertions: true,
    };
    const withGuard = scenarioWeight(automation, bm, "third_party");
    const withoutGuard = scenarioWeight(automation, { ...bm, hasNegativeAssertions: false }, "third_party");
    expect(withGuard).toBeGreaterThan(withoutGuard);
  });
});
