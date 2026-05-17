# Phase 1: API Diff Audit - Context

**Gathered:** 2026-05-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Produce a written audit of every breaking, behavioral, and net-new API between `sn-plugin-lib@0.1.19` and `sn-plugin-lib@0.1.43` — the load-bearing artifact that drives Phase 2 (Compatibility Upgrade), Phase 3 (Adopt High-Value Wins), and Phase 4 (Sideload Verify + Skill Propagation).

**In scope:** Audit doc + raw evidence artifacts. No `package.json` bump on `dev`/`main` (the bump happens in a throwaway scratch branch and is reverted). No code changes outside `.planning/` and the throwaway scratch.

**Out of scope:** Actually upgrading the project (Phase 2). Adopting new capabilities (Phase 3). Updating the `sn-plugin` skill files (Phase 4). On-device verification (Phase 4 sideload).

</domain>

<decisions>
## Implementation Decisions

### Audit Methodology
- **D-01:** Primary diff approach is **ghost-upgrade**. Create a scratch branch, bump `package.json` to `sn-plugin-lib@^0.1.43`, run `npx tsc --noEmit` + `npx jest`. The compiler + test failures form the primary signal — they tell us exactly which SnAlign call sites break and how.
- **D-02:** Augment ghost-upgrade with a **`.d.ts` machine diff** for coverage on APIs we don't currently call. Install `0.1.19` and `0.1.43` into two scratch dirs and `diff -r` their `lib/typescript/src/**/*.d.ts` trees.
- **D-03:** **Authority order when sources disagree: source > types > docs.** Treat `node_modules/sn-plugin-lib/src/**/*.ts` as ground truth (it's what runs on device). Treat `.d.ts` as ergonomics signals (return-type shape). Treat https://docs.supernote.com/en as a hint, not authority — known to lag. The audit explicitly notes disagreements.
- **D-04:** **Strict 0.1.19 baseline.** Lock the baseline scratch install to `sn-plugin-lib@0.1.19` exactly (not the `^0.1.19`-resolved 0.1.34 we've been running against in CI). Matches UPGRADE-05 wording; the 0.1.34 → 0.1.43 sub-diff falls out for free as a sanity check.
- **D-05:** Evidence artifacts preserved alongside the audit:
  - `.planning/research/lib-0.1.19-to-0.1.43-audit.md` — the consumable artifact (read by Phase 2/3/4)
  - `.planning/research/lib-0.1.19-to-0.1.43-dts.diff` — raw machine `.d.ts` diff
  - `.planning/research/lib-0.1.43-ghost-tsc.log` — ghost-upgrade `tsc --noEmit` output
  - `.planning/research/lib-0.1.43-ghost-jest.log` — ghost-upgrade `jest` output

### Net-new API Scope
- **D-06:** Scope = **call sites + 4 targeted answers + adjacent-domain net-new APIs.**
  - Mandatory: each SnAlign call site checked against new types (`PluginManager.{init, registerButton, registerButtonListener, getPluginDirPath, closePluginView}`, `PluginCommAPI.{getLassoRect, resizeLassoRect, setLassoBoxState, getCurrentFilePath, getCurrentPageNum}`, `PluginFileAPI.getPageSize`).
  - Mandatory: the 4 ROADMAP-targeted questions answered (AsyncStorage / `modifyButtonRes` / page-bounds query / new lasso-page APIs).
  - Plus: enumerate net-new exports in domains we already touch (`PluginManager`, `PluginCommAPI`, `PluginFileAPI`).
  - Skip: net-new APIs in unrelated domains (handwriting recognition, layers, custom drawing) — one-line "present, not surveyed" note.
- **D-07:** **AsyncStorage answer = static check only.** Grep `sn-plugin-lib`'s native side (`android/`, `*.podspec`, `src/`) for AsyncStorage bundling signals; survey types for new KV methods on `PluginManager` / `NativePluginManager` / `PluginFileAPI`. On-device runtime proof is deferred to Phase 3/4 sideload — the audit's role is to give Phase 3 a paper-grounded go/no-go.
- **D-08:** **`modifyButtonRes` answer = type + source check; on-device behavior deferred to Phase 4 sideload.** Audit answers: type signature still declared? source still implements it? any commit/comment about reliability? Flag "paper says present, on-device reliability deferred to Phase 4". Tagged for Phase 4's SKILL-01 gotcha audit.
- **D-09:** **Cross-reference the `sn-plugin` skill gotchas.** While walking the API surface, mark each existing gotcha at `~/.claude/skills/sn-plugin/SKILL.md` and `~/.claude/skills/sn-plugin/references/api-gotchas.md` as one of: `still valid in 0.1.43` / `resolved by 0.1.43` / `needs Phase 4 sideload-verify`. **Phase 1 does NOT edit skill files** — it produces the source-of-truth checklist Phase 4 consumes for SKILL-01..05.

### Breaking Classification Rubric
- **D-10:** **Three buckets with strict definitions, exactly one bucket per change:**
  - **Breaking** = compilation fails OR runtime contract changed in a way that breaks an existing SnAlign call site.
  - **Behavioral** = same signature, different on-wire behavior (e.g., `setLassoBoxState(2)` auto-commit semantics shifting).
  - **Net-new** = additions only (new method, new type, new module).
- **D-11:** **Strict-TS-failures count as Breaking.** If 0.1.43 types compile cleanly under stock TS but fail under our `tsconfig.json` (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `strict`), the entry is Breaking. Audit calls out the exact flag that flags it.
- **D-12:** **Removed/Deprecated APIs are documented even when SnAlign doesn't use them**, with `SnAlign-impact = None - not currently called`. No Phase 2 action item generated, but the audit stays complete for Phase 4's skill update.
- **D-13:** **Every Breaking and Behavioral entry gets a `Phase 2 action:` line** naming a file + line + concrete change (e.g., "update `src/handlers/onLassoMain.ts:60` to handle `Rect | null` return"). **Every Net-new entry gets a `Phase 3 candidate:` flag** (`yes` / `no` / `needs-eval`).

### Audit Verification Step
- **D-14:** **"Done" bar = audit doc + ghost-tsc + ghost-jest evidence.** Phase 1 is complete when (a) the audit doc exists, (b) the ghost-upgrade `tsc --noEmit` and `jest` outputs are committed as appendix files, (c) every Breaking entry traces to a tsc error or test failure OR is explicitly tagged `paper-only` for behavioral changes types don't surface.
- **D-15:** **Delete the ghost-upgrade scratch branch after audit lands on dev.** Evidence files are reproducible from any `0.1.43` install. Keeps the branch list clean. Phase 2 starts from a fresh branch off `dev`.
- **D-16:** **Audit ends with an explicit "Unknowns / Paper-only claims" section.** Numbered list of claims that can't be verified without sideload (e.g., "`modifyButtonRes` reliability on A5X2 firmware", "AsyncStorage runtime presence", "`setLassoBoxState(2)` commit semantics unchanged"). Phase 4 sideload consumes this list as its test plan.
- **D-17:** **Audit stands alone as the Phase 2/3/4 contract.** Phase 1's `gsd-verifier` confirms the audit covers ROADMAP Phase 1 success criteria #1–#4 — it does NOT cross-validate the `Phase 2 action:` lines. Phase 2's `gsd-plan-phase` consumes the audit during its own research and produces the action plan.

### Claude's Discretion
- Document structure / heading hierarchy / table column ordering — open to standard markdown table conventions, no specific layout requested.
- Citation density — every claim gets a source citation (file path + line for source/types, URL for docs); free to pick concise notation.
- Whether the audit uses git refs (`vX.Y.Z` tags or commit SHAs) to cite specific changes — `sn-plugin-lib` has no real public repo (`repository.url = git+http://null.git`), so citations are to the npm tarball paths only.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/ROADMAP.md` §"Phase 1: API Diff Audit" — Phase goal, dependencies, requirements, success criteria (the 4 must-be-true items).
- `.planning/REQUIREMENTS.md` §"UPGRADE-05" — Defines the audit as the load-bearing artifact for the milestone.
- `.planning/PROJECT.md` §"Active" + §"Key Decisions" — Why we're upgrading at all; the "Adopt high-value wins" and "Code-ready milestone (no v0.4.0 tag)" decisions that frame Phase 2/3/4 behavior.

### Codebase brownfield maps
- `.planning/codebase/INTEGRATIONS.md` §"Supernote Firmware SDK (`sn-plugin-lib`)" — Authoritative inventory of every SnAlign call site against the SDK (method, file, line, purpose). Audit's call-site sweep uses this as the checklist.
- `.planning/codebase/STACK.md` §"Frameworks" + §"Key Dependencies" — Locked versions (React 19.0.0, RN 0.79.2, sn-plugin-lib ^0.1.19), strict TS flags, "no AsyncStorage / no MMKV / no SQLite" baseline that Phase 1 documents whether 0.1.43 changes.

### External SDK sources (audit must cite these)
- `node_modules/sn-plugin-lib/src/**/*.ts` — Package source. **Primary authority** per D-03.
- `node_modules/sn-plugin-lib/lib/typescript/src/**/*.d.ts` — Package types. Secondary authority.
- `node_modules/sn-plugin-lib/package.json` — Confirms resolved 0.1.34 in current install; no real repo URL; no CHANGELOG ships with the tarball.
- https://docs.supernote.com/en — External docs. Tertiary authority (known to lag).

### Skill propagation (Phase 4 consumes Phase 1's cross-reference)
- `~/.claude/skills/sn-plugin/SKILL.md` — Gotchas list to cross-reference per D-09. Audit marks each gotcha `still valid in 0.1.43` / `resolved` / `needs Phase 4 sideload-verify`.
- `~/.claude/skills/sn-plugin/references/api-gotchas.md` — Detailed API gotcha list; same cross-reference treatment.
- `~/.claude/skills/sn-plugin/references/storage.md` — Storage gotcha doc; especially the AsyncStorage bundling claim. Audit's AsyncStorage answer (D-07) feeds the Phase 4 update here.

### Audit deliverables (Phase 1 creates these)
- `.planning/research/lib-0.1.19-to-0.1.43-audit.md` — Primary consumable artifact.
- `.planning/research/lib-0.1.19-to-0.1.43-dts.diff` — Raw `.d.ts` machine diff appendix.
- `.planning/research/lib-0.1.43-ghost-tsc.log` — Ghost-upgrade `tsc --noEmit` output.
- `.planning/research/lib-0.1.43-ghost-jest.log` — Ghost-upgrade `jest` output.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Dependency-injection seams** (`LassoCommAPILike`, `PageSizeFileAPI`, `PageSizeCommAPI`, `PluginManagerLike` in `src/handlers/onLassoMain.ts`, `src/sdk/pageSize.ts`, `src/buttons/buttonCommon.ts`): structural type stubs that already insulate SnAlign from `sn-plugin-lib`'s concrete classes. The audit's "would this break us?" question reduces to "does any of these structural types stop matching the new lib types?" — a small, well-bounded check.
- **`APIResponse<T>` envelope** (`src/sdk/types.ts`): every firmware call site flows through this shape. If 0.1.43 changes the envelope shape (e.g., new `code` field, different `error` structure), the breaking diff is localized to this one file.
- **`__tests__/` (87 tests across 7 suites)**: pure-logic tests that mock the SDK via the injection seams. Ghost-upgrade can run them against the new lib — pass/fail is direct evidence the audit can cite.

### Established Patterns
- **`safe*` wrappers swallow throws** (`safeClosePluginView`, `safeSetButtonState`, `safeSetLassoBoxState`): if 0.1.43 changes which methods can throw, the safety net is in place — Breaking-vs-Behavioral classification stays meaningful instead of devolving to "everything is now optional".
- **Logger routes through `console.log` only**: any 0.1.43 change to firmware logcat behavior is invisible to the audit unless explicitly checked. Flag in Unknowns if relevant.
- **Strict TS (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)** raises the bar for what counts as Breaking — per D-11, types that pass stock-strict but fail our flags are still Breaking.

### Integration Points
- **Two imports of `sn-plugin-lib`**: `index.js:8` (`PluginCommAPI`, `PluginFileAPI`, `PluginManager`) and `src/ui/PopupRoot.tsx:3` (`PluginManager` only, for emergency `closePluginView`). All other code reaches firmware via injected `Deps`. Audit's surface scan starts at these two files plus the `*Like` type definitions.
- **`index.js` is the wiring layer**: any change to method names, parameter order, or class shape lands here first. Audit must explicitly check `index.js:16-39` (init + lassoDeps construction) for breakage.

</code_context>

<specifics>
## Specific Ideas

- User explicitly raised that `package.json` declares `^0.1.19` but the lockfile resolved `0.1.34` (D-04 acknowledges this) — the strict-0.1.19 baseline is a deliberate audit-fidelity choice, not an oversight.
- The `sn-plugin-lib` tarball has no public repo (`repository.url = git+http://null.git`), no CHANGELOG, and a stub README. The audit cannot cite git refs; only npm tarball paths.
- The audit's role vis-à-vis the `sn-plugin` skill (D-09): Phase 1 produces the cross-reference checklist; Phase 4 actually edits skill files. This split avoids dual-purpose Phase 1 work but commits us to Phase 4 reading the audit closely.

</specifics>

<deferred>
## Deferred Ideas

- **Empirical AsyncStorage verification in the ghost branch** — considered (option to actually `import AsyncStorage from '@react-native-async-storage/async-storage'` in the scratch and confirm it builds + would run). Deferred to Phase 3/4 sideload per D-07 to keep Phase 1 as paper analysis.
- **Empirical `modifyButtonRes` call in the ghost branch** — considered. Deferred to Phase 4 sideload per D-08.
- **Promoting the ghost-upgrade scratch to Phase 2's starting branch** — considered (option to rename scratch → Phase 2 branch). Rejected to keep phase boundaries clean; Phase 2 starts fresh off `dev`.
- **Phase 1 verifier cross-validating each `Phase 2 action:` line** — considered. Rejected per D-17 to avoid planning rehearsal during Phase 1 verification; Phase 2's planner handles that.
- **Full exported-symbol inventory across all SDK domains** — considered (option to catalog every net-new export even in handwriting / layer / drawing domains). Rejected per D-06; only adjacent-domain net-new makes the cut. The unrelated domains get a single "present, not surveyed" line.

</deferred>

---

*Phase: 1-API Diff Audit*
*Context gathered: 2026-05-17*
