/**
 * One-off codemod: map the old dashboard utility classes onto the frost tokens.
 *
 * This only handles the mechanical part — colour and chrome vocabulary. Layout
 * decisions (card grids that should become archive entries, panels that should
 * become hairline sections) are done by hand, because those are design choices
 * and not find-and-replace.
 *
 * Skips ComponentShowcase.tsx: it is the template's own component gallery, not
 * part of the product surface.
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SKIP = new Set(["ComponentShowcase.tsx"]);

/** Ordered: longer / more specific patterns first so they win. */
const RULES = [
  // panel chrome → hairline framing
  [/\bpanel overflow-hidden\b/g, "hair-t"],
  [/\bpanel\b/g, "hair-t"],
  [/\bgrid-canvas\b/g, ""],
  [/\bbackdrop-blur-xl\b/g, ""],
  [/\bbackdrop-blur\b/g, ""],
  [/\bshadow-2xl\b/g, "shadow-frost"],
  [/\brounded-xl\b/g, "rounded-sm"],
  [/\brounded-lg\b/g, "rounded-sm"],
  [/\brounded-md\b/g, "rounded-sm"],

  // ink scale for text
  [/\btext-muted-foreground\/80\b/g, "text-ink-400"],
  [/\btext-muted-foreground\/70\b/g, "text-ink-400"],
  [/\btext-muted-foreground\/60\b/g, "text-ink-400"],
  [/\btext-muted-foreground\/40\b/g, "text-ink-400"],
  [/\btext-muted-foreground\/30\b/g, "text-ink-400"],
  [/\btext-muted-foreground\/25\b/g, "text-ink-400"],
  [/\btext-muted-foreground\b/g, "text-ink-500"],
  [/\btext-foreground\b/g, "text-ink-900"],
  [/\btext-primary-foreground\b/g, "text-paper"],
  [/\btext-primary\b/g, "text-frost-qing"],
  [/\btext-secondary-foreground\b/g, "text-ink-700"],

  // borders → hairlines
  [/\bborder-b border-border\/60\b/g, "hair-b"],
  [/\bborder-b border-border\b/g, "hair-b"],
  [/\bborder-t border-border\b/g, "hair-t"],
  [/\bborder-r border-border\b/g, "hair-r"],
  [/\bborder border-border\/80\b/g, "hair-all"],
  [/\bborder border-border\b/g, "hair-all"],
  [/\bborder-border\/70\b/g, "border-rule"],
  [/\bborder-border\/60\b/g, "border-rule"],
  [/\bborder-border\b/g, "border-rule"],
  [/\bhover:border-primary\/40\b/g, "hover:border-frost-qing/40"],
  [/\bborder-primary\/40\b/g, "border-frost-qing/40"],

  // fills → paper / mist
  [/\bbg-secondary\/60\b/g, "bg-frost-mist/50"],
  [/\bbg-secondary\/50\b/g, "bg-frost-mist/50"],
  [/\bbg-secondary\/40\b/g, "bg-frost-mist/40"],
  [/\bbg-secondary\/30\b/g, "bg-frost-mist/40"],
  [/\bhover:bg-secondary\/50\b/g, "hover:bg-frost-mist/50"],
  [/\bhover:bg-secondary\/30\b/g, "hover:bg-frost-mist/40"],
  [/\bhover:bg-secondary\b/g, "hover:bg-frost-mist/50"],
  [/\bbg-secondary\b/g, "bg-frost-mist/60"],
  [/\bbg-primary\/15\b/g, "bg-frost-qing/12"],
  [/\bbg-primary\b/g, "bg-frost-qing"],
  [/\bbg-card\/95\b/g, "bg-paper"],
  [/\bbg-card\b/g, "bg-paper"],
  [/\bbg-background\/95\b/g, "bg-background"],
  [/\bbg-background\/40\b/g, "bg-background"],
  [/\bbg-muted\/60\b/g, "bg-frost-mist/50"],
  [/\bbg-muted\b/g, "bg-frost-mist/50"],

  // signal vars → short aliases
  [/text-\[color:var\(--signal-caution\)\]/g, "text-caution"],
  [/text-\[color:var\(--signal-danger\)\]/g, "text-danger"],
  [/text-\[color:var\(--signal-good\)\]/g, "text-good"],
  [/text-\[color:var\(--signal-frontier\)\]/g, "text-frontier"],

  // weight: the frost edition carries hierarchy by size and ink, not by bold
  [/\bfont-semibold\b/g, ""],
  [/\bfont-bold\b/g, ""],
  [/\bfont-medium\b/g, ""],
  [/\buppercase tracking-wide\b/g, "tracking-[0.14em] uppercase"],
];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.tsx$/.test(name) && !SKIP.has(name)) out.push(p);
  }
  return out;
}

const targets = [
  ...walk(join(ROOT, "client/src/pages")),
  ...walk(join(ROOT, "client/src/components")).filter(
    p => !p.includes("/components/ui/"),
  ),
];

let changed = 0;
for (const file of targets) {
  const before = readFileSync(file, "utf8");
  /*
   * Rewrite ONLY inside class strings. The first run of this script applied the
   * rules to whole files, and `\bpanel\b` duly renamed a `panel` state variable
   * and several prose comments — a class-name codemod must never see anything
   * but class names.
   *
   * Covers `className="..."`, `className={cn("...", ...)}` and bare string
   * literals inside a cn(...) call, by rewriting every double-quoted string that
   * sits inside a className={...} expression.
   */
  const rewriteClasses = src =>
    src
      // className="..."
      .replace(/className="([^"]*)"/g, (_m, cls) => `className="${apply(cls)}"`)
      // className={ ... } — rewrite each quoted string inside the braces
      .replace(/className=\{([\s\S]*?)\}/g, (_m, expr) => {
        const inner = expr.replace(/"([^"]*)"/g, (_s, cls) => `"${apply(cls)}"`);
        return `className={${inner}}`;
      });

  const apply = cls => {
    let out = cls;
    for (const [re, to] of RULES) out = out.replace(re, to);
    return out.replace(/\s{2,}/g, " ").trim();
  };

  const after = rewriteClasses(before);
  if (after !== before) {
    writeFileSync(file, after);
    changed++;
    console.log("  frostified", file.replace(ROOT, ""));
  }
}
console.log(`\n${changed} file(s) updated of ${targets.length} scanned.`);
