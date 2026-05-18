---
phase: 03-adopt-high-value-wins
plan: 01
status: complete
subsystem: storage-cleanup, decision-record
tags: [chore, yagni-cleanup, adopt-decline, decision-record, two-commit-shape]
requirements: [ADOPT-01, ADOPT-02]
requires:
  - "Phase 1: API diff audit (lib-0.1.19-to-0.1.43-audit.md §6.1, §6.2, §6.3, §6.4, §5 N-01/N-03/N-04)"
  - "Phase 2: 87/87 jest baseline on dev (02-01-SUMMARY.md)"
provides:
  - "ADOPT-01 verdict recorded — declined, in-memory storage remains; KvBackend dead code removed"
  - "ADOPT-02 verdict recorded — all 5 candidates declined paper-dispositive"
  - "Phase 4 planner handoff — audit §8.2, §8.4, §8.5, §8.6 dropped from Phase 4 scope"
affects:
  - src/storage/anchorStorage.ts
  - __tests__/anchorStorage.test.ts
  - .planning/REQUIREMENTS.md
  - .planning/PROJECT.md
tech-stack:
  added: []
  patterns: [yagni-cleanup, decision-record, two-commit-shape-D16]
key-files:
  created:
    - .planning/phases/03-adopt-high-value-wins/03-01-SUMMARY.md
  modified:
    - src/storage/anchorStorage.ts
    - __tests__/anchorStorage.test.ts
    - .planning/REQUIREMENTS.md
    - .planning/PROJECT.md
decisions:
  - "D-01 applied: ADOPT-01 declined per audit §6.1 dispositive (no AsyncStorage bundling, no new KV API)"
  - "D-04 applied: KvBackend type + createKvBackedAnchorStorage removed as dead code"
  - "D-05 applied: 10 KvBackend tests removed; test count 87 → 77"
  - "D-06..D-10 applied: ADOPT-02's 5 candidates all declined paper-dispositive"
  - "D-13 applied: REQUIREMENTS.md [x] Declined format with verdict notes"
  - "D-14 applied: PROJECT.md Key Decisions one row flipped + one new row added"
  - "D-16 applied: two atomic commits — refactor first, docs second"
metrics:
  commits: 2
  jest_tests_before: 87
  jest_tests_after: 77
  files_changed_vs_dev: 5
  completed_date: 2026-05-17
---

# Phase 3 Plan 1: ADOPT-01 + ADOPT-02 Decision Record Summary

Locked the Phase 3 adoption verdicts: ADOPT-01 (persistent storage) and ADOPT-02 (code simplifications) both declined paper-dispositive against Phase 1's audit. Removed the `KvBackend` future-ready scaffolding as dead code (D-04, audit §6.1), dropped the 10 KvBackend tests (D-05), and recorded the decline verdicts in REQUIREMENTS.md, PROJECT.md, and this SUMMARY. No on-device work, no edits beyond the storage module + its test file + three planning docs.

## What Was Built

### Commit 1 — `refactor(03): remove KvBackend dead code + drop KvBackend tests` (`25b8785`)

- **`src/storage/anchorStorage.ts`**: shrank from ~150 lines to 87 lines. Removed: `KvBackend` type (storage backend abstraction); `createKvBackedAnchorStorage` factory; the `ANCHOR_STORAGE_KEY` const (namespaced storage key — its only consumer was the deleted factory); the private `parseEnvelope` / `serialiseEnvelope` schema-v3 helpers (KvBackend-only consumers — the surviving in-memory backend never round-trips through JSON, so neither helper had a remaining call site); the `SCHEMA_VERSION` const; and the now-unused `Logger` import. Preserved: `AnchorState`, `AnchorEnvelope` (v3 schema TYPE — re-introducing a persistent backend re-imports the type and starts parsing again), `DEFAULT_ANCHOR_STATE`, the `AnchorStorage` interface, the private `buildStorage` helper, `createMemoryAnchorStorage`, `getDefaultAnchorStorage`, and `__resetDefaultAnchorStorageForTest`. Schema versioning is preserved at the TYPE level via `AnchorEnvelope.version: 3`.
- **`__tests__/anchorStorage.test.ts`**: removed the `describe('KV-backed storage', ...)` block (10 `it(...)` tests) and the `fakeKv()` helper above it. The `import { createKvBackedAnchorStorage, ANCHOR_STORAGE_KEY, ... }` line was trimmed to match the surviving exports. Preserved: the `describe('memory storage', ...)` block (5 tests) and the `describe('getDefaultAnchorStorage', ...)` block (2 tests). Net change: 87 → 77 jest tests.

### Commit 2 — `docs(03): record ADOPT-01/02 decline verdicts` (this commit)

- **`.planning/REQUIREMENTS.md`**: ADOPT-01 + ADOPT-02 checkboxes flipped `[ ]` → `[x]` with verdict notes (D-13 format — audit citation + reopener trigger). Traceability table updated: both rows flipped `Pending` → `Declined`. Footer "Last updated" line updated to 2026-05-17 with Phase 3 closure note.
- **`.planning/PROJECT.md`**: Key Decisions table — existing "Adopt high-value wins from lib upgrade" row Outcome flipped `— Pending` → `✓ Declined — paper-dispositive`. New row added below: "Adopt code simplifications from lib upgrade" with `✓ Declined — all 5 candidates paper-dispositive`. Footer "Last updated" line updated. Per D-14.
- **`.planning/phases/03-adopt-high-value-wins/03-01-SUMMARY.md`**: this file — the decision record + Phase 4 planner handoff (per D-12).

## Decision Record

### ADOPT-01 — Declined (D-01)

Audit §6.1 is dispositive: no AsyncStorage native module bundled in `node_modules/sn-plugin-lib/android/`; empty `dependencies` field in `node_modules/sn-plugin-lib/package.json`; and no KV-shaped public method (`getItem` / `setItem` / `removeItem` / equivalents) on `PluginManager.d.ts`, `NativePluginManager.d.ts`, `PluginCommAPI.d.ts`, or `PluginFileAPI.d.ts`. In-memory `createMemoryAnchorStorage` remains the contract, matching ROADMAP §3 Success Criterion #1's "If unavailable, the decision is documented and in-memory storage remains" clause.

**Reopener (D-02):** a future `sn-plugin-lib` release that adds a public KV API on `PluginManager` / `NativePluginManager` / `PluginFileAPI`. Re-run the Phase 1 audit shape on any future patch/minor/major release; if a KV-shaped public method appears, ADOPT-01 re-enters consideration in a new milestone — re-introduce the `KvBackend` interface as a thin adapter (the v3 envelope type at `AnchorEnvelope.version: 3` is the future-migration anchor) and wire `createKvBackedAnchorStorage(backend)` in `index.js`.

### ADOPT-02 — Declined (D-06..D-10) — all 5 candidates paper-dispositive

1. **`modifyButtonRes`** — declined per D-06 / audit §6.2. Public `PluginManager` wrapper still does not bridge it; the type exists only on `NativePluginManager.d.ts:112`. The optional `modifyButtonRes?: (...) => Promise<boolean>` stub on `PluginManagerLike` in `src/buttons/buttonCommon.ts` stays — typed as optional (`?:`) and never called, so it carries zero runtime cost while reflecting accurate SDK posture. No source edit.

2. **Page-bounds query simplification** — declined per D-07 / audit §6.3. No new public API on `PluginCommAPI` or `PluginFileAPI` for clamp / pageBounds / pageRect / equivalent. The existing 3-step `resolvePageSize` (`getCurrentFilePath` + `getCurrentPageNum` + `getPageSize`) + 1920×2560 fallback in `src/sdk/pageSize.ts` is the right approach. No source edit.

3. **`lassoElements(rect)`** — declined per D-08 / audit §5 N-01 + §6.4 + native bridge inspection. The TS wrapper is a pass-through (`node_modules/sn-plugin-lib/src/sdk/PluginCommAPI.ts:422-440`); the native bridge JSDoc at `CommAPIModule.java:763` reads `套索元素` ("lasso the elements at this rect"), distinct from `resizeLassoRect`'s `调整套索框区域大小` ("adjust lasso box region size"). SnAlign uses `resizeLassoRect` as a translate-by-bbox-change trick — swapping to `lassoElements` would select whatever happens to sit at the destination rect instead of translating the original selection. Regression, not simplification. `src/handlers/onLassoMain.ts:181` stays on `resizeLassoRect`.

4. **`generateLassoPreview`** — declined sight-unseen per D-09 / audit §5 N-03 + §6.4 + §8.5. UX-additive only (popup thumbnail), no LOC reduction. Absent a concrete user-demand signal for a lasso-content thumbnail in the popup, the spike cost isn't justified.

5. **`showPluginView`** — declined sight-unseen per D-10 / audit §5 N-04 + §6.4 + §8.6. Only useful if "Apply without closing" UX is desired. Currently every Apply closes the popup; the user has not flagged this as a pain point and the existing flow is consistent with Set Anchor / Apply & Re-anchor.

**Reopeners** (combined for ADOPT-02): a future `sn-plugin-lib` release that bridges `modifyButtonRes` on the public `PluginManager` surface re-evaluates #1; a user demand signal for lasso-content preview thumbnail re-evaluates #4 (per D-09); a UX revisit of "Apply without closing" re-evaluates #5 (per D-10).

## Code Impact

- **Test count change:** 87 → 77 (10 KvBackend tests removed in commit `25b8785`). The drop is intentional per D-05. The removed tests are all in the deleted `describe('KV-backed storage', ...)` block of `__tests__/anchorStorage.test.ts` (pre-refactor lines 76-167). Surviving counts: 5 tests in `describe('memory storage', ...)` + 2 tests in `describe('getDefaultAnchorStorage', ...)` = 7 tests in `anchorStorage.test.ts` post-refactor, plus the unchanged ~70 tests across the 6 other test suites.
- **`src/storage/anchorStorage.ts` post-refactor public surface:**
  - Exports preserved: `AnchorState` (type), `AnchorEnvelope` (type — v3 schema, future-migration anchor), `DEFAULT_ANCHOR_STATE`, `AnchorStorage` (interface), `createMemoryAnchorStorage`, `getDefaultAnchorStorage`, `__resetDefaultAnchorStorageForTest`.
  - Exports removed: `createKvBackedAnchorStorage`, `ANCHOR_STORAGE_KEY`.
  - Internal helpers removed (KvBackend-only consumers, dropped to satisfy `noUnusedLocals`): `parseEnvelope`, `serialiseEnvelope`, the `SCHEMA_VERSION` const, the `Logger` import.
- **`index.js` wiring is unchanged.** The only consumer of `anchorStorage.ts` is `getDefaultAnchorStorage()` (the load-bearing entry point) which still returns a memory backend.
- **Orthogonality invariant preserved** (ROADMAP §3 SC#3): the surviving `buildStorage` retains the read-modify-write pattern — `setConfig` spreads `{...current, config}` (only `config` touched), `setAnchorBox` spreads `{...current, anchorBox: box}` (only `anchorBox` touched). `config` ⟂ `anchorBox` holds.

## CI Gate Evidence

Captured after commit `25b8785` (refactor); re-confirmed after commit 2 (docs-only, source untouched):

| Gate | Command | Exit | Notes |
|------|---------|------|-------|
| 1. ESLint | `npx eslint src/ App.tsx index.js __tests__/` | `0` | No output |
| 2. Prettier | `npx prettier --check "src/**/*.{ts,tsx}" "App.tsx" "index.js" "__tests__/**/*.ts"` | `0` | `All matched files use Prettier code style!` |
| 3. TypeScript | `npx tsc --noEmit` | `0` | Strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes |
| 4. Jest | `npm test` | `0` | `Tests: 77 passed, 77 total` across 7 suites |
| 5. Build | `npm run build` | `0` | `build/outputs/SnAlign.snplg` produced |

ROADMAP §3 SC#4 satisfied.

## Phase 4 Planner Handoff

Per D-03 / D-08 / D-09 / D-10 / D-11, the Phase 4 planner reads this SUMMARY before scoping and DROPS the following items from Phase 4 scope:

- audit §8.2 (AsyncStorage runtime probe `try { require('@react-native-async-storage/async-storage') } catch`) — DROPPED per D-03. Paper-evidence-trumps-runtime-check; the long-term reopener in D-02 (release-watching) is the right trigger, not a defensive one-time probe.
- audit §8.4 (`lassoElements(rect)` sideload-verify test plan) — DROPPED per D-08. Paper-decline based on native bridge JSDoc; no on-device verification needed.
- audit §8.5 (`generateLassoPreview` spike) — DROPPED per D-09. Sight-unseen decline; no LOC reduction to chase.
- audit §8.6 (`showPluginView` spike) — DROPPED per D-10. Sight-unseen decline; tied to undecided UX question.

**Phase 4 scope reverts to original (per D-11):** UPGRADE-04 (sideload-verify v0.3.0 still works on the upgraded lib) + SKILL-01..05 (skill file updates). No "needs-eval spike" task.

**Skill reference update (Phase 4 territory, NOT touched by Phase 3):** `~/.claude/skills/sn-plugin/references/storage.md` currently documents the `KvBackend` pattern as a "future-ready" recipe with a SnAlign-side example. Phase 4 `SKILL-03` should update this reference to remove the SnAlign-side example after Phase 3-01's D-04 removal. The general `KvBackend`-adapter pattern can stay in the skill as a recipe for other plugins that may have access to a real KV; only the SnAlign-side citation needs updating.

## Files Modified

| Path | Commit | Change |
|------|--------|--------|
| `src/storage/anchorStorage.ts` | `25b8785` | Removed KvBackend type, createKvBackedAnchorStorage factory, ANCHOR_STORAGE_KEY const, parseEnvelope/serialiseEnvelope helpers, SCHEMA_VERSION const, Logger import. ~150 → 87 lines. |
| `__tests__/anchorStorage.test.ts` | `25b8785` | Removed `describe('KV-backed storage', ...)` block (10 tests) and `fakeKv()` helper; trimmed imports. 87 → 77 jest tests. |
| `.planning/REQUIREMENTS.md` | Commit 2 | ADOPT-01 + ADOPT-02 flipped `[ ]` → `[x]` Declined with verdict notes + reopener triggers (D-13). Traceability table flipped both rows `Pending` → `Declined`. |
| `.planning/PROJECT.md` | Commit 2 | Key Decisions table — existing ADOPT-01 row Outcome flipped to `✓ Declined`; new ADOPT-02 row added (D-14). |
| `.planning/phases/03-adopt-high-value-wins/03-01-SUMMARY.md` | Commit 2 | This file (new). |

## Key Links

- `.planning/REQUIREMENTS.md` ↔ audit §6.1 (ADOPT-01 verdict note) — D-13 citation.
- `.planning/REQUIREMENTS.md` ↔ audit §6.2, §6.3, §5 N-01, §5 N-03, §5 N-04, §6.4 (ADOPT-02 verdict note, 5 candidates) — D-13 citations.
- `03-01-SUMMARY.md` ↔ audit §6.1, §6.2, §6.3, §6.4, §5 (decision record cross-references every dispositive audit subsection).
- `03-01-SUMMARY.md` Phase 4 Planner Handoff ↔ audit §8.2, §8.4, §8.5, §8.6 — handoff cite per D-03/D-08/D-09/D-10/D-11.
- `src/storage/anchorStorage.ts:77` ↔ `index.js` (load-bearing `getDefaultAnchorStorage` entry point — never references KvBackend).

## Verification

- Both commits passed all 5 CI gates locally (lint / prettier / tsc / jest / build) under strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`.
- Orthogonal `config` ⟂ `anchorBox` invariant holds: no edits to handler / popup / core / button / SDK / UI / i18n code. Only `src/storage/anchorStorage.ts` was touched, and the surviving `buildStorage` keeps the per-slot read-modify-write pattern.
- Phase boundary holds: `git diff --name-only dev HEAD` after Commit 2 returns exactly 5 paths — 2 source-tree (`src/storage/anchorStorage.ts`, `__tests__/anchorStorage.test.ts`) + 3 planning-tree (`.planning/REQUIREMENTS.md`, `.planning/PROJECT.md`, `.planning/phases/03-adopt-high-value-wins/03-01-SUMMARY.md`).
- Commit graph matches D-16 order: refactor (`25b8785`) → docs (this commit).

## Hand-off

This plan is `autonomous: true` — no checkpoint. The orchestrator handles branch operations per D-15 (`chore/ricardo/03-adopt-decisions` off `dev`) and `.claude/skills/git/SKILL.md`. PR title follows Phase 2 precedent: `chore(03): adopt-phase decision record — ADOPT-01 + ADOPT-02 declined`.

## Self-Check: PASSED

- **Created file** `.planning/phases/03-adopt-high-value-wins/03-01-SUMMARY.md` — verified by the file being written successfully.
- **Modified files match frontmatter:**
  - `src/storage/anchorStorage.ts` — FOUND in commit `25b8785`; surviving exports verified by `grep -c 'export ' src/storage/anchorStorage.ts`.
  - `__tests__/anchorStorage.test.ts` — FOUND in commit `25b8785`; `fakeKv` zero matches; `createKvBackedAnchorStorage` zero matches.
  - `.planning/REQUIREMENTS.md` — `[x] **ADOPT-01**` and `[x] **ADOPT-02**` both present with verdict notes citing audit subsections.
  - `.planning/PROJECT.md` — Key Decisions has `✓ Declined — paper-dispositive` row and `Adopt code simplifications` row with `✓ Declined — all 5 candidates`.
- **Commits:**
  - `25b8785 refactor(03): remove KvBackend dead code + drop KvBackend tests` — FOUND in `git log`.
  - Commit 2 `docs(03): record ADOPT-01/02 decline verdicts` — created by this Task 2 commit.
- **Phase 4 handoff section** present with `audit §8.2`, `audit §8.4`, `audit §8.5`, `audit §8.6` citations.
- **Test count change** stated explicitly: `87 → 77`.
