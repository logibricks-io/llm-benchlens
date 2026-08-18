<div align="center">

# BenchLens

**A benchmark meta-intelligence platform for large language models.**

Scores from different benchmarks are not comparable. BenchLens models the
rulers themselves — their difficulty, saturation, issuer stance and evidence
quality — then renormalises every score before anything is ranked.

[Methodology](#methodology) · [Architecture](#architecture) · [Getting started](#getting-started) · [Roadmap](ROADMAP.md)

</div>

---

## The problem

A model scoring 34.7 on Senior SWE-Bench and a model scoring 99.0 on ProofBench
are not four points apart and sixty-five points apart from each other in any
meaningful sense. One benchmark is a saturated ruler where the top twelve models
sit inside a 1.6-point band; the other still separates the field across sixteen
points. Averaging raw numbers across such rulers produces a leaderboard that
looks authoritative and means very little.

Most public leaderboards solve the presentation problem well and the
comparability problem not at all. BenchLens starts from the other end.

---

## Methodology

### The meta-model layer

Each benchmark carries structured metadata rather than being treated as an
opaque score column:

| Field | Purpose |
| --- | --- |
| **Capability domain** | Which ability is actually under test (coding, agentic, multimodal, retrieval, …) |
| **Scoring mechanism** | Execution verification, exact match, blind preference Elo, rubric LLM judge, composite index, state assertion, pass@k |
| **Issuer stance** | Academic, tool vendor, model vendor, independent evaluator — the incentive behind the ruler |
| **Saturation status** | Frontier, contested, or saturated — whether the ruler still separates models |
| **Contamination risk** | Exposure of the test set to training corpora |
| **Confidence disclosure** | Whether the benchmark publishes confidence intervals at all |

From these, three derived quantities are computed: a **Trust Score**, a
**Discriminative Power**, and a **Difficulty Coefficient** (observed range
×0.61 – ×2.03).

### Renormalisation

Raw scores are projected onto a neutral scale using the difficulty coefficient,
so a hard benchmark is not silently penalised against an easy one. The composite
score then applies **evidence shrinkage**: a model with one result is pulled
toward the library median in proportion to how little is known about it, rather
than being ranked as if that single number were reliable.

A model backed by one score shows a confidence figure and a "thin evidence"
marker wherever it appears. Sparse data is displayed as sparse, not smoothed
into false precision.

### Provenance is enforced, not encouraged

Every score, price, context window and release date resolves to a public source
URL. This is checked by tests, not by convention. During a supervised backfill
the rule caught a `0.000` price that would have won every cheapest-model
comparison, a price contradicting the vendor's own documentation, a CNY-only
price that an automated pass tried to convert at an invented exchange rate, and
a duplicate model entity counted twice.

The direct consequence is that **fully automated ingestion is out of scope**.
See [ROADMAP.md](ROADMAP.md) §2.1.

---

## What is in the library

| | Count |
| --- | --- |
| Benchmarks with full meta-model metadata | 95 |
| Models | 352 |
| Sourced score records | 857 |
| Models with vendor-sourced pricing | 96 |
| Models with context window token counts | 99 |
| Models with release dates | 100 |
| Score entries lacking provenance | **0** |

---

## Product surfaces

Three form factors, deliberately built as distinct interaction models rather
than one responsive layout at three widths.

### Web analyst workbench

A champion strip answering "best overall / best value / best open weight /
longest context / best on a budget / newest" before any scrolling, then a
leaderboard with three views:

- **Table** — inline fill bars, vendor monograms and colour, price and context
- **Quality vs cost scatter** — logarithmic price axis with the **Pareto
  frontier** drawn and labelled, so dominated options can be ignored outright
- **Bars** — ranked comparison at a glance

Below that, per-domain small multiples that routinely show the overall leader
placing outside the top three in specific capabilities. Then the score matrix
(352 × 94), benchmark and model detail pages, head-to-head comparison, a
scenario-driven recommendation engine, and a release radar.

### Mobile PWA

Installable on iOS and Android with a five-tab bottom bar and an offline shell.
Not a narrowed desktop layout — the navigation model, information density and
entry points differ.

### macOS widget

A 360 px compact leaderboard and release feed for ambient monitoring.

---

## Design system

Contrast ratios are solved numerically rather than chosen by eye. Body text sits
at roughly 11:1, table numerals at 15:1, and the seven categorical series
colours are calibrated **separately** for dark and light themes (≈6:1 and ≈5:1)
because a single value cannot serve two opposite backgrounds without collapsing
to a muddy mid-tone.

Vendor colour is a stable mapping, not decoration: one provider keeps the same
hue across table, bars and scatter, so a vendor's models can be tracked by eye
across views. Vendor identity uses monograms rather than real logos, avoiding
redistribution of third-party trademarks.

Dark is the default theme; both themes and both languages are shareable via
`?theme=` and `?lang=` query parameters.

---

## Internationalisation

English is the default; Chinese is switchable. The implementation is a
purpose-built type-safe dictionary rather than a general i18n library, because
the requirement was narrow (two languages, no pluralisation rules, no lazy
namespaces) and the payoff was specific: `zh` is declared as `typeof en`, so a
missing key is a **compile error** rather than a runtime fallback.

Three guard tests back this up:

| Guard | What it prevents |
| --- | --- |
| `noServerCopy.test.ts` | Any CJK string literal under `server/` or `shared/` — the server sends enum keys, never display copy |
| `i18n.test.ts` (CJK presence) | An English string copied into the Chinese pack and left untranslated |
| `i18n.test.ts` (bilingual leak) | A Chinese entry that still carries its English original appended |

Benchmark prose (interpretation caveats, scenario mapping, notes — 283 passages)
is stored in parallel language columns and selected at render time, keeping API
responses language-independent and cacheable.

---

## Architecture

```
React 19 + Tailwind 4          Express 4 + tRPC 11          Drizzle ORM
  client/src/                    server/routers.ts            drizzle/schema.ts
       │                              │                            │
       └──── /api/trpc/* ─────────────┘                       MySQL / TiDB
                  ▲
      ┌───────────┼───────────┬──────────────────┐
   Web PC     Mobile PWA   macOS widget    (future native clients)
```

The API is already client-agnostic: responses carry enum keys and both language
columns, so a native iOS or Android client would consume the same endpoints with
no server changes.

### Repository layout

```
client/src/
  pages/           Page components (Home, Matrix, Models, ModelDetail,
                   Benchmarks, BenchmarkDetail, Compare, Decide, Radar,
                   Mobile, Desktop, Admin)
  components/      Shared UI: ScoreBar, Scatter, ScoreSpread, TopBar, Ruler,
                   MetaBadges, shadcn/ui primitives
  i18n/            en.ts, zh.ts, context, prose selector
  contexts/        Theme management
  index.css        Design tokens: ink ramp, series palette, both themes

server/
  routers.ts       tRPC procedures
  db.ts            Query helpers with short-TTL in-process cache
  scheduled.ts     Heartbeat audit endpoint
  *.test.ts        16 test files

shared/
  metaModel.ts     Normalisation engine, enums, scenario definitions
  formatContext.ts Context window formatting

drizzle/           Schema and migrations
scripts/           One-off data operations and codemods
```

---

## Getting started

### Prerequisites

Node.js 22+, pnpm, and a MySQL-compatible database (MySQL 8 or TiDB).

### Setup

```bash
pnpm install
pnpm db:push     # generate and apply migrations
pnpm dev         # http://localhost:3000
```

Create a `.env` at the repository root with at least:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | MySQL/TiDB connection string |
| `JWT_SECRET` | Session cookie signing secret |

Authentication and the built-in service integrations read additional variables;
see `server/_core/env.ts` for the full list recognised at runtime.

### Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Development server with hot reload |
| `pnpm build` | Production build (Vite client + esbuild server) |
| `pnpm start` | Run the production build |
| `pnpm test` | Vitest suite (134 tests) |
| `pnpm check` | TypeScript type check |
| `pnpm format` | Prettier |
| `pnpm db:push` | Generate and apply migrations |

### Routes

| Route | Surface |
| --- | --- |
| `/` | Overview: champions, leaderboard, per-domain multiples |
| `/matrix` | Score matrix, 352 × 94 |
| `/models`, `/models/:slug` | Model library and detail |
| `/benchmarks`, `/benchmarks/:slug` | Benchmark library and detail |
| `/compare?m=a,b,c,d` | Head-to-head, up to four models |
| `/decide` | Scenario-driven recommendation |
| `/radar` | Release radar |
| `/m` | Mobile PWA |
| `/desktop` | macOS widget |
| `/admin` | Data operations (access-controlled) |

Append `?lang=en|zh` and `?theme=dark|light` to any route to share a specific
language and theme.

---

## Testing

```bash
pnpm test
```

134 tests across 16 files. Beyond conventional unit and integration coverage,
several exist specifically to protect invariants that are easy to violate
silently:

| File | Invariant |
| --- | --- |
| `commercialProvenance.test.ts` | No price without a source URL; no zero prices |
| `noServerCopy.test.ts` | No display copy in the server or shared layers |
| `i18n.test.ts` | Dictionary completeness, no untranslated or bilingual entries |
| `matrixCompact.test.ts` | The normalised matrix endpoint is content-equivalent to the flat one |
| `providerMark.test.ts` | Vendor monograms are unique — this caught Moonshot and Microsoft both resolving to `MS` |
| `calibration.test.ts` | Contrast ratios meet their stated targets |
| `identity.test.ts` | Enum values and dictionary keys stay in sync |

Guard tests are verified by deliberately introducing the violation they are
meant to catch, confirming they fail, then reverting. A guard that has never
been seen to fail is not yet a guard.

---

## Contributing data

Score submissions must include a resolvable public source URL. Pull requests
adding scores, prices or model metadata without provenance will not be merged —
this is enforced by the test suite, so such a change fails CI regardless of
review.

Preferred sources, in order: the vendor's own documentation or pricing page, the
benchmark maintainer's published leaderboard, then reputable independent
evaluators. Currency conversion is not performed; a price published only in CNY
is recorded as unavailable in USD with the original noted, because an invented
exchange rate produces a number that looks precise and is not.

---

## Roadmap

See [ROADMAP.md](ROADMAP.md) for planned milestones, architectural decisions
already taken, and a record of ideas that were considered and deliberately
rejected.

---

## License and attribution

Benchmark results remain the property of their respective publishers and are
linked to their sources throughout the interface. BenchLens aggregates and
renormalises published figures; it does not run evaluations.

Maintained by **LogiBricks.AI Lab** · contact@logibricks.ai
