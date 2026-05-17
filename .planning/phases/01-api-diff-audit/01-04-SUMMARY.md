---
phase: 01-api-diff-audit
plan: 04
status: complete
date: 2026-05-17
---

# Plan 01-04 Summary — Four Targeted Answers (§6)

## Outcome

§6 of `.planning/research/lib-0.1.19-to-0.1.43-audit.md` populated with the four ADOPT-01 / ADOPT-02 input answers. Each subsection (§6.1, §6.2, §6.3, §6.4) carries multiple `node_modules/sn-plugin-lib/` citations and passes the per-subsection citation gate.

## Headline verdicts (one line each)

| Question | Verdict | SnAlign action |
|----------|---------|----------------|
| **§6.1 AsyncStorage bundled / new KV API?** | **No** — not bundled, no new KV surface | In-memory storage remains; ADOPT-01 stays deferred |
| **§6.2 modifyButtonRes works?** | **Still unreliable** — type declared on Native bridge only; public wrapper does NOT bridge it through | Skip in Phase 2; existing SnAlign stub stays optional/unused |
| **§6.3 Built-in page-bounds query?** | **No** — same 3-step `getCurrentFilePath` + `getCurrentPageNum` + `getPageSize` resolution | Keep current `resolvePageSize` + 1920×2560 fallback |
| **§6.4 New lasso/page APIs?** | **3 new candidates** (`lassoElements`, `generateLassoPreview`, `showPluginView`) | All `needs-eval` — defer to Phase 3 spike before adoption |

## Claims deferred to Phase 4 sideload (feeds §8 Unknowns in Plan 05)

1. **AsyncStorage runtime presence on A5X2** — the audit can only see what the tarball ships; the host firmware could in principle inject AsyncStorage at runtime. Diagnostic for Phase 4: `try { require('@react-native-async-storage/async-storage') } catch` on device.
2. **modifyButtonRes on-device reliability** — public TS wrapper doesn't bridge it; calling `NativePluginManager.modifyButtonRes(...)` directly might work on A5X2, might silently no-op. Existing skill gotcha #2 needs a nuance update (the issue is the public wrapper, not just firmware).
3. **N-01 `lassoElements(rect)` runtime behavior** — does element selection survive? Undo behavior?
4. **N-03 `generateLassoPreview(imagePath)` latency** — disk I/O cost on E-Ink before popup renders.
5. **N-04 `showPluginView()` behavior** — does it properly re-show without race conditions?

## Skill callouts for Phase 4 (SKILL-01..05 scope — NOT edited in Phase 1)

These are observations Plan 05 will list in §7 as "needs Phase 4 sideload-verify":

- **api-gotchas.md gotcha #2 (modifyButtonRes)** — refinement: the issue isn't just "firmware doesn't expose it"; the public `PluginManager` TS wrapper doesn't bridge it through. Direct `NativePluginManager.modifyButtonRes(...)` calls might work on A5X2. Mark "needs Phase 4 sideload-verify".
- **storage.md (AsyncStorage bundling)** — refinement: confirm via static analysis that no peer/dep ships AsyncStorage, AND the Android bridge has no AsyncStorage `@ReactMethod`. Phase 4 sideload should run the `require()` probe to confirm runtime absence. Mark "still valid in 0.1.43".
- **No new skill gotcha needed** for page-bounds — the 3-step resolver remains the right approach; no change to existing skill text.

## Net-new methods relevant to lasso/page (for Plan 05's Unknowns + Phase 3 follow-up)

Phase 3 should spike, in order:

1. `lassoElements(rect)` — simplifies Apply if it works.
2. `generateLassoPreview(imagePath)` — UX win if latency acceptable.
3. `showPluginView()` — UX optimization, tied to a UX decision.

## Acceptance gates (all passed)

- `AsyncStorage` literal appears in audit (6 hits) ✓
- `modifyButtonRes` literal appears in audit (8 hits) ✓
- §6.1, §6.2, §6.3, §6.4 each appear exactly once ✓
- Per-subsection citation gate passes — every §6.X has ≥ 1 `node_modules/sn-plugin-lib/` citation (5/4/3/12 hits respectively) ✓
- §6.2 contains literal "deferred to Phase 4" (1 hit) ✓
- Stub line removed ✓
- Commit landed: `2fcbab2 docs(01): audit doc §6 — four targeted answers` ✓

## Downstream consumers

- **Plan 05 (§8 Unknowns):** numbered list must include the 5 items in "Claims deferred to Phase 4 sideload" above.
- **Plan 05 (§7 skill cross-ref):** the 2 skill callouts above are concrete cross-reference entries.
- **Phase 3 (later):** the 3 `needs-eval` candidates from §6.4 are the spike targets for ADOPT-02.
