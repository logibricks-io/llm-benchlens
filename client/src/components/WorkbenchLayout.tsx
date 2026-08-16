import { cn } from "@/lib/utils";
import { Navigation, ReadNext } from "./Contents";

/**
 * The page shell, journal edition — no persistent rail.
 *
 * What used to be a 190px sidebar is gone entirely: the content column now runs
 * the full width of the frame. Navigation lives in a floating pill plus a
 * full-bleed contents page (see `Contents.tsx`), so it costs zero horizontal
 * pixels. The matrix, which is the widest surface in the product, gains roughly
 * four more visible benchmark columns as a direct result.
 *
 * Layout vocabulary here is print, not chrome:
 *  - `title` sits in a masthead with generous leading, not a toolbar
 *  - `aside` renders as a margin note that scrolls with the content, i.e. it is
 *    part of the text block rather than fixed furniture
 *  - `readNext` closes each page with directed continuations
 */
export function WorkbenchLayout({
  children,
  title,
  subtitle,
  actions,
  /** Margin note: caveats, provenance, method remarks. Scrolls with content. */
  aside,
  readNext,
  /** Full-bleed body: the page paints its own padding (dense tables). */
  wide,
  /** Bare mode: the page supplies its own masthead (scroll narratives). */
  bare,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  aside?: React.ReactNode;
  readNext?: Array<{ href: string; label: string; why: string }>;
  wide?: boolean;
  bare?: boolean;
}) {
  if (bare) {
    return (
      <div className="bg-background min-h-screen">
        <Navigation />
        <main>{children}</main>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <Navigation />

      {/* Masthead. Clears the islet, then sets the page in type rather than
          wrapping it in a toolbar. */}
      <header className={cn("pt-[76px]", wide ? "px-6" : "px-7 sm:px-10")}>
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <div className="min-w-0">
            <h1 className="display text-ink-900 text-[34px] leading-[1.08] sm:text-[40px]">
              {title}
            </h1>
            {subtitle && (
              <p className="ui text-ink-500 mt-2 max-w-[62ch] text-[12px] leading-relaxed">
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

      <main className={cn(wide ? "px-6 pt-5 pb-12" : "px-7 pt-6 pb-14 sm:px-10")}>
        {aside ? (
          /* Body + margin note. The note is narrow, right-hand, and scrolls
             with the text; on narrow screens it folds beneath the body, which
             is precisely what a fixed second sidebar could never do. */
          <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
            <div className="min-w-0 flex-1">{children}</div>
            <aside className="w-full shrink-0 lg:w-[228px]">
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
