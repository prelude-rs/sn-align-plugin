# Roadmap: SnAlign — sn-plugin-lib 0.1.19 → 0.1.43 Upgrade

## Overview

This milestone upgrades the sole firmware bridge (`sn-plugin-lib`) by 24 patch versions, propagates whatever changed into the project, and lifts those findings into the shared `~/.claude/skills/sn-plugin/` skill so future Supernote plugins benefit. The journey is dependency-ordered: first an API-diff audit produces the load-bearing artifact (UPGRADE-05) that tells us what's breaking, what's new, and what's fixed; then we make the project build/typecheck/test green on the new lib (UPGRADE-01..03); then we conditionally adopt high-value wins surfaced by the audit (ADOPT-01..02); finally we sideload-verify on A5X2 and update the shared skill so it reflects 0.1.43 reality (UPGRADE-04 + SKILL-01..05). No v0.4.0 tag in this milestone — code-ready on `dev → main`, release is deferred to v2 (RELEASE-01) once sideload confirms healthy.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3, 4): Planned milestone work
- Decimal phases (e.g. 2.1): Reserved for urgent insertions discovered mid-milestone

Granularity: **coarse** (4 phases — discovery → compatibility → adoption → verify + propagate)

- [ ] **Phase 1: API Diff Audit** - Capture written audit of every breaking change, new API, and fixed quirk in sn-plugin-lib 0.1.19 → 0.1.43
- [x] **Phase 2: Compatibility Upgrade** - Land the lib bump, absorb type-surface changes, restore green CI (lint, typecheck, all 87 tests) (completed 2026-05-17)
- [ ] **Phase 3: Adopt High-Value Wins** - Conditionally pick up persistent storage and any net-negative-LOC simplifications surfaced by the audit
- [ ] **Phase 4: Sideload Verify and Skill Propagation** - Verify on A5X2 that v0.3.0 behavior is preserved, then update the shared `sn-plugin` skill to reflect 0.1.43 reality

## Phase Details

### Phase 1: API Diff Audit
**Goal**: A written audit exists that lists every breaking change, behavioral change, and net-new API between sn-plugin-lib 0.1.19 and 0.1.43 — enough to drive informed decisions in every subsequent phase.
**Depends on**: Nothing (first phase)
**Requirements**: UPGRADE-05
**Success Criteria** (what must be TRUE):
  1. Audit document exists at `.planning/research/lib-0.1.19-to-0.1.43-audit.md` (or equivalent location) listing each breaking change, behavioral change, and net-new API with citations to package types, source, and https://docs.supernote.com/en.
  2. Audit explicitly answers: "Is AsyncStorage now bundled, or is there a new KV API?" — the ADOPT-01 decision input.
  3. Audit explicitly answers: "Does `modifyButtonRes` work? Is there a built-in page-bounds query? Any new lasso/page APIs?" — the ADOPT-02 decision input.
  4. Each existing SnAlign call site (`PluginManager`, `PluginCommAPI.{getLassoRect,resizeLassoRect,setLassoBoxState,getCurrentFilePath,getCurrentPageNum,closePluginView}`, `PluginFileAPI.getPageSize`) is checked against the new types and flagged if its signature, behavior, or return shape changed.
**Plans**: 6 plans
  - [ ] 01-01-PLAN.md — Evidence: .d.ts machine diff between 0.1.19 and 0.1.43 (audit branch + scratch installs)
  - [ ] 01-02-PLAN.md — Evidence: ghost-upgrade tsc + jest logs on scratch/ricardo/ghost-0.1.43
  - [ ] 01-03-PLAN.md — Audit doc: call-site sweep + Breaking / Behavioral / Net-new buckets
  - [ ] 01-04-PLAN.md — Audit doc §6: four targeted answers (AsyncStorage, modifyButtonRes, page-bounds, lasso/page APIs)
  - [ ] 01-05-PLAN.md — Audit doc §7 + §8: sn-plugin skill gotcha cross-reference + Unknowns / Paper-only Claims
  - [ ] 01-06-PLAN.md — Final consistency pass + scratch branch deletion (D-15)

### Phase 2: Compatibility Upgrade
**Goal**: SnAlign builds, typechecks, and tests green on `sn-plugin-lib ^0.1.43` — the codebase as it stood before any adoption work, just relinked against the new lib.
**Depends on**: Phase 1
**Requirements**: UPGRADE-01, UPGRADE-02, UPGRADE-03
**Success Criteria** (what must be TRUE):
  1. `package.json` declares `sn-plugin-lib@^0.1.43` and `npm ci` resolves with no transitive-dep conflicts.
  2. `npx tsc --noEmit` passes under strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`; any type-surface drift from the lib is absorbed at call sites (no `any` suppressions, no `@ts-expect-error` added).
  3. All 87 Jest tests across 7 suites pass; any test mocks that mirrored the SDK shape are updated to match the new types.
  4. `npx eslint` and `npx prettier --check` still green; CI's `build-check` aggregator would pass.
**Plans**: 1 plan
  - [x] 02-01-PLAN.md — Bump sn-plugin-lib to ^0.1.43, refresh lockfile, run 5 CI gates, update STACK.md, hand off for PR

### Phase 3: Adopt High-Value Wins
**Goal**: Any high-value capability unlocked by 0.1.43 (primarily persistent storage; secondarily code-simplifying APIs) is integrated through existing extension points where the net change is negative LOC or removes a documented limitation.
**Depends on**: Phase 2
**Requirements**: ADOPT-01, ADOPT-02
**Success Criteria** (what must be TRUE):
  1. ADOPT-01 decision is recorded: if persistent storage is available (bundled AsyncStorage native module OR a new KV API), `anchorStorage` is swapped from `createMemoryAnchorStorage` to a real persistent backend through the existing `KvBackend` interface, and the orthogonal `{config, anchorBox}` envelope survives a simulated reinstall in tests. If unavailable, the decision is documented and in-memory storage remains.
  2. ADOPT-02 decision is recorded: each candidate simplification (working `modifyButtonRes`, built-in page-bounds query, `setLassoBoxState` shortcut, anything else the audit surfaced) is either adopted with measurable LOC reduction or explicitly skipped as marginal, with reasoning captured.
  3. The orthogonal `config` ⟂ `anchorBox` invariant still holds — no adoption couples writes that were previously independent.
  4. All 87+ Jest tests still pass (test count may grow if new persistence is added); typecheck and lint remain green.
**Plans**: TBD

### Phase 4: Sideload Verify and Skill Propagation
**Goal**: A built `.snplg` from the upgraded codebase is sideload-verified on A5X2 to behave like v0.3.0 (plus any new adopted capabilities), and the shared `~/.claude/skills/sn-plugin/` skill is updated to reflect 0.1.43 as the current verified target.
**Depends on**: Phase 3
**Requirements**: UPGRADE-04, SKILL-01, SKILL-02, SKILL-03, SKILL-04, SKILL-05
**Success Criteria** (what must be TRUE):
  1. `npm run build` produces `build/outputs/SnAlign.snplg`; sideload on A5X2 confirms popup opens, Set Anchor / Apply / Apply & Re-anchor / page-bounds warning / locale switching / minimal-first-run-layout all work as in v0.3.0 (plus persistence if ADOPT-01 landed).
  2. `~/.claude/skills/sn-plugin/SKILL.md` gotchas list is audited against 0.1.43 — items still valid keep their `verified-on` line, fixed items are removed or marked, newly-discovered items are added.
  3. `~/.claude/skills/sn-plugin/references/api-gotchas.md` reflects any 0.1.43 API signature, supported page size, or `editDataTypes` changes; misleading-name callouts (`Element.recognizeResult`, `EinkManager.enableFullUiAuto`) are re-verified.
  4. `~/.claude/skills/sn-plugin/references/storage.md` matches current reality (AsyncStorage status, `node_change/` escape hatch validity, `KvBackend` fallback need) and `references/setup-and-build.md` "Verified runtime targets" matrix shows `sn-plugin-lib ^0.1.43` with RN 0.79.2 re-verified.
  5. `~/.claude/skills/sn-plugin/references/patterns.md` gains any new patterns the upgrade revealed (or is explicitly noted as unchanged if no new patterns warranted).
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 (decimal phases inserted ad-hoc if needed)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. API Diff Audit | 0/6 | Not started | - |
| 2. Compatibility Upgrade | 1/1 | Complete   | 2026-05-17 |
| 3. Adopt High-Value Wins | 0/TBD | Not started | - |
| 4. Sideload Verify and Skill Propagation | 0/TBD | Not started | - |

---

*Roadmap created: 2026-05-17 via `/gsd:new-project` roadmapper (granularity: coarse, mode: interactive)*
