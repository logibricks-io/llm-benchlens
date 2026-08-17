import { describe, expect, it } from "vitest";
import { formatContextWindow } from "../shared/formatContext";
import { listModels } from "./db";

describe("formatContextWindow", () => {
  it("renders binary-labelled windows the way vendors document them", () => {
    expect(formatContextWindow(1048576)).toBe("1M");
    expect(formatContextWindow(262144)).toBe("256K");
    expect(formatContextWindow(131072)).toBe("128K");
    expect(formatContextWindow(32768)).toBe("32K");
    expect(formatContextWindow(204800)).toBe("200K"); // 200 x 1024
  });

  it("keeps genuinely decimal windows decimal", () => {
    // OpenAI documents 1,050,000 rather than a power of two.
    expect(formatContextWindow(1050000)).toBe("1.05M");
    expect(formatContextWindow(200000)).toBe("200K");
    expect(formatContextWindow(1000000)).toBe("1M");
  });

  it("does not turn decimal windows into binary ones", () => {
    // Regression: an earlier version picked the base by "divides evenly", and
    // since 128000 / 1024 = 125 it rewrote DeepSeek's documented "128K" as
    // "125K". These are all decimal figures and must stay decimal.
    expect(formatContextWindow(128000)).toBe("128K");
    expect(formatContextWindow(256000)).toBe("256K");
    expect(formatContextWindow(64000)).toBe("64K");
    expect(formatContextWindow(32000)).toBe("32K");
    expect(formatContextWindow(2000000)).toBe("2M");
  });

  it("returns null for absent or nonsensical values", () => {
    expect(formatContextWindow(null)).toBeNull();
    expect(formatContextWindow(undefined)).toBeNull();
    expect(formatContextWindow(0)).toBeNull();
    expect(formatContextWindow(-5)).toBeNull();
  });

  it("never produces a long decimal tail", () => {
    // The bug this replaced rendered 1048576 as "1.04858M".
    const all = [
      32000, 32768, 128000, 131072, 200000, 203000, 204800, 256000, 262144,
      400000, 500000, 1000000, 1048576, 1050000, 2000000, 4000000,
    ];
    for (const n of all) {
      const s = formatContextWindow(n)!;
      const decimals = s.replace(/[KM]$/, "").split(".")[1] ?? "";
      expect(decimals.length, `${n} -> ${s}`).toBeLessThanOrEqual(2);
    }
  });

  it("covers every token count actually present in the database", async () => {
    // Guards against a new vendor figure silently rendering as e.g. "1.31072M".
    const rows = await listModels();
    const bad: string[] = [];
    for (const m of rows) {
      if (m.contextTokens === null || m.contextTokens === undefined) continue;
      const s = formatContextWindow(m.contextTokens);
      if (!s || /\.\d{3,}/.test(s)) bad.push(`${m.slug}=${m.contextTokens}->${s}`);
    }
    expect(bad, `unformattable token counts: ${bad.join(", ")}`).toEqual([]);
  });

  it("no stored context string carries more than two decimals", async () => {
    const rows = await listModels();
    const ugly = rows
      .filter(m => m.contextWindow)
      .filter(m => {
        const d = String(m.contextWindow).replace(/[KM]$/, "").split(".")[1] ?? "";
        return d.length > 2;
      })
      .map(m => `${m.slug}=${m.contextWindow}`);
    expect(ugly, `badly formatted context strings: ${ugly.join(", ")}`).toEqual([]);
  });
});
