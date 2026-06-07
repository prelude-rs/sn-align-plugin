# Phase 3: Adopt High-Value Wins - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-17
**Phase:** 03-Adopt High-Value Wins
**Areas discussed:** ADOPT-01 — storage path, ADOPT-02 — spike timing, ADOPT-02 — which to spike, Decision-record shape

---

## ADOPT-01 — Storage Path

### Q1: Phase 1's audit §6.1 confirms 0.1.43 doesn't bundle AsyncStorage and adds no KV API. What's the disposition for ADOPT-01?

| Option | Description | Selected |
|--------|-------------|----------|
| Decline — paper evidence dispositive | No code change. Mark ADOPT-01 'deferred — confirmed by audit §6.1'. Phase 4's §8.2 sideload test still runs as final runtime check; if firmware DOES inject AsyncStorage, that's a follow-up trigger. | ✓ |
| Defensive runtime-detect in index.js | Add a ~5-line try/require in index.js. If `@react-native-async-storage/async-storage` resolves, wire `createKvBackedAnchorStorage(AsyncStorage)`; else fall back to memory. | |
| Bundle AsyncStorage via node_change/ | Use the `node_change/` escape hatch to bundle AsyncStorage into the .snplg. Pays bundle-size cost (~20-50 KB) up front; gives unconditional persistence. | |

**User's choice:** Decline — paper evidence dispositive
**Notes:** Strong "trust the audit, move on" signal at the outset. Drives D-01.

### Q2: Given the decline, what's the trigger that would reopen ADOPT-01 in a future milestone?

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 4 sideload reveals AsyncStorage IS injected | If `try { require(...) } catch` in §8.2 resolves on A5X2, ADOPT-01 reopens as fast-track adoption. | |
| Any future sn-plugin-lib release adds a KV API | Watch sn-plugin-lib changelogs across future patch/minor/major releases for any KV-shaped public method. Re-runs Phase 1's audit shape on each upgrade. | ✓ |
| User demand — someone files an issue | Treat persistence as a yagni until a user actually complains about losing anchor on reinstall. | |

**User's choice:** Any future sn-plugin-lib release adds a KV API
**Notes:** Drives D-02. Long-term release-watching is the right trigger, not undocumented firmware injection.

### Q3: Phase 4's audit §8.2 test plan still calls for a one-time on-device runtime check. Does that check stay in Phase 4 or get dropped?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep — one-time check is cheap insurance | Runs once during Phase 4 sideload. 2-3 lines of code, 30 seconds of sideload time. If it surprises us, that's a fast-track win regardless of the long-term reopener. | |
| Drop — long-term reopener is the trigger | Skip the runtime probe; rely on watching sn-plugin-lib releases. Matches the 'paper evidence dispositive' framing of the previous answer. | ✓ |

**User's choice:** Drop — long-term reopener is the trigger
**Notes:** Drives D-03. Stronger "trust the audit" position — paper-evidence-trumps-runtime-check. Phase 4 planner needs to know §8.2 is removed from scope.

### Q4: ADOPT-01 declines = no code edit to src/storage/anchorStorage.ts. But: should the currently-unused `createKvBackedAnchorStorage` + `KvBackend` interface stay (future-ready), or get removed as dead code?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep — future-ready stub | The KvBackend interface mirrors AsyncStorage's shape exactly. If/when a future sn-plugin-lib release adds a KV API, the adoption path is: wire the new API as a KvBackend, call createKvBackedAnchorStorage(backend) in index.js. | |
| Remove as dead code (YAGNI) | Right now the function and interface are unused. Removes ~40 lines from anchorStorage.ts. Strict YAGNI: don't keep code 'for the future', re-add it when you actually need it. | ✓ |

**User's choice:** Remove as dead code (YAGNI)
**Notes:** Drives D-04. Strong YAGNI stance; converts ADOPT-01 from pure decline into decline + cleanup.

### Q5: Removing `createKvBackedAnchorStorage` deletes the 10 tests in __tests__/anchorStorage.test.ts. Test count drops from 87 → ~77. OK with the drop?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — dead-code tests go with dead code | Removing the implementation makes the tests vestigial. Drop them in the same commit. Phase 4's sideload verification cares about behavior, not test count. | ✓ |
| Keep tests as future scaffolding | Move them to a `.skip` block or extract to a separate `dead-code.test.ts`. Keeps the 87 count but tests against deleted code can't actually validate anything. | |
| Reconsider — keep both impl and tests | Revert the previous answer's decision to remove createKvBackedAnchorStorage. | |

**User's choice:** Yes — dead-code tests go with dead code
**Notes:** Drives D-05. Phase 3 SUMMARY.md must explicitly call out the 87 → ~77 count change.

---

## ADOPT-02 — Spike Timing

### Q1: Where does the needs-eval verification happen for the 3 net-new APIs (lassoElements, generateLassoPreview, showPluginView)?

| Option | Description | Selected |
|--------|-------------|----------|
| Defer ALL needs-eval to Phase 4 | Phase 3 = pure paper-decision phase. Paper-decline items close cleanly. Needs-eval items get 'deferred to Phase 4 sideload spike per audit §8.4-8.6'. | ✓ |
| Spike in Phase 3 — add a sideload sub-task | Bend the Phase 3/4 boundary slightly: Phase 3 includes one on-device spike task. | |
| Decline ALL sight-unseen — needs-eval = defer-permanently | Treat 'needs-eval' as a permanent decline signal in the absence of dispositive on-device evidence. | |

**User's choice:** Defer ALL needs-eval to Phase 4
**Notes:** Initial answer — later superseded by D-08/D-09/D-10/D-11 when the spike candidates were narrowed and ultimately all declined sight-unseen. The reversal is documented in D-11.

### Q2: For the paper-decline ADOPT-02 items (modifyButtonRes, page-bounds query): what gets documented as the verdict?

| Option | Description | Selected |
|--------|-------------|----------|
| Both 'declined — paper-dispositive' with audit citations | modifyButtonRes: declined — audit §6.2; existing optional stub stays untouched. page-bounds: declined — audit §6.3; existing 3-step resolvePageSize stays. No code changes for either. | ✓ |
| modifyButtonRes — also remove the optional stub | Like ADOPT-01's KvBackend cleanup: PluginManagerLike.modifyButtonRes? is never called. YAGNI-trim it. | |
| Just declare in CONTEXT.md, no decision-record cleanup | Lightest touch: log verdicts in CONTEXT.md + SUMMARY.md only. | |

**User's choice:** Both 'declined — paper-dispositive' with audit citations
**Notes:** Drives D-06 (modifyButtonRes) and D-07 (page-bounds). The optional `modifyButtonRes?` stub is typed differently than `createKvBackedAnchorStorage` (`?:` optional vs unused export) and carries zero runtime cost — kept.

### Q3: The 3 needs-eval candidates get deferred to Phase 4. Does Phase 4's existing plan-shape absorb them, or do we need to expand Phase 4 scope explicitly now?

| Option | Description | Selected |
|--------|-------------|----------|
| Expand Phase 4 scope now — add a 'needs-eval spike' task | Phase 4 currently scopes UPGRADE-04 + SKILL-01..05. Document the expansion in Phase 3 CONTEXT.md as a decision so Phase 4's planner picks it up. | ✓ (then superseded) |
| Leave as 'future milestone' — not Phase 4's job | Phase 4 stays narrow. The 3 needs-eval items become a separate ADOPT-EVAL backlog item. | |
| Adoption decision = 'defer indefinitely' regardless of Phase 4 | Treat needs-eval as verdict-record event in Phase 3. | |

**User's choice:** Expand Phase 4 scope now — add a 'needs-eval spike' task
**Notes:** Selected at the time, but reversed by D-11 after the subsequent "decline all three sight-unseen" choice. The CONTEXT.md captures the reconciled outcome (Phase 4 stays tight).

---

## ADOPT-02 — Which to Spike

### Q1 (reformulated after user requested clarification): Should N-01 lassoElements stay on the spike list, or get reclassified to paper-decline?

Context provided to the user before re-asking: TS pass-through in `PluginCommAPI.ts:389-440` + Chinese JSDoc on Java side (`调整套索框区域大小` for resizeLassoRect = "adjust lasso box region size"; `套索元素` for lassoElements = "lasso the elements at this rect"). SnAlign uses resizeLassoRect to TRANSLATE the selected elements via bbox change. Swapping to lassoElements would drop the original selection and pick up whatever's at the destination rect — regression, not simplification.

| Option | Description | Selected |
|--------|-------------|----------|
| A: Drop N-01 from spike list, treat as paper-decline | The Chinese JSDoc + naming + the existence of resizeLassoRect for the move case make this paper-dispositive. Reclassify N-01 alongside modifyButtonRes and page-bounds. | ✓ |
| B: Keep N-01 as a spike anyway | In case the firmware surprises us. | |
| C: Different framing — combination spike | Spike `lassoElements` after `resizeLassoRect` to re-select moved elements for chained Apply & Re-anchor. | |

**User's choice:** A — Drop N-01, reclassify to paper-decline
**Notes:** Drives D-08. The original audit conservatively tagged N-01 as needs-eval; the deeper source inspection during this discussion let us promote it to paper-decline based on the Chinese JSDoc verb-distinction.

### Q2: With N-01 dropped, which of N-03 / N-04 should land on Phase 4's plan?

| Option | Description | Selected |
|--------|-------------|----------|
| N-03 generateLassoPreview — E-Ink latency spike | UX-additive: thumbnail in popup. Audit §8.5 gate: latency < 200 ms = adoptable; > 500 ms = defer. Doesn't shrink LOC. | |
| N-04 showPluginView — popup re-mount spike | Enables 'Apply without closing' UX. Audit §8.6 gate: popup re-renders without fresh button press. Pre-req: user actually wants that UX. | |
| Neither — decline both sight-unseen too | If neither earns a guaranteed adoption story even on positive spike results, the spikes themselves aren't worth the cost. Phase 4 stays tight. | ✓ |

**User's choice:** Neither — decline both sight-unseen
**Notes:** Drives D-09 (N-03 decline), D-10 (N-04 decline), and D-11 (Phase 4 scope stays tight). This answer SUPERSEDES the earlier "Expand Phase 4 scope now" choice from ADOPT-02 — Spike Timing Q3.

---

## Decision-Record Shape

### Q1: Where does the decision record primarily live?

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 3 CONTEXT.md + SUMMARY.md + REQUIREMENTS.md status | Decisions in 03-CONTEXT.md (D-NN with audit citations), full record in 03-01-SUMMARY.md, REQUIREMENTS.md ADOPT-01/02 flipped to `[x]`, PROJECT.md Key Decisions gets one row per outcome. No new .planning/research/ doc. | ✓ |
| Same as above + dedicated .planning/research/ADOPT-decisions.md | Adds a single decision-record doc that cross-references every candidate → verdict → audit citation → reopener. | |
| Lightweight — just CONTEXT.md + commit messages | Skip REQUIREMENTS.md status flips and PROJECT.md rows. | |

**User's choice:** Phase 3 CONTEXT.md + SUMMARY.md + REQUIREMENTS.md status
**Notes:** Drives D-12. Audit is already the source-of-truth; three-way cross-referencing it (CONTEXT + SUMMARY + REQUIREMENTS) is sufficient.

### Q2: REQUIREMENTS.md ADOPT-01 / ADOPT-02 status flip — what exact shape?

| Option | Description | Selected |
|--------|-------------|----------|
| Mark `[x]` with verdict note | Each requirement keeps its `[ ]`/`[x]` style. `[x]` = "verdict reached", not narrowly "code adopted". Mirrors Phase 1 / Phase 2 closure style. | ✓ |
| Keep `[ ]` and move both to Out of Scope table | Since the condition wasn't met, the requirement effectively becomes Out of Scope for v1. | |
| Custom status `[~]` Declined | Introduce a third checkbox state for 'evaluated and declined'. | |

**User's choice:** Mark `[x]` with verdict note
**Notes:** Drives D-13. Two-state convention preserved.

### Q3: Phase 3 plan-shape — single plan or split?

| Option | Description | Selected |
|--------|-------------|----------|
| Single plan 03-01 | All Phase 3 work fits one plan with two atomic commits (refactor + docs). | ✓ |
| Two plans 03-01 (code) + 03-02 (docs) | Cleaner separation; doubles overhead. | |
| Decision-only phase — zero code change, all docs | Move KvBackend removal out of Phase 3 entirely. | |

**User's choice:** Single plan 03-01
**Notes:** Drives D-17. Matches Phase 2's commit-graph shape (D-10 precedent).

---

## Claude's Discretion

- Exact wording of the two PROJECT.md Key Decisions rows (recorded in D-14, free-form details).
- Exact phrasing of the REQUIREMENTS.md verdict notes (D-13 requires audit-section citation + reopener trigger, free-form details).
- Exact phrasing of the Phase 4 planner-handoff note in 03-01-SUMMARY.md regarding §8.2/§8.4/§8.5/§8.6 removals (D-11).
- PR title/body wording (follow Phase 2 precedent).
- Whether the `modifyButtonRes?` optional stub in `src/buttons/buttonCommon.ts` warrants an inline comment pointing to D-06.

## Deferred Ideas

- N-04 `showPluginView` re-evaluation if "Apply without closing" UX surfaces.
- N-03 `generateLassoPreview` re-evaluation if lasso-content thumbnail demand surfaces.
- `ANCHOR_STORAGE_KEY` cleanup — after KvBackend is removed, the namespaced key may also be unused. Executor discretion at plan time.
- Inline comment on `modifyButtonRes?` stub pointing to D-06 + audit §6.2 (cosmetic).
- ADOPT-01 reopener path: when a future sn-plugin-lib release adds a KV API, re-introduce `KvBackend` interface + `createKvBackedAnchorStorage` as new milestone work.
