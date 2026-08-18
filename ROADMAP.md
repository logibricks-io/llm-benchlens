# BenchLens Roadmap

> Feature roadmap and architectural decision record for BenchLens, a benchmark
> meta-intelligence platform for large language models.
>
> **Maintainer**: LogiBricks.AI Lab · contact@logibricks.ai
> **Last reviewed**: 2026-08-18
> **Status of record**: this file is the single source of truth for what is
> planned, what was deliberately rejected, and why. `todo.md` tracks the
> in-flight task list; this file tracks direction.

---

## 1. What already ships

Shipped and covered by 134 passing tests as of `e35e8522`.

| Area | State |
| --- | --- |
| **Data foundation** | 95 benchmarks with structured meta-model fields, 352 models, 857 scores. Every score carries a resolvable source URL; entries without provenance are rejected rather than imported. |
| **Commercial fields** | 96 models with output pricing, 99 with context window token counts, 100 with release dates — each with its own vendor-official source URL. Zero unsourced values. |
| **Normalisation engine** | Difficulty coefficients spanning ×0.61 – ×2.03, evidence-count shrinkage toward the library median, trust and provenance weighting. |
| **API** | Express + tRPC 11, language-independent responses (enum keys and both language columns; translation happens at render time), so any client can consume the same payloads. |
| **Web PC** | Persistent two-tier top bar, champion strip, leaderboard with three views (table / quality-vs-cost scatter with Pareto frontier / bars), score matrix, benchmark and model detail pages, head-to-head, scenario picker, release radar, admin data ops. |
| **Mobile web (PWA)** | Installable on iOS and Android, five-tab bottom navigation, offline shell via service worker. |
| **macOS widget** | 360 px compact leaderboard and release feed. |
| **i18n** | English default, Chinese switchable, `?lang=` shareable. Type-safe dictionary where a missing key is a compile error; guard tests forbid server-side display copy and untranslated Chinese entries. |
| **Theming** | Dark default, light variant, `?theme=` shareable. Contrast ratios solved numerically rather than eyeballed. |
| **Scheduled work** | `/api/scheduled/auditData` Heartbeat endpoint recording coverage, freshness and provenance completeness. |

---

## 2. Architectural decisions already taken

These are recorded because reversing one is expensive, and because the
reasoning is not obvious from the code alone.

### 2.1 Provenance is a hard constraint, not a nice-to-have

Every score, price, context window and release date must resolve to a public
source URL. This is enforced by tests (`commercialProvenance.test.ts`), not by
convention. The rule has already prevented four real defects: a `0.000` price
that would have won every "cheapest" comparison, a price contradicting the
vendor's own documentation, a CNY-only price that an automated pass tried to
convert at an invented exchange rate, and a duplicate model entity counted
twice.

The consequence is that **fully automated ingestion is off the table**. Any
pipeline that writes scores without human confirmation trades away the one
property that distinguishes this platform from the leaderboards it aggregates.

### 2.2 The server never sends display copy

API responses carry enum keys (`self_reported`, `coding`, `thin_evidence`) and,
for prose fields, both language columns. Translation happens in the client
dictionary. This keeps responses cacheable and language-independent, and it is
enforced by `noServerCopy.test.ts`, which fails if a CJK string literal appears
anywhere under `server/` or `shared/`.

This rule was introduced after the opposite approach leaked Chinese scenario
titles and caveat sentences into the English UI, where they were also cached by
tRPC and survived a language switch.

### 2.3 Colour encodes vendor identity, not decoration

Seven categorical series colours, solved separately for dark and light themes
(≈6:1 and ≈5:1 respectively), with a stable provider → slot mapping so one
vendor keeps the same hue across table, bars and scatter. Vendor monograms
rather than real logos, because shipping third-party trademarks is a licensing
question we do not need to answer.

### 2.4 The three form factors are not responsive breakpoints

Web PC, mobile PWA and the macOS widget are separate interaction models with
separate route trees, not one layout at three widths. A 94-column score matrix
is a desktop artefact; a five-tab bottom bar is a phone artefact. Neither
degrades gracefully into the other, so neither tries.

---

## 3. Planned work

Ordered by a combination of user-visible value, whether it blocks later work,
and cost. Nothing here is in progress.

### Milestone A — Mobile web parity

The backend already speaks HTTP/tRPC to any client, so no architectural change
is required for mobile. What is missing is browser-level adaptation, verified
at a real 390 × 844 viewport:

| Item | Problem observed | Direction |
| --- | --- | --- |
| **A1. Top bar on narrow screens** | Only two of eight navigation entries are reachable; the rest are clipped off-screen. | Collapse to a drawer, or make the nav row horizontally scrollable with edge affordance. |
| **A2. Filter chip overflow** | Chips on the matrix and benchmark library are cut mid-word ("Satur…", "Tool vendor"). | Horizontally scrollable chip rail, or a collapsible filter sheet. |
| **A3. Score matrix on phones** | 94 columns with 42° rotated headers is unusable below roughly 900 px. | Detect narrow viewports and route to a single-model or head-to-head view instead of shrinking the grid. |
| **A4. No mobile entry hint** | A phone landing on `/models` from search stays on the desktop layout; `/m` is reachable only by typing it. | One-time dismissible hint. Deliberately **not** a forced redirect — that would break deep-link sharing. |

### Milestone B — Trend data accumulation

**This milestone has a time cost and should start before the others.** The
`dailySnapshots` table exists but is empty; rank-change arrows ("up 4 places in
14 days", the single most-copied feature across the reference leaderboards)
cannot be computed retroactively.

| Item | Direction |
| --- | --- |
| **B1. Daily snapshot writer** | `/api/scheduled/dailySnapshot` Heartbeat handler recording composite score and rank per model. Pure database computation, no external calls — fits comfortably inside the 2-minute handler budget. |
| **B2. Stronger audit assertions** | Extend `auditData` from passive recording to active alerting: zero prices, missing provenance, missing token counts should raise rather than merely log. |
| **B3. Rank-change UI** | Delta arrows on the leaderboard and model detail once ~14 days of snapshots exist. |

> **Deployment prerequisite**: the platform posts to the production URL, so the
> site must be published before any cron can be created. Sandbox URLs are not
> reachable from the scheduler.

### Milestone C — Semi-automated data refresh

The collection layer, split by what can safely be automated:

| Layer | Content | Automation | Vehicle |
| --- | --- | --- | --- |
| **L1 Health** | Coverage, freshness, provenance gaps, anomalies | Fully automatic, daily | Existing `auditData` (see B2) |
| **L2 Snapshot** | Daily rank and score snapshot | Fully automatic, daily | B1 |
| **L3 Discovery** | Detect new model releases and updated leaderboards; produce a **review queue** | Automatic discovery, human confirmation | Agent-driven scheduled task — needs browsing and multi-step research, beyond a single LLM call |
| **L4 Ingestion** | Writing scores and prices into the library | **Stays manual** | Admin page / reviewed scripts |

The boundary between L3 and L4 is the point of §2.1. L3 produces candidates
with source links; a human accepts or rejects. This buys the timeliness of
automation without surrendering traceability.

### Milestone D — Native applications (conditional)

Only worth starting when a requirement appears that the PWA genuinely cannot
meet. Today there is exactly one such requirement on the horizon: **push
notifications on iOS**.

| Option | Warranted when | Cost |
| --- | --- | --- |
| PWA (current) | Installable, offline shell, shareable links | Already shipped; no App Store presence, no iOS push |
| Expo / React Native | Push notifications, store distribution, real offline library | A second client codebase; web components are not directly reusable |
| Native Swift / Kotlin | Platform-specific surfaces (home screen widgets, Live Activities) | Two codebases |

**Client-side SQLite belongs here, and only here.** On the server it would be a
regression: the current deployment scales to zero, and a single-file database
dies with the instance, whereas the managed MySQL/TiDB instance outlives it. In
a native app, by contrast, SQLite is the right tool for an offline mirror of the
leaderboard.

### Milestone E — Evidence density

A structural weakness that limits several features: of 352 models, only 62 carry
three or more scores, and 288 carry one or two. The quality-vs-cost scatter can
plot 58 points; four-model comparisons frequently find only one shared
benchmark, and that one is often a saturated ruler.

| Item | Direction |
| --- | --- |
| **E1. Top-100 coverage** | Prioritise coding and agentic domains for the top 100 models by composite score. |
| **E2. Sparse-evidence honesty** | Already partially implemented (shrinkage, "thin" markers, confidence percentages). Extend to comparison and scatter views so a sparse model is visibly sparse wherever it appears. |

### Milestone F — Performance

| Item | Problem | Direction |
| --- | --- | --- |
| **F1. Matrix virtualisation** | The compact endpoint cut the payload 828 KB → 294 KB, but building 857 cells of DOM remains the slowest first paint in the product. | Render only rows within the viewport. |
| **F2. Progressive matrix hydration** | The header and totals could paint before the grid does. | Stream summary counts ahead of the cell data. |

---

## 4. Explicitly rejected

Recorded so they are not revisited by accident.

| Idea | Why not |
| --- | --- |
| **SQLite on the server** | The deployment scales to zero; a single-file database would be destroyed with the instance on every cold start. The managed database is strictly more durable. Reserved hosting with a persistent volume would fix the durability but costs more and buys only easier file-level backup, which the managed database already provides. |
| **Fully automated score ingestion** | Incompatible with §2.1. Observed failure modes during a supervised backfill included slug rewriting that silently matched zero rows, duplicate entities, a price contradicting vendor documentation, and an invented currency conversion. |
| **Radar/spider chart for capability profiles** | Polygon area depends on arbitrary axis ordering, and a domain backed by one result would carry the same visual weight as one backed by eight. Horizontal bars keep the comparison one-dimensional and leave room to state the evidence count. |
| **Histogram of benchmark scores** | With ~12 models per benchmark, binning collapses to one or two bars. Replaced by a spread band plotting every score on one axis with the observed range annotated — cluster width *is* the discriminative power. |
| **Real vendor logos** | Would mean redistributing third-party trademarks. Monograms on the vendor's own series colour give the same at-a-glance row anchor. |
| **Forced redirect from desktop routes to `/m`** | Breaks deep-link sharing. A dismissible hint achieves the same discovery without hijacking the URL. |
| **Left/right split dashboard shell** | Rejected by the product owner early; the layout is a journal-style single column with margin notes, and the navigation is a persistent top bar. |

---

## 5. Open questions

These need a decision before the corresponding milestone can start.

1. **Mobile direction** — harden the PWA (Milestone A) or commit to a native app
   (Milestone D)? The latter is only justified by a concrete push-notification
   or store-distribution requirement.
2. **Automation boundary** — is "automatic discovery, human confirmation"
   (Milestone C) acceptable? Full automation would require relaxing §2.1.
3. **Snapshot start date** — Milestone B accrues value only with elapsed time.
   Starting it early is close to free and blocks nothing else.

