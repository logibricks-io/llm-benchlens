/**
 * Tests for the journal-style navigation that replaced the sidebar.
 *
 * Removing the persistent rail moves a real cost onto the palette: if a
 * destination is not reachable by typing, it is not reachable at all for the
 * keyboard-first user this product is aimed at. So the contract worth pinning is
 * not "the overlay renders" but "every route is findable, and findable by the
 * words a reader would actually type".
 *
 * The nav table and matcher are re-stated here rather than imported, because the
 * source module is a .tsx React component and this suite runs in plain node.
 */
import { describe, expect, it } from "vitest";

type NavItem = {
  href: string;
  label: string;
  en: string;
  hint: string;
  keywords?: string;
};

/** Mirrors NAV in client/src/components/Contents.tsx. */
const NAV: NavItem[] = [
  { href: "/", label: "总览", en: "Overview", hint: "为什么分数不可比：论点、方法学体检与指标效用", keywords: "首页 home 论点 体检" },
  { href: "/matrix", label: "指标矩阵", en: "Matrix", hint: "模型 × 指标的全量对比表", keywords: "表格 矩阵 对比 table" },
  { href: "/benchmarks", label: "指标库", en: "Benchmarks", hint: "每个评测的元模型档案与可信度评级", keywords: "评测 档案 benchmark 可信度" },
  { href: "/models", label: "模型库", en: "Models", hint: "按证据加权综合分排序的模型名录", keywords: "模型 排行 综合分 model" },
  { href: "/compare", label: "对战台", en: "Duel", hint: "两到四个模型在同一把尺上的逐项对照", keywords: "对比 对战 compare duel" },
  { href: "/decide", label: "场景决策", en: "Decide", hint: "按落地场景输出推荐模型与支撑证据", keywords: "推荐 决策 场景 scenario" },
  { href: "/radar", label: "发布雷达", en: "Radar", hint: "新模型与新评测的事件流", keywords: "发布 雷达 事件 release" },
];

const ADMIN_ITEM: NavItem = {
  href: "/admin",
  label: "数据运维",
  en: "Data ops",
  hint: "覆盖度审计、陈旧证据与刷新记录",
  keywords: "管理 运维 审计 admin",
};

/** Mirrors `filterNav`. */
function filterNav(items: NavItem[], query: string): NavItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter(item =>
    [item.label, item.en, item.hint, item.keywords ?? ""].join(" ").toLowerCase().includes(q),
  );
}

/** Mirrors `isActive`. */
function isActive(href: string, location: string) {
  return href === "/" ? location === "/" : location.startsWith(href);
}

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

  it("gives every entry a hint, so the contents page explains rather than labels", () => {
    for (const item of [...NAV, ADMIN_ITEM]) {
      expect(item.hint.length).toBeGreaterThan(6);
    }
  });
});

describe("palette matching", () => {
  it("returns everything for an empty query", () => {
    expect(filterNav(NAV, "")).toHaveLength(NAV.length);
    expect(filterNav(NAV, "   ")).toHaveLength(NAV.length);
  });

  it("matches the Chinese label", () => {
    expect(filterNav(NAV, "矩阵").map(i => i.href)).toEqual(["/matrix"]);
  });

  it("matches the English name case-insensitively", () => {
    expect(filterNav(NAV, "duel").map(i => i.href)).toEqual(["/compare"]);
    expect(filterNav(NAV, "RADAR").map(i => i.href)).toEqual(["/radar"]);
  });

  it("matches on keywords a reader would guess but that are not the label", () => {
    // Someone looking for the comparison table may well type "表格" or "table".
    expect(filterNav(NAV, "表格").map(i => i.href)).toEqual(["/matrix"]);
    expect(filterNav(NAV, "推荐").map(i => i.href)).toEqual(["/decide"]);
    expect(filterNav(NAV, "home").map(i => i.href)).toEqual(["/"]);
  });

  it("returns an empty list rather than everything when nothing matches", () => {
    // Silently falling back to the full list would make the palette feel broken.
    expect(filterNav(NAV, "zzzz")).toEqual([]);
  });

  it("can reach the admin page once it is in the list", () => {
    expect(filterNav([...NAV, ADMIN_ITEM], "运维").map(i => i.href)).toEqual(["/admin"]);
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
    // On /benchmarks/critpt the islet must still read 指标库, not fall back to 目录.
    expect(isActive("/benchmarks", "/benchmarks/critpt")).toBe(true);
  });

  it("resolves exactly one section for every navigable route", () => {
    const all = [...NAV, ADMIN_ITEM];
    for (const route of ["/", "/matrix", "/benchmarks", "/models", "/compare", "/decide", "/radar", "/admin"]) {
      expect(all.filter(i => isActive(i.href, route))).toHaveLength(1);
    }
  });
});
