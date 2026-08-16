import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { Link, useLocation } from "wouter";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Moon, Sun, CornerDownLeft } from "lucide-react";

/**
 * Navigation for BenchLens, journal-style.
 *
 * There is no persistent rail. The only always-present object is a small
 * floating pill (`Islet`); pressing it — or Cmd/Ctrl+K, or `/` — raises a
 * full-bleed table of contents that covers the page and then gets out of the
 * way. The contents page doubles as the command palette: typing filters, arrow
 * keys move, Enter navigates.
 *
 * Why not a sidebar: the core surface here is a 350 x 94 matrix, so horizontal
 * pixels are the scarcest resource in the product. A 190px rail spends the most
 * expensive resource on eight links that rarely change.
 *
 * Why not palette-only: hiding every destination behind a shortcut strands
 * first-time visitors. The pill keeps a visible entry point, and it also names
 * the current section, which is the active state.
 */

export type NavItem = {
  href: string;
  label: string;
  en: string;
  hint: string;
  /** Extra words the palette should match on, beyond label/en. */
  keywords?: string;
};

export const NAV: NavItem[] = [
  {
    href: "/",
    label: "总览",
    en: "Overview",
    hint: "为什么分数不可比：论点、方法学体检与指标效用",
    keywords: "首页 home 论点 体检",
  },
  {
    href: "/matrix",
    label: "指标矩阵",
    en: "Matrix",
    hint: "模型 × 指标的全量对比表",
    keywords: "表格 矩阵 对比 table",
  },
  {
    href: "/benchmarks",
    label: "指标库",
    en: "Benchmarks",
    hint: "每个评测的元模型档案与可信度评级",
    keywords: "评测 档案 benchmark 可信度",
  },
  {
    href: "/models",
    label: "模型库",
    en: "Models",
    hint: "按证据加权综合分排序的模型名录",
    keywords: "模型 排行 综合分 model",
  },
  {
    href: "/compare",
    label: "对战台",
    en: "Duel",
    hint: "两到四个模型在同一把尺上的逐项对照",
    keywords: "对比 对战 compare duel",
  },
  {
    href: "/decide",
    label: "场景决策",
    en: "Decide",
    hint: "按落地场景输出推荐模型与支撑证据",
    keywords: "推荐 决策 场景 scenario",
  },
  {
    href: "/radar",
    label: "发布雷达",
    en: "Radar",
    hint: "新模型与新评测的事件流",
    keywords: "发布 雷达 事件 release",
  },
];

/** Maintainer-only entry, appended for admins so it never teases other users. */
export const ADMIN_ITEM: NavItem = {
  href: "/admin",
  label: "数据运维",
  en: "Data ops",
  hint: "覆盖度审计、陈旧证据与刷新记录",
  keywords: "管理 运维 审计 admin",
};

export function useNavItems() {
  const { user } = useAuth();
  return useMemo(
    () => (user?.role === "admin" ? [...NAV, ADMIN_ITEM] : NAV),
    [user?.role],
  );
}

export function isActive(href: string, location: string) {
  return href === "/" ? location === "/" : location.startsWith(href);
}

/** Pure matcher, exported so tests can pin the palette's behaviour. */
export function filterNav(items: NavItem[], query: string): NavItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter(item =>
    [item.label, item.en, item.hint, item.keywords ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(q),
  );
}

function ThemeToggle({ compact }: { compact?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className="ui text-ink-500 hover:text-ink-800 flex items-center gap-1.5 text-[11px] transition-colors duration-150"
      title={theme === "dark" ? "切换到霜色（亮）" : "切换到夜霜（暗）"}
    >
      {theme === "dark" ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
      {!compact && <span>{theme === "dark" ? "霜色" : "夜霜"}</span>}
    </button>
  );
}

/* ------------------------------------------------------------------ contents */

/**
 * The full-bleed table of contents. Not a drawer: a drawer is a sidebar with a
 * timer. This is its own page moment, with its own typographic breathing room.
 */
function ContentsOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const items = useNavItems();
  const [location, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: overview } = trpc.meta.overview.useQuery(undefined, {
    enabled: open,
  });

  const matches = useMemo(() => filterNav(items, query), [items, query]);

  // Reset on each opening so the palette never resumes a stale search.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setCursor(0);
    const t = setTimeout(() => inputRef.current?.focus(), 40);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    setCursor(0);
  }, [query]);

  const go = useCallback(
    (href: string) => {
      onClose();
      if (href !== location) navigate(href);
    },
    [location, navigate, onClose],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor(c => (matches.length ? (c + 1) % matches.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor(c => (matches.length ? (c - 1 + matches.length) % matches.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = matches[cursor];
      if (target) go(target.href);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  if (!open) return null;

  const half = Math.ceil(matches.length / 2);
  const columns = [matches.slice(0, half), matches.slice(half)];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="目录"
      onKeyDown={onKeyDown}
    >
      {/* The page beneath stays faintly visible: you are covering it, not leaving it. */}
      <button
        className="contents-veil animate-veil-in absolute inset-0 cursor-default"
        style={{ backdropFilter: "blur(3px)" }}
        onClick={onClose}
        aria-label="关闭目录"
        tabIndex={-1}
      />

      <div className="animate-contents-in relative flex min-h-0 flex-1 flex-col">
        <div className="mx-auto flex min-h-0 w-full max-w-[1080px] flex-1 flex-col px-7 pt-10 pb-8">
          <div className="flex items-baseline justify-between gap-4">
            <div className="ui text-ink-400 text-[10px] tracking-[0.18em] uppercase">
              目录 · Contents
            </div>
            <div className="ui text-ink-400 flex items-center gap-3 text-[10px]">
              <span>输入即筛选</span>
              <span className="text-ink-400">·</span>
              <span>Esc 退出</span>
            </div>
          </div>

          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="跳转到…"
            className="display text-ink-900 placeholder:text-ink-400 mt-4 w-full bg-transparent text-[30px] leading-tight outline-none"
          />
          <div className="hair-b mt-3" />

          <div className="mt-6 min-h-0 flex-1 overflow-auto">
            {matches.length === 0 ? (
              <p className="ui text-ink-400 py-8 text-[12px]">
                没有匹配的栏目。按 Esc 返回。
              </p>
            ) : (
              <div className="grid gap-x-12 sm:grid-cols-2">
                {columns.map((col, ci) => (
                  <div key={ci}>
                    {col.map((item, ri) => {
                      const idx = ci * half + ri;
                      const focused = idx === cursor;
                      const here = isActive(item.href, location);
                      return (
                        <button
                          key={item.href}
                          onClick={() => go(item.href)}
                          onMouseEnter={() => setCursor(idx)}
                          className={cn(
                            "hair-b group relative block w-full py-4 text-left transition-colors duration-150",
                          )}
                        >
                          {focused && (
                            <span
                              className="absolute top-1/2 -left-4 h-5 w-[2px] -translate-y-1/2"
                              style={{ background: "var(--frost-qing)" }}
                            />
                          )}
                          <div className="flex items-baseline gap-3">
                            <span
                              className={cn(
                                "tnum shrink-0 text-[10px]",
                                focused ? "text-caution" : "text-ink-400",
                              )}
                            >
                              {String(items.indexOf(item) + 1).padStart(2, "0")}
                            </span>
                            <span
                              className={cn(
                                "text-[17px] transition-colors duration-150",
                                focused || here ? "text-ink-900" : "text-ink-700",
                              )}
                            >
                              {item.label}
                            </span>
                            <span className="ui text-ink-400 text-[10px]">{item.en}</span>
                            {here && (
                              <span className="ui text-frost-qing ml-auto shrink-0 text-[10px]">
                                当前
                              </span>
                            )}
                            {focused && !here && (
                              <CornerDownLeft className="text-ink-400 ml-auto size-3 shrink-0" />
                            )}
                          </div>
                          <div className="ui text-ink-500 mt-1 pl-[26px] text-[11px] leading-relaxed">
                            {item.hint}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* The data base, stated once, here — not parked in permanent furniture. */}
          <div className="hair-t mt-6 flex flex-wrap items-baseline gap-x-7 gap-y-2 pt-4">
            {(
              [
                ["指标", overview ? String(overview.benchmarks) : "—", false],
                ["模型", overview ? String(overview.models) : "—", false],
                ["证据", overview ? String(overview.scores) : "—", false],
                [
                  "CI 披露",
                  overview ? `${overview.ciDisclosureRate}%` : "—",
                  true,
                ],
              ] as Array<[string, string, boolean]>
            ).map(([k, v, warn]) => (
              <div key={k} className="flex items-baseline gap-1.5">
                <span className="ui text-ink-400 text-[10px]">{k}</span>
                <span
                  className={cn("tnum text-[12px]", warn ? "text-danger" : "text-ink-700")}
                >
                  {v}
                </span>
              </div>
            ))}
            <div className="ml-auto">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------- islet */

/**
 * The one persistent object: a 44px pill. It names the current section (that is
 * the active state) and shows the shortcut, so the palette stays discoverable.
 * It shrinks once you scroll so it stops competing with the content.
 */
function Islet({ onOpen }: { onOpen: () => void }) {
  const [location] = useLocation();
  const items = useNavItems();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const current = items.find(i => isActive(i.href, location));
  const mac =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || "");

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center">
      <button
        onClick={onOpen}
        className={cn(
          "islet pointer-events-auto flex items-center gap-3 transition-all duration-200",
          scrolled ? "mt-1.5 px-3.5 py-1.5" : "mt-3 px-4 py-2.5",
        )}
        style={{ transitionTimingFunction: "var(--ease-out)" }}
        title="打开目录（Cmd/Ctrl+K）"
      >
        <span
          className={cn(
            "display text-ink-900 leading-none transition-all duration-200",
            scrolled ? "text-[13px]" : "text-[15px]",
          )}
        >
          BenchLens
        </span>
        <span className="bg-rule h-3 w-px shrink-0" />
        <span className="text-frost-qing max-w-[140px] truncate text-[12px] leading-none">
          {current?.label ?? "目录"}
        </span>
        <span className="ui text-ink-400 shrink-0 text-[10px] leading-none">
          {mac ? "⌘K" : "Ctrl K"}
        </span>
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ provider */

/**
 * Wires the islet, the overlay, and the two shortcut keys. `/` is offered
 * alongside Cmd+K because some browsers claim the latter for their own search.
 */
export function Navigation() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(v => !v);
        return;
      }
      // Bare "/" opens too, but never while the user is typing somewhere.
      if (e.key === "/" && !mod) {
        const el = e.target as HTMLElement | null;
        const typing =
          el &&
          (el.tagName === "INPUT" ||
            el.tagName === "TEXTAREA" ||
            el.isContentEditable);
        if (!typing) {
          e.preventDefault();
          setOpen(true);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <Islet onOpen={() => setOpen(true)} />
      <ContentsOverlay open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/* ---------------------------------------------------------------- read next */

/**
 * Footer continuation. Browsing becomes directed reading: every page says what
 * to look at next, which is how a journal moves you along without a menu.
 */
export function ReadNext({
  items,
}: {
  items: Array<{ href: string; label: string; why: string }>;
}) {
  if (!items.length) return null;
  return (
    <div className="hair-t mt-14 pt-6">
      <div className="ui text-ink-400 mb-4 text-[10px] tracking-[0.18em] uppercase">
        续读 · Read next
      </div>
      <div className="grid gap-x-10 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(item => (
          <Link key={item.href} href={item.href} className="group block">
            <div className="text-ink-800 group-hover:text-frost-qing flex items-baseline gap-2 text-[14px] transition-colors duration-150">
              {item.label}
              <span className="text-ink-400 group-hover:text-frost-qing transition-transform duration-150 group-hover:translate-x-0.5">
                →
              </span>
            </div>
            <p className="ui text-ink-500 mt-1 text-[11px] leading-relaxed">{item.why}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
