import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { Link, useLocation } from "wouter";
import { Moon, Sun } from "lucide-react";

/**
 * The workbench shell, 霜色 edition.
 *
 * Deliberately not a dashboard chrome: no icon rail, no filled sidebar, no
 * card enclosures. Navigation is a numbered index in the manner of a journal's
 * table of contents, sections are separated by a single hairline, and the page
 * title hangs in a wide left margin so the content column starts off-centre.
 */

const NAV = [
  { href: "/", label: "总览", en: "Overview", hint: "论点、方法学体检与指标效用" },
  { href: "/matrix", label: "指标矩阵", en: "Matrix", hint: "模型 × 指标全量对比" },
  { href: "/benchmarks", label: "指标库", en: "Benchmarks", hint: "评测的元模型档案" },
  { href: "/models", label: "模型库", en: "Models", hint: "按证据加权的模型名录" },
  { href: "/compare", label: "对战台", en: "Duel", hint: "两到四个模型的同尺对比" },
  { href: "/decide", label: "场景决策", en: "Decide", hint: "按落地场景输出推荐与依据" },
  { href: "/radar", label: "发布雷达", en: "Radar", hint: "新模型与新评测事件流" },
];

/** Maintainer-only entry, appended for admins so it never teases other users. */
const ADMIN_ITEM = {
  href: "/admin",
  label: "数据运维",
  en: "Data ops",
  hint: "覆盖度审计、陈旧证据与刷新记录",
};

function useNavItems() {
  const { user } = useAuth();
  return user?.role === "admin" ? [...NAV, ADMIN_ITEM] : NAV;
}

function isActive(href: string, location: string) {
  return href === "/" ? location === "/" : location.startsWith(href);
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className="ui text-ink-500 hover:text-ink-800 flex items-center gap-1.5 text-[11px] transition-colors duration-150"
      title={theme === "dark" ? "切换到霜色（亮）" : "切换到夜霜（暗）"}
    >
      {theme === "dark" ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
      <span>{theme === "dark" ? "霜色" : "夜霜"}</span>
    </button>
  );
}

/**
 * Index rail. Numbers rather than icons: this is a reference work, and the
 * numeral does the same job an icon would while staying in the type system.
 */
function IndexRail() {
  const [location] = useLocation();
  const items = useNavItems();
  return (
    <aside className="hair-r hidden w-[190px] shrink-0 flex-col lg:flex">
      <Link href="/" className="block px-6 pt-7 pb-6">
        <div className="display text-ink-900 text-[19px] leading-none">BenchLens</div>
        <div className="ui text-ink-400 mt-1.5 text-[10px] tracking-[0.14em] uppercase">
          评测元智能
        </div>
      </Link>

      <nav className="flex flex-1 flex-col px-6">
        {items.map((item, i) => {
          const active = isActive(item.href, location);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.hint}
              className="group relative py-[7px] transition-colors duration-150"
            >
              <div className="flex items-baseline gap-2.5">
                <span
                  className={cn(
                    "tnum w-3 shrink-0 text-[9px] transition-colors duration-150",
                    active ? "text-frost-qing" : "text-ink-400",
                  )}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className={cn(
                    "truncate text-[13px] transition-colors duration-150",
                    active
                      ? "text-ink-900"
                      : "text-ink-500 group-hover:text-ink-800",
                  )}
                >
                  {item.label}
                </span>
              </div>
              {/* active marker: a tick on the rail, echoing the ruler motif */}
              {active && (
                <span
                  className="absolute top-1/2 -left-px h-3.5 w-[2px] -translate-y-1/2"
                  style={{ background: "var(--ink-800)" }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      <CoverageFooter />
    </aside>
  );
}

/** The data base, stated as a running footnote rather than a stat panel. */
function CoverageFooter() {
  const { data } = trpc.meta.overview.useQuery();
  const rows: Array<[string, string, boolean?]> = [
    ["指标", data ? String(data.benchmarks) : "—"],
    ["模型", data ? String(data.models) : "—"],
    ["证据", data ? String(data.scores) : "—"],
    ["CI 披露", data ? `${data.ciDisclosureRate}%` : "—", true],
  ];
  return (
    <div className="hair-t mx-6 mt-4 py-4">
      <div className="ui text-ink-400 mb-2 text-[9px] tracking-[0.14em] uppercase">
        数据基座
      </div>
      <dl className="space-y-1">
        {rows.map(([k, v, warn]) => (
          <div key={k} className="flex items-baseline justify-between gap-2">
            <dt className="ui text-ink-500 text-[10px]">{k}</dt>
            <dd
              className={cn("tnum text-[11px]", warn ? "text-danger" : "text-ink-700")}
            >
              {v}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-3">
        <ThemeToggle />
      </div>
    </div>
  );
}

/** Narrow-viewport nav for the workbench routes. */
function TopNav() {
  const [location] = useLocation();
  const items = useNavItems();
  return (
    <div className="hair-b flex items-center gap-4 overflow-x-auto px-5 py-2.5 lg:hidden">
      <Link href="/" className="display text-ink-900 shrink-0 text-[15px]">
        BenchLens
      </Link>
      {items.map(item => {
        const active = isActive(item.href, location);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "shrink-0 text-[12px] whitespace-nowrap transition-colors duration-150",
              active ? "text-ink-900" : "text-ink-500",
            )}
          >
            {item.label}
          </Link>
        );
      })}
      <div className="ml-auto shrink-0">
        <ThemeToggle />
      </div>
    </div>
  );
}

export function WorkbenchLayout({
  children,
  title,
  subtitle,
  actions,
  wide,
  /** Bare mode: page supplies its own header (used by the scroll narrative). */
  bare,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  wide?: boolean;
  bare?: boolean;
}) {
  /*
   * Two scroll models on purpose. Dense tables want a fixed frame with an
   * internally-scrolling body so headers stay put; the overview is a scroll
   * narrative and must scroll at page level, otherwise the argument is trapped
   * inside a box and the rail can't stay beside it.
   */
  if (bare) {
    return (
      <div className="bg-background flex min-h-screen">
        <div className="hidden lg:flex">
          <div className="sticky top-0 flex h-screen">
            <IndexRail />
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <TopNav />
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background flex h-screen overflow-hidden">
      <IndexRail />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopNav />
        {/* Title hangs in a wide left margin — the content column is
            deliberately off-centre rather than filling the frame. */}
        <header className="hair-b flex shrink-0 flex-wrap items-baseline gap-x-5 gap-y-1.5 px-7 pt-7 pb-4">
          <h1 className="display text-ink-900 text-[26px] leading-none">{title}</h1>
          {subtitle && (
            <p className="ui text-ink-500 min-w-0 flex-1 text-[11px] leading-relaxed">
              {subtitle}
            </p>
          )}
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
        <main className={cn("min-w-0 flex-1 overflow-auto", wide ? "" : "px-7 py-6")}>
          {children}
        </main>
      </div>
    </div>
  );
}
