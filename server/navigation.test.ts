/**
 * Tests for the journal-style navigation that replaced the sidebar.
 *
 * Removing the persistent rail moves a real cost onto the palette: if a
 * destination is not reachable by typing, it is not reachable at all for the
 * keyboard-first user this product is aimed at. So the contract worth pinning is
 * not "the overlay renders" but "every route is findable, and findable by the
 * words a reader would actually type".
 *
 * These used to re-declare NAV and filterNav locally, on the theory that a .tsx
 * module could not be imported here. That was both untrue and actively harmful:
 * when NavItem changed shape from {label, en, hint} to {key}, the suite kept
 * passing because it was exercising its own copy. Vitest resolves .tsx fine, so
 * we import the real thing and let structural drift fail loudly.
 */
import { describe, expect, it } from "vitest";
import { ADMIN_ITEM, NAV, filterNav, isActive } from "../client/src/components/Contents";
import { en } from "../client/src/i18n/en";
import { zh } from "../client/src/i18n/zh";

const DICTS = [en, zh];

/** Mirrors the cursor arithmetic in the overlay's key handler. */
function moveCursor(cursor: number, len: number, key: "ArrowDown" | "ArrowUp") {
  if (len === 0) return 0;
  return key === "ArrowDown" ? (cursor + 1) % len : (cursor - 1 + len) % len;
}

/** Mirrors the shortcut predicate in `Navigation`. */
function opensPalette(e: {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  targetTag?: string;
  contentEditable?: boolean;
}) {
  const mod = Boolean(e.metaKey || e.ctrlKey);
  if (mod && e.key.toLowerCase() === "k") return true;
  if (e.key === "/" && !mod) {
    const typing =
      e.targetTag === "INPUT" || e.targetTag === "TEXTAREA" || e.contentEditable === true;
    return !typing;
  }
  return false;
}

describe("every route stays reachable without a sidebar", () => {
  /* The routes registered in App.tsx that a reader is meant to navigate to.
     Detail pages (/benchmarks/:slug) are reached from the library, not the nav. */
  const ROUTES = ["/", "/matrix", "/benchmarks", "/models", "/compare", "/decide", "/radar", "/admin"];

  it("lists a contents entry for each navigable route", () => {
    const hrefs = [...NAV, ADMIN_ITEM].map(i => i.href).sort();
    expect(hrefs).toEqual([...ROUTES].sort());
  });

  it("has no contents entry pointing at a route that does not exist", () => {
    for (const item of [...NAV, ADMIN_ITEM]) {
      expect(ROUTES).toContain(item.href);
    }
  });

  it("keeps the maintainer entry out of the public list", () => {
    // Showing an admin-only destination to everyone teases a dead end.
    expect(NAV.map(i => i.href)).not.toContain("/admin");
  });

  it("gives every entry a label and a hint in both languages", () => {
    // A nav key with no dictionary entry would render as a blank row.
    for (const item of [...NAV, ADMIN_ITEM]) {
      for (const dict of DICTS) {
        expect(dict.nav[item.key], `nav.${item.key}`).toBeTruthy();
        expect(dict.navHint[item.key]?.length ?? 0, `navHint.${item.key}`).toBeGreaterThan(6);
        expect(dict.navKeywords[item.key], `navKeywords.${item.key}`).toBeTruthy();
      }
    }
  });
});

describe("palette matching", () => {
  it("returns everything for an empty query", () => {
    expect(filterNav(NAV, "", DICTS)).toHaveLength(NAV.length);
    expect(filterNav(NAV, "   ", DICTS)).toHaveLength(NAV.length);
  });

  it("matches the Chinese label even while the English UI is active", () => {
    // A bilingual analyst types 矩阵 without switching the interface first.
    expect(filterNav(NAV, "矩阵", DICTS).map(i => i.href)).toEqual(["/matrix"]);
  });

  it("matches the English name case-insensitively", () => {
    expect(filterNav(NAV, "head-to-head", DICTS).map(i => i.href)).toEqual(["/compare"]);
    expect(filterNav(NAV, "RADAR", DICTS).map(i => i.href)).toEqual(["/radar"]);
  });

  it("matches on keywords a reader would guess but that are not the label", () => {
    // Someone looking for the comparison table may well type "表格" or "table".
    expect(filterNav(NAV, "表格", DICTS).map(i => i.href)).toEqual(["/matrix"]);
    expect(filterNav(NAV, "推荐", DICTS).map(i => i.href)).toEqual(["/decide"]);
  });

  it("returns an empty list rather than everything when nothing matches", () => {
    // Silently falling back to the full list would make the palette feel broken.
    expect(filterNav(NAV, "zzzz", DICTS)).toEqual([]);
  });

  it("can reach the admin page once it is in the list", () => {
    expect(filterNav([...NAV, ADMIN_ITEM], "运维", DICTS).map(i => i.href)).toEqual(["/admin"]);
    expect(filterNav([...NAV, ADMIN_ITEM], "data ops", DICTS).map(i => i.href)).toEqual(["/admin"]);
  });
});

describe("keyboard cursor", () => {
  it("wraps forward past the last match", () => {
    expect(moveCursor(6, 7, "ArrowDown")).toBe(0);
  });

  it("wraps backward past the first match", () => {
    expect(moveCursor(0, 7, "ArrowUp")).toBe(6);
  });

  it("stays at zero when there is nothing to move through", () => {
    expect(moveCursor(0, 0, "ArrowDown")).toBe(0);
    expect(moveCursor(3, 0, "ArrowUp")).toBe(0);
  });
});

describe("shortcut contract", () => {
  it("opens on Cmd+K and Ctrl+K", () => {
    expect(opensPalette({ key: "k", metaKey: true })).toBe(true);
    expect(opensPalette({ key: "K", ctrlKey: true })).toBe(true);
  });

  it("opens on a bare slash", () => {
    expect(opensPalette({ key: "/" })).toBe(true);
  });

  it("does not hijack slash while the user is typing", () => {
    // Otherwise searching inside the matrix would fire the palette instead.
    expect(opensPalette({ key: "/", targetTag: "INPUT" })).toBe(false);
    expect(opensPalette({ key: "/", targetTag: "TEXTAREA" })).toBe(false);
    expect(opensPalette({ key: "/", contentEditable: true })).toBe(false);
  });

  it("ignores plain letters", () => {
    expect(opensPalette({ key: "k" })).toBe(false);
  });
});

describe("active section naming (the islet's job)", () => {
  it("marks the overview active only at the root", () => {
    expect(isActive("/", "/")).toBe(true);
    expect(isActive("/", "/matrix")).toBe(false);
  });

  it("keeps the section named while reading a detail page under it", () => {
    // On /benchmarks/critpt the islet must still name the library, not fall back.
    expect(isActive("/benchmarks", "/benchmarks/critpt")).toBe(true);
  });

  it("resolves exactly one section for every navigable route", () => {
    const all = [...NAV, ADMIN_ITEM];
    for (const route of ["/", "/matrix", "/benchmarks", "/models", "/compare", "/decide", "/radar", "/admin"]) {
      expect(all.filter(i => isActive(i.href, route))).toHaveLength(1);
    }
  });
});
