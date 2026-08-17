import { cn } from "@/lib/utils";
import { ReadNext } from "./Contents";
import { TopBar, type DomainTab } from "./TopBar";

/**
 * The page shell.
 *
 * v2 had a single floating island as the only permanent chrome, with all
 * navigation behind a full-page contents overlay. That satisfied "no sidebar"
 * but made every view switch cost a click — wrong for a leaderboard, where
 * comparing views is the primary activity. v3 keeps the no-sidebar rule (nothing
 * consumes horizontal space; the content column still spans the whole frame) but
 * makes the nav horizontal and persistent, with an optional second tier for
 * capability domains. The contents overlay survives as ⌘K search.
 *
 * Layout vocabulary stays closer to print than to chrome:
 *  - `aside` is a margin note that scrolls with the content, not fixed furniture
 *  - `readNext` closes each page with directed continuations
 */
export function WorkbenchLayout({
  children,
  title,
  subtitle,
  actions,
  aside,
  readNext,
  /** Full-bleed body: the page paints its own padding (dense tables). */
  wide,
  /** Bare mode: the page supplies its own masthead (scroll narratives). */
  bare,
  /** Second-tier tabs, e.g. capability domains. */
  tabs,
  activeTab,
  onTab,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  aside?: React.ReactNode;
  readNext?: Array<{ href: string; label: string; why: string }>;
  wide?: boolean;
  bare?: boolean;
  tabs?: DomainTab[];
  activeTab?: string;
  onTab?: (key: string) => void;
}) {
  if (bare) {
    return (
      <div className="bg-background min-h-screen">
        <TopBar tabs={tabs} activeTab={activeTab} onTab={onTab} />
        <main>{children}</main>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <TopBar tabs={tabs} activeTab={activeTab} onTab={onTab} />

      <header className={cn("pt-7", wide ? "px-4 sm:px-6" : "px-6 sm:px-8")}>
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <div className="min-w-0">
            <h1 className="display text-ink-950 text-[32px] leading-[1.08] sm:text-[38px]">
              {title}
            </h1>
            {subtitle && (
              <p className="ui text-ink-600 mt-2 max-w-[74ch] text-[14px] leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
          )}
        </div>
        <div className="hair-b mt-5" />
      </header>

      <main className={cn(wide ? "px-4 pt-5 pb-12 sm:px-6" : "px-6 pt-6 pb-14 sm:px-8")}>
        {aside ? (
          <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
            <div className="min-w-0 flex-1">{children}</div>
            <aside className="w-full shrink-0 lg:w-[248px]">
              <div className="hair-t pt-4 lg:border-t-0 lg:pt-0">{aside}</div>
            </aside>
          </div>
        ) : (
          children
        )}

        {readNext && <ReadNext items={readNext} />}
      </main>
    </div>
  );
}
