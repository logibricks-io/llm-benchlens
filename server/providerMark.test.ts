import { describe, expect, it } from "vitest";
import { providerMonogram, providerColor, providerSlot } from "../client/src/lib/series";

/*
 * A monogram is a row anchor: its whole job is to say "this row and that row are
 * the same vendor". Two vendors sharing a mark breaks that silently — the table
 * still renders, it just quietly lies. Same for the catch-all buckets, where a
 * letter would invent an identity the data does not have.
 */
describe("provider identity marks", () => {
  const VENDORS = [
    "OpenAI",
    "Anthropic",
    "Alibaba",
    "Qwen",
    "Google",
    "DeepSeek",
    "xAI",
    "Moonshot AI",
    "Meta",
    "Z.AI",
    "ByteDance",
    "MiniMax",
    "NVIDIA",
    "Mistral",
    "Xiaomi",
    "Tencent",
    "BAAI",
    "Amazon",
    "Cohere",
    "Microsoft",
    "Microsoft Research",
    "StepFun",
    "Voyage AI",
    "Thinking Machines Lab",
  ];

  it("gives every hand-listed vendor a distinct mark", () => {
    const seen = new Map<string, string>();
    for (const v of VENDORS) {
      const mark = providerMonogram(v);
      expect(mark, `${v} should have a mark`).toBeTruthy();
      const prior = seen.get(mark!);
      expect(prior, `"${mark}" is claimed by both ${prior} and ${v}`).toBeUndefined();
      seen.set(mark!, v);
    }
  });

  it("refuses to mark catch-all buckets", () => {
    for (const bucket of ["Other", "other", "Unknown", "", null, undefined]) {
      expect(providerMonogram(bucket)).toBeNull();
    }
  });

  it("falls back to an initial pair for unlisted vendors", () => {
    expect(providerMonogram("InclusionAI")).toBe("In");
    expect(providerMonogram("codefuse-ai")).toBe("Co");
  });

  it("keeps colour assignment stable and inside the palette", () => {
    for (const v of [...VENDORS, "Other", "some new lab"]) {
      const slot = providerSlot(v);
      expect(slot).toBeGreaterThanOrEqual(1);
      expect(slot).toBeLessThanOrEqual(7);
      expect(providerColor(v)).toBe(providerColor(v));
    }
  });
});

