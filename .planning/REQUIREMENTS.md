# Requirements: SnAlign

**Defined:** 2026-05-17
**Core Value:** Translate a lasso selection so a chosen reference point lands on a chosen reference point of a saved anchor — accurately, in one tap, on the device.

**Milestone scope:** Upgrade `sn-plugin-lib` from `^0.1.19` → `^0.1.43` (latest 2026-05-15), audit API changes, adopt high-value wins (notably persistent storage if newly available), and propagate findings into the global `sn-plugin` skill. Code-ready on dev → main; no v0.4.0 tag in this milestone.

## v1 Requirements

### Upgrade — keep this project running on the new lib

- [ ] **UPGRADE-01**: `package.json` declares `sn-plugin-lib@^0.1.43` and `npm ci` resolves it cleanly. No transitive-dep conflicts.
- [ ] **UPGRADE-02**: `npx tsc --noEmit` passes against the upgraded types under strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`. Any type-surface changes from the lib are absorbed (call-site fixes, type imports, etc.).
- [ ] **UPGRADE-03**: All 87 existing Jest tests pass against the new lib. Mocks updated as needed if the SDK shape moved under them.
- [ ] **UPGRADE-04**: `npm run build` produces a working `.snplg`. Sideload-test on A5X2 confirms popup opens, Set Anchor / Apply / Apply & Re-anchor / page-bounds-warning / locale switching / minimal-first-run-layout all work as in v0.3.0.
- [ ] **UPGRADE-05**: An API-diff audit is captured in writing — a short doc (in `.planning/research/` or inlined in the relevant phase plan) listing each breaking change, behavioral change, and net-new API in 0.1.19 → 0.1.43. Sourced from package types, source, and https://docs.supernote.com/en. This is the load-bearing artifact for deciding what to adopt and what to document.

### Adopt — pick up newly-unlocked capabilities where high value

- [x] **ADOPT-01**: If the new lib enables real persistent storage (bundled AsyncStorage native module OR a new KV API on `PluginManager`/`NativePluginManager`/`PluginFileAPI`), swap the in-memory `anchorStorage` for it through the existing `KvBackend` interface. Anchor + config survive plugin reinstall and device restart, verified by sideload test. **Conditional on UPGRADE-05 finding.** — *Declined Phase 3 (2026-05-17): audit §6.1 dispositive — no AsyncStorage bundling in `node_modules/sn-plugin-lib/android/`; empty `dependencies` in `node_modules/sn-plugin-lib/package.json`; no KV-shaped public method on `PluginManager.d.ts` / `NativePluginManager.d.ts` / `PluginFileAPI.d.ts` / `PluginCommAPI.d.ts`. In-memory storage remains the contract (matches ROADMAP §3 SC#1's "If unavailable, the decision is documented and in-memory storage remains"). Dead `KvBackend` scaffolding removed in Phase 3-01 refactor. Reopener: future `sn-plugin-lib` release adds a public KV API on `PluginManager` / `NativePluginManager` / `PluginFileAPI` — re-run the Phase 1 audit shape on any future patch/minor/major release.*
- [x] **ADOPT-02**: If the new lib exposes any API that materially simplifies code we already have (e.g. a working `modifyButtonRes`, a built-in page-bounds query, a `setLassoBoxState` shortcut), adopt where the simplification is net-negative LOC. Skip if marginal. **Conditional on UPGRADE-05 finding.** — *Declined Phase 3 (2026-05-17): all 5 candidate simplifications declined as paper-dispositive. (1) `modifyButtonRes` — audit §6.2: public `PluginManager` wrapper still does not bridge it; the optional `modifyButtonRes?` stub in `src/buttons/buttonCommon.ts` stays as accurate SDK posture. (2) Page-bounds query — audit §6.3: no new public API on `PluginCommAPI` / `PluginFileAPI`; existing 3-step `resolvePageSize` + 1920×2560 fallback in `src/sdk/pageSize.ts` stays. (3) `lassoElements(rect)` — audit §5 N-01 + native bridge inspection (`CommAPIModule.java:763`): semantically distinct from `resizeLassoRect` ("套索元素" = "lasso the elements at this rect", vs. "调整套索框区域大小" = "adjust lasso box region size") — would regress the move-via-bbox trick, not simplify it. (4) `generateLassoPreview` — audit §5 N-03 + §6.4: UX-additive only, no LOC reduction; declined sight-unseen. (5) `showPluginView` — audit §5 N-04 + §6.4: only useful if "Apply without closing" UX is desired; declined sight-unseen. Reopener: a future `sn-plugin-lib` release that bridges `modifyButtonRes` on the public `PluginManager` surface, OR a user signal for lasso-content preview thumbnail (re-evaluates N-03), OR a UX revisit of "Apply without closing" (re-evaluates N-04).*

### Skill — keep `~/.claude/skills/sn-plugin/` accurate for future plugins

- [ ] **SKILL-01**: `SKILL.md` gotchas list audited against 0.1.43. Items still valid retain their `verified-on` line. Items resolved by the upgrade are removed (or marked "fixed in 0.1.x — older firmware may still hit"). Items discovered during the upgrade are added.
- [ ] **SKILL-02**: `references/api-gotchas.md` reflects 0.1.43 — any API signature, supported page size, or `editDataTypes` change is updated. Misleading-name callouts (`Element.recognizeResult`, `EinkManager.enableFullUiAuto`) re-verified.
- [ ] **SKILL-03**: `references/storage.md` accurate for current state — whether AsyncStorage is now bundled out-of-box, whether the `node_change/` escape hatch is still the path, whether the in-memory `KvBackend` fallback is still needed. Code example updated to match whichever is recommended.
- [ ] **SKILL-04**: `references/setup-and-build.md` "Verified runtime targets" matrix updated with `sn-plugin-lib ^0.1.43` (replacing `^0.1.19`). Other version locks (RN 0.79.2) re-verified.
- [ ] **SKILL-05**: `references/patterns.md` enriched with any new patterns the upgrade reveals (new API recipes, new gotchas-as-patterns). Skip if no new patterns warranted.

## v2 Requirements

Deferred to future milestone after this code-ready set lands and sideloads cleanly.

### Release

- **RELEASE-01**: Cut v0.4.0 tag — bump `package.json` + `PluginConfig.json`, run `release.yml`, publish GitHub Release with `.snplg`. Triggered by user once sideload-test passes.

### Dev toolchain refresh

- **TOOLCHAIN-01**: TypeScript 5.9 → 6.x audit + bump. Run a Phase-1-style audit pattern (ghost-bump on scratch, capture tsc + jest evidence, classify changes against `tsconfig.json` strict flags) before adopting.
- **TOOLCHAIN-02**: Jest 29 → 30 audit + bump (includes `@types/jest`). Phase-1-style audit. Jest 30 has config / migration changes; mocks may need updating.
- **TOOLCHAIN-03**: ESLint 8 → 10 (two majors) audit + bump. Flat-config migration + rule renames; high churn risk for `.eslintrc.js`-driven projects like SnAlign.
- **TOOLCHAIN-04**: `@react-native-community/cli` 18 → 20 bump. Dev-tool only; lower risk than the others but still cross-version.
- Surfaced by Phase 2 `npm outdated` investigation (2026-05-17). User opted to capture as a future milestone rather than fold into Phase 2's `sn-plugin-lib`-focused scope.

## Out of Scope

| Feature | Reason |
|---------|--------|
| v0.4.0 release tag in this milestone | User wants sideload-verification on the upgraded lib before committing to a release. Moved to v2 as RELEASE-01. |
| Multi-anchor list with picker | Single anchor remains sufficient for the workflow; multi-anchor adds selection UX without proven need. |
| Visual preview of post-apply rect | Nice-to-have; defer until users ask. |
| Snap-to-grid / magnetic offset presets | Would change the input model (currently free-form ±10 stepper); defer. |
| Revisiting Inkling skill upstream | The `sn-plugin` skill was just refined merging Inkling content; we don't need to round-trip changes back to the Inkling source. |
| Verifying all 43 Inkling-derived gotchas against 0.1.43 firmware | The audit (UPGRADE-05) catches the ones our code touches. A full sweep is a separate, larger maintenance effort. |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| UPGRADE-05 | Phase 1 (API Diff Audit) | Pending |
| UPGRADE-01 | Phase 2 (Compatibility Upgrade) | Pending |
| UPGRADE-02 | Phase 2 (Compatibility Upgrade) | Pending |
| UPGRADE-03 | Phase 2 (Compatibility Upgrade) | Pending |
| ADOPT-01 | Phase 3 (Adopt High-Value Wins) | Declined |
| ADOPT-02 | Phase 3 (Adopt High-Value Wins) | Declined |
| UPGRADE-04 | Phase 4 (Sideload Verify and Skill Propagation) | Pending |
| SKILL-01 | Phase 4 (Sideload Verify and Skill Propagation) | Pending |
| SKILL-02 | Phase 4 (Sideload Verify and Skill Propagation) | Pending |
| SKILL-03 | Phase 4 (Sideload Verify and Skill Propagation) | Pending |
| SKILL-04 | Phase 4 (Sideload Verify and Skill Propagation) | Pending |
| SKILL-05 | Phase 4 (Sideload Verify and Skill Propagation) | Pending |

**Coverage:**
- v1 requirements: 12 total
- Mapped to phases: 12
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-17*
*Last updated: 2026-05-17 after Phase 3 decision record — ADOPT-01 and ADOPT-02 declined paper-dispositive per audit §6.1/§6.2/§6.3/§5/§6.4*
