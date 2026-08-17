# v2 QA sweep — findings (English + dark, full-page)

Checkpoint under review: `af4944cc`. 111 tests pass, tsc clean, only intentional
Chinese left (the language toggle labels itself "中文").

## Fixed

**1. Chinese leaked into the Decide page — FIXED.** The caveat chips rendered
Chinese under an English UI. Root cause: `recommend.byScenario` built finished
Chinese sentences on the SERVER. Same class as the scenario-title leak, missed
because `find_untranslated.mjs` only scans client source. Now the server emits
`CaveatCode` values and the dictionaries hold the prose. Verified: chips read
"Thin evidence; ranking is highly uncertain" etc.
Guard added: `server/noServerCopy.test.ts` fails on any CJK string literal in
`server/` or `shared/`, and pins caveat codes to dictionary entries in both
directions. Negative-tested by injecting a Chinese literal into `server/db.ts`
— the test failed with the exact file and line, then passed after revert.

**2. `/mobile` renders 404 — NOT A BUG.** The mobile route is `/m` (plus
`/m/:rest*`); my screenshot path was wrong. `/m` renders correctly in English:
data-foundation card, release radar, 5-tab bottom nav.

## Visual

**3. The core claim is the weakest text on the page.** On Home, `are not comparable`
(the second half of the headline) uses a frost accent that reads markedly fainter
than `Scores` beside it. That phrase carries the product's entire argument; it
should be at least as strong as the first line. Frost accents were recalibrated
to 6:1, but 6:1 next to 17:1 still looks muted at display size.

**4. Matrix page renders correctly, but is slow to first paint — NOT broken.**
Traced properly rather than guessed: the endpoint returns HTTP 200 with all 857
rows in ~1.3s (verified with curl), and the page code reads `matrix.data`
directly with filters that default to pass-through. The `0 × 0 · 0` header was
the pre-hydration state captured mid-flight — a later capture shows
`350 models × 94 benchmarks · 857 records` with the rotated headers, mean
column, per-cell ticks, and saturation flags all rendering as designed.

Real issue that remains: it is the slowest endpoint in the app (one un-paginated
857-row payload) and it backs the flagship page, so first impression is ~1.3s of
skeleton. Not a correctness bug; worth a look if perceived speed matters.

## Confirmed good

- Dark default, English default, serif reserved for display sizes, sans body.
- Benchmarks / Models / Compare / Radar / 404 / desktop widget all sharp,
  with visible rules and legible table numerals.
- Desktop widget: leaderboard, freshness bar (197 fresh / 515 stale) all legible.
- Decide page layout, evidence bars, and source labels render correctly
  (`Official leaderboard` / `Vendor self-reported` / `Independent re-run` all
  resolve, confirming the sourceType key unification worked).

## zh + light cross-check

Both axes verified together (the risky combination, since light was recalibrated
at the same time the frost palette was demoted, and Chinese changes line lengths).

Good:
- Chinese renders in sans throughout; display headings use the serif face only
  at large sizes, exactly as intended.
- Light theme rules and hairlines are visible; table numerals stay crisp.
- Every enum label resolves in Chinese (能力域 / 饱和状态 / 评分机制 / 出处),
  as does the whole Decide scenario list and the Models page notes.
- `--acc-qing-display` also holds up in light: 分数/不可比 both read strongly.

Issues found:
- **Home eyebrow duplicated both languages — FIXED.** Read
  `指标元模型 · Metric meta-model`, `演示 · the same reading, two rules`, and four
  more: the translation was appended to the English instead of replacing it.
  Invisible to `tsc` (still a string) and to the "zh contains Chinese" test (it
  does), so it took a rendered page to see. Fixed all 6, and added a test that
  fails when a zh value reproduces most of its English counterpart's words.
- **Danger red on `12.6%` / `25` — RECONSIDERED, then tuned.** My first read was
  "neutral facts wrongly styled as alarms", but `tone="danger"` is deliberate:
  those two numbers *are* the methodology argument. The real defect was narrower
  — light-mode 丹朱 ran at the palette's highest chroma (0.1283) and only 4.8:1,
  so it read as an error state. Cut to C=0.085 at 5.5:1: same meaning, calmer.
  Intent kept, medium-specific execution fixed.

## Note on the theme-preset screenshot helper

A batch that requested `theme=light` and `theme=dark` returned two identical
light captures, which looked like broken theme switching. It was not: the
captures share one browser context and run concurrently, so the two localStorage
writes raced. Capturing dark on its own renders dark correctly, and
`ThemeContext` reads the key and sets an explicit class as designed. Worth
recording because "fixing" the provider here would have broken working code.
The helper page has been deleted.

## Status

114 tests passing, `tsc` clean, no untranslated user-facing strings outside the
deliberate `中文` label on the language switch.
