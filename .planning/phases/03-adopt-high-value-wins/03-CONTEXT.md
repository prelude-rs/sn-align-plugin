# Phase 3: Adopt High-Value Wins - Context

**Gathered:** 2026-05-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Lock the adoption verdicts for `ADOPT-01` (persistent storage) and `ADOPT-02` (code simplifications) based on Phase 1's audit (`.planning/research/lib-0.1.19-to-0.1.43-audit.md`). All 5 adoption candidates are paper-dispositive declines; the only code change is a YAGNI cleanup of dead persistence scaffolding. No on-device spike work — Phase 4 stays scoped to its existing UPGRADE-04 + SKILL-01..05 contract.

**In scope:**
- Remove `createKvBackedAnchorStorage` factory and `KvBackend` interface from `src/storage/anchorStorage.ts` (lines ~55-59 and ~111-129) as dead code.
- Remove the 10 KvBackend tests from `__tests__/anchorStorage.test.ts` that exercise the deleted factory (the per-block from line 76 to ~167; the surrounding `createMemoryAnchorStorage` and `getDefaultAnchorStorage` blocks stay).
- Flip `REQUIREMENTS.md` ADOPT-01 and ADOPT-02 from `[ ]` Pending → `[x]` Declined with verdict notes citing the audit subsections.
- Add one row each to `PROJECT.md` Key Decisions table: "ADOPT-01 declined — audit dispositive" and "ADOPT-02 declined — all 5 candidates paper-dispositive".
- Produce `03-01-SUMMARY.md` documenting the decision record with full audit cross-references and the test-count change (87 → ~77).
- Two-commit branch shape per Phase 2 precedent (D-10 style): `refactor(03): remove KvBackend dead code + drop KvBackend tests` (code+tests), then `docs(03): record ADOPT-01/02 decline verdicts` (REQUIREMENTS / PROJECT / SUMMARY).

**Out of scope:**
- Any on-device spike work — Phase 4 territory; the earlier "expand Phase 4 scope now" answer was reversed by the subsequent "decline all needs-eval sight-unseen" choice.
- Phase 4 `UPGRADE-04` / `SKILL-01..05` work — that phase already owns it.
- Bundling AsyncStorage via the `node_change/` escape hatch — explicitly considered and rejected at the first ADOPT-01 question.
- Edits to `src/buttons/buttonCommon.ts` (the `modifyButtonRes?` optional stub stays — it's typed as optional and never actively called; not the same kind of dead code as the KvBackend factory).
- Edits to `src/sdk/pageSize.ts` (3-step `resolvePageSize` stays — actively used).
- Edits to `src/handlers/onLassoMain.ts` (lasso flow stays — `resizeLassoRect` is the right call for the "move via bbox change" trick; `lassoElements` would regress).
- New `.planning/research/ADOPT-decisions.md` doc — the audit already is the source-of-truth; cross-referencing it from CONTEXT.md + SUMMARY.md is sufficient.
- `~/.claude/skills/sn-plugin/references/storage.md` updates reflecting the KvBackend-pattern removal — that's Phase 4 `SKILL-03` territory; Phase 3 only touches SnAlign's source tree.

</domain>

<decisions>
## Implementation Decisions

### ADOPT-01 — Persistent Storage

- **D-01:** **Decline ADOPT-01 — paper evidence dispositive.** Audit §6.1 confirms: no AsyncStorage bundled in `node_modules/sn-plugin-lib/android/` or `node_modules/sn-plugin-lib/RtnSupernotePluginCore.podspec`; `node_modules/sn-plugin-lib/package.json` has empty `dependencies` and only `react`/`react-native` peers; no new KV-shaped method on `PluginManager.d.ts`, `NativePluginManager.d.ts`, `PluginCommAPI.d.ts`, or `PluginFileAPI.d.ts`. In-memory `createMemoryAnchorStorage` remains the contract, matching ROADMAP Phase 3 success criterion #1's "If unavailable, the decision is documented and in-memory storage remains."

- **D-02:** **Reopener trigger = future `sn-plugin-lib` release that adds a public KV API** on `PluginManager` / `NativePluginManager` / `PluginFileAPI`. NOT firmware injection. Concretely: re-run Phase 1's audit shape on any future patch/minor/major release; if any KV-shaped public method appears, ADOPT-01 re-enters consideration in a new milestone (re-introduce `KvBackend` interface as a thin adapter, wire via `createKvBackedAnchorStorage(backend)` in `index.js`).

- **D-03:** **Drop Phase 4's audit §8.2 runtime-probe test from scope.** The earlier `try { require('@react-native-async-storage/async-storage') } catch` test plan in audit §8.2 is removed. Rationale: paper-evidence-trumps-runtime-check — if the audit was wrong about runtime injection, the long-term reopener (D-02) catches it via release-tracking; we don't want a defensive probe to sit in Phase 4 second-guessing the audit. Phase 4's planner needs to know this so the §8.2 row is omitted from the sideload-verification test plan.

- **D-04:** **Remove `createKvBackedAnchorStorage` + `KvBackend` interface as dead code (YAGNI).** `src/storage/anchorStorage.ts:55-59` (KvBackend type) and `src/storage/anchorStorage.ts:111-129` (createKvBackedAnchorStorage function). Re-add when D-02's reopener fires. The interface was kept as a "future-ready stub"; the user's decision is to not pay carrying-cost for stubs whose triggers are uncertain.

- **D-05:** **Drop the 10 KvBackend tests in `__tests__/anchorStorage.test.ts` alongside the implementation.** Tests at lines 76, 88, 95, 101, 108, 115, 129, 143, 155, 167 (the `createKvBackedAnchorStorage` describe block). Surrounding `createMemoryAnchorStorage` block (lines 45-68) and `getDefaultAnchorStorage` block (lines 178-185) stay. Test count drops 87 → ~77 (final number determined at execute time by re-running `npx jest`). Phase 3 `03-01-SUMMARY.md` explicitly calls out the count change so it's not a surprise in CI logs.

### ADOPT-02 — Code Simplifications

- **D-06:** **Decline `modifyButtonRes` — audit §6.2 dispositive.** Public TS wrapper (`PluginManager.d.ts`) still does not bridge it; type only exists on `NativePluginManager.d.ts:112`. The optional stub `modifyButtonRes?: (...) => Promise<boolean>` on `PluginManagerLike` in `src/buttons/buttonCommon.ts` stays — it's typed as optional (`?:`) and never called, so it carries zero runtime cost and reflects accurate SDK posture. No source edit.

- **D-07:** **Decline page-bounds query simplification — audit §6.3 dispositive.** No new public API on `PluginCommAPI` or `PluginFileAPI` for clamp / pageBounds / pageRect / etc. Existing 3-step `resolvePageSize` in `src/sdk/pageSize.ts:18-50` + `1920×2560` fallback is the right approach. No source edit.

- **D-08:** **Decline N-01 `lassoElements(rect)` — paper-decline; reclassified from audit's `needs-eval` based on follow-up source inspection during this discussion.** Static evidence: TS wrapper is a pass-through (`node_modules/sn-plugin-lib/src/sdk/PluginCommAPI.ts:422-440`); native bridge (`node_modules/sn-plugin-lib/android/src/main/java/com/ratta/supernote/pluginlib/modules/CommAPIModule.java:763`) has Chinese JSDoc `套索元素` (= "lasso the elements at this rect"), distinct from `resizeLassoRect`'s `调整套索框区域大小` (= "adjust lasso box region size"). SnAlign uses `resizeLassoRect` to TRANSLATE the selected elements by re-fitting the bbox (the verb "resize" is misleading — it's a move-via-bbox-change trick). Swapping to `lassoElements` would select whatever happens to sit at the destination rect instead of translating the original selection — regression, not simplification. No source edit; `src/handlers/onLassoMain.ts:181` stays on `resizeLassoRect`.

- **D-09:** **Decline N-03 `generateLassoPreview` sight-unseen.** UX-additive only (popup thumbnail), no LOC reduction. Audit §8.5 frames it as "show a preview thumbnail in the popup if E-Ink latency permits", but absent a concrete user-demand signal, the spike cost (~30 min on-device + decision overhead) isn't justified. Re-enters consideration only if user demand for a lasso-content thumbnail surfaces in a future milestone.

- **D-10:** **Decline N-04 `showPluginView` sight-unseen.** Only relevant if "Apply without closing" UX is desired. Currently every Apply closes the popup; user has not flagged this as a pain point and the existing flow is consistent with Set Anchor / Apply & Re-anchor. Re-enters consideration only if "Apply without closing" UX surfaces in a future design refresh.

- **D-11:** **Phase 4 scope reverts to original — no needs-eval spike task added.** An earlier discussion answer ("Expand Phase 4 scope now") was contingent on at least one needs-eval candidate surviving into Phase 4. With D-08 through D-10 declining all three, the expansion is moot. Phase 4 stays scoped to UPGRADE-04 (sideload-verify v0.3.0 still works) + SKILL-01..05 (skill file updates). Phase 4 planner: do not add a "needs-eval spike" task; do not include audit §8.2's AsyncStorage runtime probe (per D-03); audit §8.4 (`lassoElements`), §8.5 (`generateLassoPreview`), §8.6 (`showPluginView`) test plans are also dropped from Phase 4 scope per these decisions.

### Decision-Record Shape

- **D-12:** **Primary decision record = 03-CONTEXT.md (this file, D-01..D-NN) + 03-01-SUMMARY.md (post-execution evidence) + REQUIREMENTS.md status flips + PROJECT.md Key Decisions rows.** No new `.planning/research/ADOPT-decisions.md` doc — the audit is already the source-of-truth and three-way cross-referencing it (here + SUMMARY + REQUIREMENTS) is sufficient. Symmetric with how Phase 1's UPGRADE-05 audit-decision and Phase 2's UPGRADE-01..03 verdicts were recorded.

- **D-13:** **REQUIREMENTS.md status format = `[x]` Declined with verdict note.** Each requirement keeps its `[ ]`/`[x]` style (no new `[~]` state). Format: `[x] **ADOPT-01**: ... — *Declined Phase 3: audit §6.1 dispositive (no AsyncStorage bundling / no new KV API). Reopener: future sn-plugin-lib release adds a KV API.*` Mirrors Phase 1 and Phase 2's existing closure style — `[x]` = "verdict reached", not narrowly "code adopted".

- **D-14:** **PROJECT.md Key Decisions gets two new rows.** One for ADOPT-01 outcome ("Adopt high-value wins from lib upgrade" — currently `— Pending` — updated to ✓ Decision recorded; in-memory storage remains; KvBackend dead code removed). One for ADOPT-02 outcome (new row: "Adopt code simplifications from lib upgrade"; ✓ Decision recorded; all 5 candidates declined). The existing "Adopt high-value wins from lib upgrade" row's Outcome column flips from `— Pending` to `✓ Declined — paper-dispositive` with phase reference.

### Branch / Commit / PR Shape

- **D-15:** **Branch off `dev`: `chore/ricardo/03-adopt-decisions`** matching `.claude/skills/git/SKILL.md` `<type>/<user>/<short-desc>`. `chore:` prefix because this is a YAGNI cleanup + documentation phase, no feature addition. PR targets `dev` after green CI.

- **D-16:** **Two distinct commits per Phase 2 D-10 precedent.** Commit 1 (refactor): `refactor(03): remove KvBackend dead code + drop KvBackend tests` — touches `src/storage/anchorStorage.ts` and `__tests__/anchorStorage.test.ts` only. Commit 2 (docs): `docs(03): record ADOPT-01/02 decline verdicts` — touches `.planning/REQUIREMENTS.md`, `.planning/PROJECT.md`, and the post-execution `03-01-SUMMARY.md` write. Keeps refactor churn separate from docs churn; matches Phase 2's commit-graph shape.

### Plan Shape

- **D-17:** **Single plan 03-01.** All four work items (KvBackend code removal, KvBackend test removal, REQUIREMENTS.md status flips, PROJECT.md Key Decisions update, SUMMARY.md decision record) fit one plan executed in two atomic commits. Splitting into multiple plans doubles overhead without separation benefit.

### Claude's Discretion

- Exact wording of the two PROJECT.md Key Decisions rows.
- Exact phrasing of the REQUIREMENTS.md verdict notes (must include the audit-section citation and the reopener trigger).
- Exact phrasing of the Phase 4 planner-handoff note in 03-01-SUMMARY.md regarding the §8.2/§8.4/§8.5/§8.6 removals (Phase 4 hasn't been planned yet — when it's planned, the planner reads this CONTEXT.md to skip those items).
- PR title/body wording — follow Phase 2 precedent (e.g., `chore(03): adopt-phase decision record — ADOPT-01 + ADOPT-02 declined`).
- Whether the `modifyButtonRes?` optional stub in `src/buttons/buttonCommon.ts` warrants an inline comment pointing to D-06 and audit §6.2 (cosmetic; low priority).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/ROADMAP.md` §"Phase 3: Adopt High-Value Wins" — Goal, dependencies (Phase 2), requirements ADOPT-01/02, the 4 success criteria (the "If unavailable, the decision is documented" clause is load-bearing for D-01).
- `.planning/REQUIREMENTS.md` §"Adopt — pick up newly-unlocked capabilities where high value" — full ADOPT-01 / ADOPT-02 requirement text; Phase 3 plan updates the status checkboxes per D-13.
- `.planning/PROJECT.md` §"Active" + §"Key Decisions" — milestone framing; Phase 3 adds two rows per D-14.

### Phase 1 audit (Phase 3's source of truth — paper-dispositive for every Phase 3 decision)
- `.planning/research/lib-0.1.19-to-0.1.43-audit.md` §6.1 (AsyncStorage / new KV API → ADOPT-01 verdict, D-01).
- `.planning/research/lib-0.1.19-to-0.1.43-audit.md` §6.2 (`modifyButtonRes` not bridged → D-06).
- `.planning/research/lib-0.1.19-to-0.1.43-audit.md` §6.3 (no new page-bounds query → D-07).
- `.planning/research/lib-0.1.19-to-0.1.43-audit.md` §5 N-01/N-03/N-04 + §6.4 + §8.4/§8.5/§8.6 (needs-eval candidates → D-08/D-09/D-10).
- `.planning/research/lib-0.1.19-to-0.1.43-audit.md` §8.2 (AsyncStorage runtime probe test plan → dropped per D-03).
- `.planning/phases/01-api-diff-audit/01-VERIFICATION.md` — confirmation Phase 1 cleared its success criteria; the audit is the dispositive evidence Phase 3 cites.

### Phase 2 deliverable (Phase 3 builds on the green-CI state of the upgraded lib)
- `.planning/phases/02-compatibility-upgrade/02-01-SUMMARY.md` — sn-plugin-lib at ^0.1.43 on dev with 87/87 tests passing. Phase 3 starts here.
- `.planning/phases/02-compatibility-upgrade/02-VERIFICATION.md` — Phase 2 verifier's PASS 15/15.

### Project conventions
- `CLAUDE.md` §"Commands" + §"Conventions" + §"Branch / PR workflow" — locked tech-stack invariants and the 5 CI gates Phase 3 must keep green after the dead-code removal.
- `.claude/skills/git/SKILL.md` — `<type>/<user>/<short-desc>` branch naming, target `dev` not `main`, "Run CI checks locally before opening PR" rule.

### Codebase brownfield maps
- `.planning/codebase/STACK.md` §"Runtime" (in-memory only out of the box — paragraph stays accurate after Phase 3) + §"Key Dependencies" (no Key Dependencies edit needed).
- `.planning/codebase/INTEGRATIONS.md` §"Supernote Firmware SDK (`sn-plugin-lib`)" — confirms Phase 3 doesn't touch any SDK call site beyond the dead-code removal in storage.

### Source files Phase 3 edits or depends on
- `src/storage/anchorStorage.ts` — Phase 3 removes `KvBackend` (lines ~55-59) and `createKvBackedAnchorStorage` (lines ~111-129). Re-read the file before editing because line numbers may have drifted.
- `__tests__/anchorStorage.test.ts` — Phase 3 removes the `createKvBackedAnchorStorage` describe block (lines 76-167 region). Re-read before editing because Phase 2's lockfile refresh changed test runtime but not test counts.
- `src/buttons/buttonCommon.ts` — Phase 3 does NOT edit (`modifyButtonRes?` optional stub stays per D-06). Cited for read-only context.
- `src/sdk/pageSize.ts` — Phase 3 does NOT edit (`resolvePageSize` 3-step query stays per D-07). Cited for read-only context.
- `src/handlers/onLassoMain.ts` — Phase 3 does NOT edit (`resizeLassoRect` call at line 181 stays per D-08; `lassoElements` would regress, not simplify).

### sn-plugin-lib source evidence (cited inline in D-08)
- `node_modules/sn-plugin-lib/src/sdk/PluginCommAPI.ts:389-440` — TS pass-through implementations of `resizeLassoRect` and `lassoElements`; identical structure, both delegate to native bridge.
- `node_modules/sn-plugin-lib/android/src/main/java/com/ratta/supernote/pluginlib/modules/CommAPIModule.java:721-789` — native bridges with Chinese JSDoc that distinguishes the two operations: `调整套索框区域大小` (resize / move-via-bbox-change) vs `套索元素` (lasso the elements at this rect).
- `node_modules/sn-plugin-lib/android/src/main/java/com/ratta/supernote/pluginlib/api/HostCommonAPI.java:75-88` — abstract host-API declarations; implementations live in closed-source Supernote firmware.

### Shared skill (Phase 4 territory; Phase 3 read-only)
- `~/.claude/skills/sn-plugin/references/storage.md` — currently documents the `KvBackend` pattern as a "future-ready" recipe. Phase 4 `SKILL-03` will need to update this reference to remove the SnAlign-side example after D-04's removal. Phase 3 does NOT edit this file.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`createMemoryAnchorStorage`** in `src/storage/anchorStorage.ts:131-139` — the load-bearing implementation that stays. Default constructor used by `getDefaultAnchorStorage` (lines 143-148) which is the single entry point wired up in `index.js`.
- **`AnchorEnvelope` v3 schema + `parseEnvelope` / `serialiseEnvelope`** (lines 35-93) — schema versioning unaffected by the removal. The version-bump mechanism + reset-to-default on mismatch (PROJECT.md Key Decisions row "In-memory storage with reset-on-schema-mismatch") remains the future-migration story.
- **Phase 2 green-CI state** — 87/87 jest pass on the new lib; Phase 3 expects ~77 after the test removal. CI must stay green after the removal.

### Established Patterns
- **Dependency injection at the edge** — `index.js` wires `getDefaultAnchorStorage()` into `lassoDeps.storage`. The removal of `createKvBackedAnchorStorage` doesn't change this seam; `getDefaultAnchorStorage` returns the memory storage directly.
- **`__resetDefaultAnchorStorageForTest`** (line 150) — test-only escape hatch for resetting the cached singleton between tests. Stays.
- **Two-commit phase shape** (Phase 2 D-10 precedent) — refactor commit + docs commit, in that order, on a single PR branch.

### Integration Points
- **`index.js` ↔ `getDefaultAnchorStorage`** — the only consumer of `anchorStorage.ts`'s public surface that matters after the removal. Cross-check that `index.js` doesn't import `createKvBackedAnchorStorage` directly (it doesn't — the brownfield map and PROJECT.md confirm the only consumer is `getDefaultAnchorStorage`).
- **`ANCHOR_STORAGE_KEY` export** (line 28) — was used by `createKvBackedAnchorStorage` as the namespaced key. After the removal it becomes another candidate for YAGNI cleanup, but it's still exported and could matter for future re-introduction. Leave the executor to decide whether to drop it in the same commit; if not, leave it and note as a follow-up.

</code_context>

<specifics>
## Specific Ideas

- The audit's "needs-eval" tag on `lassoElements` was conservative; the user pushed back on whether it could actually replace `resizeLassoRect` given that SnAlign uses the "resize" as a translate-by-bbox-change trick. The on-the-fly source inspection of `CommAPIModule.java` confirmed the user's intuition and let us reclassify N-01 to paper-decline (D-08). This is a documented pattern: when an audit's "needs-eval" item has a static-evidence story that points one way, surface the evidence in discussion rather than blindly defer to sideload.
- The user explicitly chose YAGNI for `KvBackend` removal (D-04) and YAGNI for needs-eval declines (D-09, D-10). Strong "trust the audit, ship the decline, don't carry stubs whose triggers are uncertain" stance.
- The user explicitly chose to drop Phase 4's audit §8.2 runtime check (D-03). This is a stronger position than just "trust paper" — it says "the long-term release-watching reopener is the right trigger, not a one-time runtime probe".

</specifics>

<deferred>
## Deferred Ideas

- **N-04 `showPluginView` re-evaluation if "Apply without closing" UX surfaces.** Tied to a future UX decision; not in scope of this milestone.
- **N-03 `generateLassoPreview` re-evaluation if lasso-content thumbnail demand surfaces.** Tied to user feedback signal not yet present.
- **`ANCHOR_STORAGE_KEY` cleanup** — after `createKvBackedAnchorStorage` is removed, the namespaced key is also unused. Executor may drop it in the same refactor commit if straightforward; otherwise capture as a follow-up cleanup item.
- **Inline comment on `modifyButtonRes?` stub** in `src/buttons/buttonCommon.ts` pointing to D-06 + audit §6.2. Cosmetic; low priority; left to executor discretion.
- **ADOPT-01 reopener path** (D-02): when a future sn-plugin-lib release adds a KV API, re-introduce the `KvBackend` interface as a thin adapter and wire via `createKvBackedAnchorStorage(backend)` in `index.js`. Document the re-introduction as a new milestone, not a Phase 3 retrospective edit.

</deferred>

---

*Phase: 3-Adopt High-Value Wins*
*Context gathered: 2026-05-17*
