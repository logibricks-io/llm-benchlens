import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * On an installed PWA there is no address bar, so panel state has to live in the
 * URL for two reasons: a shared/bookmarked link must reopen the same panel, and
 * the OS back gesture must step back through panels instead of closing the app.
 * Component-local `useState` silently breaks both.
 */
describe("mobile shell routing", () => {
  const src = readFileSync(
    resolve(__dirname, "..", "client", "src", "pages", "Mobile.tsx"),
    "utf8",
  );

  it("derives the active tab from the URL, not from component state", () => {
    expect(src).toContain("useLocation");
    expect(src).toContain("URLSearchParams");
    // The regression this guards against: `useState<Tab>("radar")`.
    expect(/useState<Tab>/.test(src)).toBe(false);
  });

  it("navigates on tab change so history records each panel", () => {
    expect(src).toContain("navigate(");
    expect(src).toContain("?tab=");
  });

  it("falls back to the radar panel for an unknown tab value", () => {
    // An unrecognised ?tab=... must not render an empty shell.
    expect(src).toContain('TABS.some(t => t.key === requested) ? requested : "radar"');
  });

  it("keeps the default panel on a clean URL", () => {
    // radar is the default, so it should not push a redundant query string.
    expect(src).toContain('next === "radar" ? base');
  });
});
