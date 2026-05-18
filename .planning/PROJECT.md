# SnAlign

## What This Is

A React Native plugin for the Supernote E-Ink tablet (`sn-plugin-lib`). The user picks a reference point on a saved "anchor" rectangle and a reference point on the current lasso selection; SnAlign translates the lasso so the two points coincide, with optional per-axis offsets and per-axis align toggles, as long as the result fits inside the page. Target users: Supernote owners who want precise spatial alignment between handwriting / shapes / images / text-boxes on a note page.

## Core Value

Translate a lasso selection so a chosen reference point lands on a chosen reference point of a saved anchor — accurately, in one tap, on the device.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- ✓ Two-point alignment model — pick reference point on anchor + reference point on target (9 each: 4 corners + 4 sides + center). Translation = `(anchorPoint + offset) - targetPoint`, axis-gated by toggles. — v0.2.0
- ✓ Per-axis `alignX` / `alignY` toggles freeze either axis independently. — v0.2.0
- ✓ Per-axis `offsetX` / `offsetY` steppers (±10 firmware px per tap, signed). Greys out when matching axis toggle is off. — v0.3.0
- ✓ Apply Alignment — translates the lasso via `resizeLassoRect`, commits on `setLassoBoxState(2)`, supports native undo. — v0.2.0
- ✓ Apply & Re-anchor — same translation, then saves the moved bbox as the new anchor (chained alignments without re-selecting). — v0.3.0
- ✓ Set Anchor / Set New Anchor — top-row affordance separating anchor management from layout config. — v0.3.0
- ✓ Minimal first-run layout — header + status + primary Set Anchor button only when no anchor saved. Full controls appear after first save. — v0.3.0
- ✓ Page-bounds enforcement — Apply / Apply & Re-anchor disabled with inline warning when result would exit page. Uses `resolvePageSize` (3-step firmware lookup + 1920×2560 fallback). — v0.2.0
- ✓ Orthogonal `config` + `anchorBox` model — changing one never disturbs the other. Load-bearing invariant. — v0.2.0
- ✓ Seven-locale i18n — en, zh_CN, zh_TW, ja, th, nl, de. Plugin name + button name + all UI strings localized. — v0.2.0
- ✓ Strict CI gates — lint, prettier, tsc (strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`), Jest (87 tests across 7 suites), no-op `build-check` aggregator. — v0.2.0
- ✓ Tag-only release workflow — `workflow_dispatch` only release.yml; version sourced from `package.json` on main; dev → main release-train PR pattern. — v0.2.0

### Active

<!-- Current scope. Building toward these. -->

- [ ] Upgrade `sn-plugin-lib` from `^0.1.19` → `^0.1.43` (latest as of 2026-05-15). Project must keep building, all 87 tests must pass, sideload-test must succeed on A5X2.
- [ ] Audit the 0.1.19 → 0.1.43 API surface diff (types + source + docs at https://docs.supernote.com/en). Identify breaking changes, new APIs, fixed quirks.
- [ ] Adopt high-value wins unlocked by the upgrade — primary candidates: real persistent storage (if AsyncStorage native module now bundled OR a new KV API exists), working `modifyButtonRes`, any new lasso/page APIs that simplify current code.
- [ ] Update the `sn-plugin` skill at `~/.claude/skills/sn-plugin/` to reflect 0.1.43 reality — api-gotchas (verify which still apply), patterns (any new recipes), storage (update AsyncStorage failure-mode note if status changed), setup-and-build (version bump for the runtime-targets matrix).
- [ ] Code-ready on dev → main (no v0.4.0 tag yet). User will sideload-test before deciding to release.

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- v0.4.0 release tag — deferred to a follow-up after sideload verification. The upgrade may surface issues only visible on-device.
- Multi-anchor list with picker — explicitly deferred (single saved anchor is enough for the current workflow; saving multiple introduces selection UX without proven need).
- Visual preview of the post-apply rect in the popup — additive nice-to-have; defer until users ask.
- Snap-to-grid or magnetic offset presets — would change the input model (currently free-form ±10 stepper); defer.
- Custom-layer support — DOC files only have main layer; NOTE plugins on custom layers can't insert titles/links/five-stars. SnAlign only does `resizeLassoRect` so layer restrictions don't bite, but if expanding to per-element insertion we'd need to address this.

## Context

**Hardware target.** Supernote A5X2 — 1920 × 2560 Android screen, 21632 × 16224 EMR digitizer coords. Older A5X has 1404 × 1872 — not verified but `resolvePageSize` falls back gracefully. Other models likely work but untested.

**Runtime.** Bundled JSC/Hermes via PluginHost. `Intl.Collator` works; `process.env.NODE_ENV` does NOT (use `__DEV__`). React Native is **locked at 0.79.2** — any other version breaks PluginHost compatibility.

**Storage today.** In-memory only. `@react-native-async-storage/async-storage` is not in `package.json` (we explicitly fall back to in-memory `KvBackend`-style behavior). State survives note swaps and lasso taps within a session; lost on plugin reinstall or device restart. This is a known limitation the user has accepted.

**Sibling plugins** for reference patterns: `~/repo/SN/sn-shapes`, `sn-mindmap`, `sn-dictionary`, `sn-plugin-demo-sticker`, `~/repo/SN/Inkling`. Cross-cutting SDK knowledge lives in the `sn-plugin` skill at `~/.claude/skills/sn-plugin/`, NOT duplicated here.

**Codebase map.** Brownfield analysis lives in `.planning/codebase/` (7 docs, ~1,500 lines) — produced via `/gsd-map-codebase` and merged in PR #31. Read those when implementation context is needed.

**Releases.** v0.3.0 shipped 2026-05-03. Dev → main release-train PR + manual `workflow_dispatch` tag is the established flow (see `.github/workflows/release.yml` and the `release.md` reference in the `sn-plugin` skill).

## Constraints

- **Tech stack**: React Native 0.79.2 (locked by PluginHost), TypeScript strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`, Node 20 in CI. Any deviation breaks the runtime contract.
- **SDK dependency**: `sn-plugin-lib` is the sole bridge to firmware. Upgrades in this dependency are the load-bearing event of this milestone.
- **Storage**: In-memory only out of the box. If AsyncStorage or another native KV becomes available via the lib upgrade or `node_change/` bundling, that opens up persistent state. Otherwise, in-memory remains the contract.
- **Hardware verification**: A5X2 is the only device we test on. Logic must degrade gracefully on other firmware versions / page sizes (`resolvePageSize` fallback to 1920×2560 is the safety net).
- **Branch protection**: All changes enter `dev` via PR. `dev → main` is the release-train path. `main` is what gets tagged.
- **CI gates**: lint, prettier, typecheck, jest, build-check must all pass before merge. Branch protection on `dev` requires `build-check`.

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Orthogonal `config` + `anchorBox` model | Anchor management (snapshot of bbox) is conceptually separate from layout (pickers / toggles / offsets). Coupling them was tried and rejected. | ✓ Good — survived two major UX revisions (offset rename, Apply & Re-anchor) without re-architecture |
| Single lasso button (id 201, `showType: 1`) | Page-toolbar button was redundant; everything fits in one popup. | ✓ Good |
| Shared `performApply(alsoReAnchor)` helper | Apply and Apply & Re-anchor share the heavy lifting; the boolean parameter is the only difference. Skip re-anchor on resize failure / out-of-bounds. | ✓ Good — chaining correctness invariant |
| In-memory storage with reset-on-schema-mismatch | AsyncStorage native module isn't bundled. Hand-rolled migration would mostly fail anyway when state doesn't survive reinstalls. | ⚠️ Revisit — if 0.1.43 brings real persistence, swap to it |
| PopupRoot never returns null | Returning null observed to make firmware dismiss the overlay before our state update lands. Render a safe header + close button instead. | ✓ Good — load-bearing for popup mount race |
| Subscribe replays current state | `popupController.subscribe(listener)` calls `listener(currentState)` immediately so a `show()` fired before React mount isn't lost. | ✓ Good |
| Settings auto-persist on every callback | Picker / toggle / offset changes save through `storage.setConfig` immediately. Only Apply / Apply & Re-anchor / Set Anchor / Close tear down the popup. | ✓ Good |
| Cross-cutting plugin knowledge in `sn-plugin` skill, not CLAUDE.md | CLAUDE.md was bloated with SDK quirks that apply to every Supernote plugin. Moved to skill so future plugins reuse it. | ✓ Good — landed in PR #30 |
| Adopt high-value wins from lib upgrade | If the new lib unlocks deferred behavior (persistent storage, working `modifyButtonRes`), pick it up in this milestone rather than waiting. | ✓ Declined — paper-dispositive (Phase 3, audit §6.1: no AsyncStorage bundling / no new KV API). In-memory storage remains; `KvBackend` dead code removed in 03-01 refactor. Reopener: future lib release adds a KV API. |
| Adopt code simplifications from lib upgrade | If the new lib exposes APIs that materially simplify existing code (modifyButtonRes, page-bounds query, lassoElements, generateLassoPreview, showPluginView), adopt those with net-negative LOC. | ✓ Declined — all 5 candidates paper-dispositive (Phase 3, audit §6.2/§6.3/§5 N-01/N-03/N-04/§6.4). No source edits; `modifyButtonRes?` stub stays as optional, accurate SDK posture. Reopener: lib bridges modifyButtonRes publicly, OR user signals demand for preview/"apply-without-closing" UX. |
| Code-ready milestone (no v0.4.0 tag yet) | The lib upgrade may surface issues only visible on-device. Sideload-test before committing to a release. | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-17 after Phase 3 (Adopt High-Value Wins) recorded ADOPT-01 + ADOPT-02 decline verdicts (paper-dispositive per audit §6.1/§6.2/§6.3/§5/§6.4; KvBackend dead code removed in 03-01 refactor).*
