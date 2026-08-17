import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Moon, Search, Sun } from "lucide-react";
import { useI18n } from "@/i18n";
import { useTheme } from "@/contexts/ThemeContext";
import { ContentsOverlay, isActive, useNavItems } from "./Contents";
import { cn } from "@/lib/utils";

/**
 * Persistent two-tier top bar.
 *
 * The previous shell had exactly one piece of permanent chrome — a floating
 * island that opened a full-page contents overlay. That honoured "no sidebar"
 * but cost a click for every navigation, and on a leaderboard the whole point is
 * that switching views is free. Every reference site keeps its primary nav and
 * its facet row on screen at all times.
 *
 * So: tier one is brand + primary nav + search + language + theme; tier two is
 * the capability-domain row, which doubles as the leaderboard's category filter.
 * Still no left/right split — the bar is horizontal and the content column keeps
 * the full frame width.
 */

export type DomainTab = { key: string; label: string; href: string };

export function TopBar({
  /** Second tier. Omit on pages where a category row would be meaningless. */
  tabs,
  activeTab,
  onTab,
}: {
  tabs?: DomainTab[];
  activeTab?: string;
  onTab?: (key: string) => void;
}) {
  const { t, lang, setLang } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const items = useNavItems();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(v => !v);
        return;
      }
      if (e.key === "/" && !mod) {
        const el = e.target as HTMLElement | null;
        const typing =
          el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
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
      <header className="bg-canvas/95 sticky top-0 z-40 backdrop-blur-sm">
        {/* ---- tier one ---- */}
        <div className="hair-b flex h-[52px] items-center gap-1 px-4 sm:px-6">
          <Link href="/" className="mr-4 flex shrink-0 items-baseline gap-2">
            <span className="display text-ink-950 text-[19px] leading-none tracking-tight">
              BenchLens
            </span>
          </Link>

          <nav className="flex min-w-0 items-center gap-0.5 overflow-x-auto">
            {items.map(item => {
              const on = isActive(item.href, location);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded px-2.5 py-1.5 text-[14px] whitespace-nowrap transition-colors duration-120",
                    on
                      ? "text-ink-950 bg-surface-2 font-medium"
                      : "text-ink-600 hover:text-ink-900 hover:bg-surface",
                  )}
                >
                  {t.nav[item.key as keyof typeof t.nav] as string}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="text-ink-500 hover:text-ink-900 hover:bg-surface flex items-center gap-1.5 rounded px-2 py-1.5 text-[13px] transition-colors duration-120"
              aria-label={t.nav.openContents}
            >
              <Search className="size-[14px]" />
              <kbd className="tnum text-ink-400 hidden text-[12px] sm:inline">⌘K</kbd>
            </button>

            <button
              type="button"
              onClick={() => setLang(lang === "en" ? "zh" : "en")}
              className="text-ink-600 hover:text-ink-900 hover:bg-surface rounded px-2 py-1.5 text-[13px] font-medium transition-colors duration-120"
              aria-label="Switch language"
            >
              {lang === "en" ? "中文" : "EN"}
            </button>

            <button
              type="button"
              onClick={() => toggleTheme?.()}
              className="text-ink-600 hover:text-ink-900 hover:bg-surface rounded p-1.5 transition-colors duration-120"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="size-[15px]" /> : <Moon className="size-[15px]" />}
            </button>
          </div>
        </div>

        {/* ---- tier two: capability domains, doubling as the category filter ---- */}
        {tabs && tabs.length > 0 ? (
          <div className="hair-b flex h-[42px] items-center gap-1 overflow-x-auto px-4 sm:px-6">
            {tabs.map(tab => {
              const on = activeTab === tab.key;
              return onTab ? (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => onTab(tab.key)}
                  className={cn(
                    "rounded px-2.5 py-1 text-[14px] whitespace-nowrap transition-colors duration-120",
                    on
                      ? "text-ink-950 bg-surface-2 font-medium"
                      : "text-ink-500 hover:text-ink-800 hover:bg-surface",
                  )}
                  aria-pressed={on}
                >
                  {tab.label}
                </button>
              ) : (
                <Link
                  key={tab.key}
                  href={tab.href}
                  className={cn(
                    "rounded px-2.5 py-1 text-[14px] whitespace-nowrap transition-colors duration-120",
                    on
                      ? "text-ink-950 bg-surface-2 font-medium"
                      : "text-ink-500 hover:text-ink-800 hover:bg-surface",
                  )}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        ) : null}
      </header>

      <ContentsOverlay open={open} onClose={() => setOpen(false)} />
    </>
  );
}
