# BenchLens i18n + v2 visual overhaul — working state

## Design decisions (do not re-litigate)

**No react-i18next.** Hand-rolled context in `client/src/i18n/`. The requirement
is one key -> one of two strings; hand-rolling buys typed key access (autocomplete
plus compile-time typo detection) and no async loading state, neither of which the
library provides.

**Keys are the source of truth; translation happens only at the render layer.**
`shared/metaModel.ts` keeps exporting bare enum keys (`"coding"`, `"saturated"`)
and NEVER labels. Consequences that matter:
- API responses are language-independent and therefore cacheable.
- The server never learns about locale.
- The old Chinese `*_LABELS` / `*_EXPLAIN` dictionaries in `shared/metaModel.ts`
  are dead and must be deleted; UI reads `t.capability[k]`, `t.saturation[k]`, etc.

**English default**, persisted in `localStorage` under `benchlens-lang`, also
drives `<html lang>`. Dark theme default, `.dark` / `.light` class on `<html>`.

## File map

| Path | Role |
| --- | --- |
| `client/src/i18n/en.ts` | Key-space source of truth. Exports `en`, `type Dict`. **No `as const`** — it would narrow values to literals and break zh. |
| `client/src/i18n/zh.ts` | Typed `Dict`, so a missing key is a compile error. |
| `client/src/i18n/index.tsx` | `I18nProvider`, `useI18n()`, `useT()`. Exposes `allDicts` for cross-language palette search. |
| `client/src/components/MetaBadges.tsx` | Reference conversion. Exports `useMetricExplain()`. |
| `client/src/components/Contents.tsx` | Nav items now carry a `key: NavKey`, not literal labels. Holds the language + theme toggles. |

## Verification scripts (all under `scripts/`)

- `inspect_i18n.mjs` — imports both packs for real and diffs their structure.
  Text-grepping the .ts files was unreliable; this is authoritative.
- `find_untranslated.mjs` — strips comments, then reports remaining CJK. Chinese
  inside comments is documentation and stays.
- `count_cjk.mjs` — raw per-file CJK line counts (over-reports; use the above).
- `bump_typescale.mjs` — already applied: 231 size tokens raised to the 12px floor.

`server/i18n.test.ts` asserts: identical key sets, no empty values, zh actually
contains CJK (with a Latin whitelist for `pass@k`, `Ctrl K`, brand, etc.), and
every meta-model enum key has a label in both packs.

`server/navigation.test.ts` now imports the REAL `Contents.tsx` instead of
mirroring a copy — the old mirrored version kept passing after NavItem changed
shape, which is exactly the failure a test should catch.

## Merge tooling lessons (in `/home/ubuntu/i18n_task/`)

Two real hazards hit during the parallel conversion, both now guarded:
1. **Duplicate namespace keys silently shadow.** Appending a second
   `common: { ... }` to the same object literal makes JS drop the first one
   entirely, with no error. Fragments targeting an existing namespace must be
   merged INTO it, never appended alongside.
2. **Stale-copy writes lose data.** Rewriting the source string inside a
   per-namespace loop and appending later namespaces to the pre-loop copy
   dropped 6 namespaces. Collect all blocks first, write once.
3. Subtask output can arrive wrapped in Markdown fences; strip them from every
   file, not just the one that visibly breaks.

## Status

Done: dictionaries built and structurally verified (0 mismatches); 18 files
converted; nav/theme/language toggles wired; type scale raised; dark default.

Open: delete the dead Chinese dictionaries from `shared/metaModel.ts`; fix
`InstallPrompt.tsx` (it lost the `isIos`/`isStandalone` helpers and the
`BeforeInstallPromptEvent` type during conversion); full QA sweep across
2 languages x 2 themes x 3 form factors; checkpoint.
