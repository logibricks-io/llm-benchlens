/**
 * Margin notes — the journal's answer to a second sidebar.
 *
 * A fixed rail costs horizontal pixels on every page even when it has nothing
 * to say. A margin note costs nothing when absent, scrolls with the passage it
 * annotates, and folds beneath the body on narrow screens. It carries caveats
 * and method remarks: the things a reader needs *while* reading a number, not
 * a menu they already know.
 */
export function NoteBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6 last:mb-0">
      <div className="ui text-ink-400 mb-2 text-[12px] tracking-[0.16em] uppercase">{label}</div>
      <div className="ui text-ink-500 space-y-2 text-[12px] leading-relaxed">{children}</div>
    </section>
  );
}

/** A single figure with its caption, for facts worth pulling out of prose. */
export function NoteFigure({
  value,
  caption,
}: {
  value: string;
  caption: string;
}) {
  return (
    <div className="hair-t pt-2">
      <div className="tnum text-ink-800 text-[17px] leading-none">{value}</div>
      <div className="ui text-ink-500 mt-1 text-[12px] leading-relaxed">{caption}</div>
    </div>
  );
}
