# Codebase Concerns

**Analysis Date:** 2026-05-17

This is a small (~1.8k LOC of `src/`, ~950 LOC of tests, 87 passing tests), actively-CI'd plugin with a clean linter/typechecker baseline. The concerns below are real but mostly low-severity. None block shipping; several are platform constraints rather than code defects.

## Tech Debt

**In-memory-only persistence:**
- Issue: All anchor state lives in a closure-scoped variable. There is no real storage backend.
- Files: `src/storage/anchorStorage.ts` (`createMemoryAnchorStorage`, `getDefaultAnchorStorage`)
- Impact: Anchor + config are lost on plugin reinstall, plugin host restart, or device reboot. The JS context survives lasso taps and note swaps within a session, so in-session UX is unaffected.
- Root cause: The Supernote firmware does not expose a key-value store through `sn-plugin-lib`, and `@react-native-async-storage/async-storage` is **not** declared in `package.json` (the original task prompt was incorrect on that point — there is no AsyncStorage dependency to fail at runtime). Sibling plugins use the same memory fallback. See the `sn-plugin` skill at `~/.claude/skills/sn-plugin/references/storage.md` for the SQLite-via-`node_change/` alternative if a real backend is ever needed.
- Fix approach: `createKvBackedAnchorStorage` already accepts a `KvBackend` interface; if firmware ever ships a KV API, wiring it up is mechanical.

**Schema-mismatch handling resets state instead of migrating:**
- Issue: `parseEnvelope` returns `DEFAULT_ANCHOR_STATE` on any version mismatch, malformed JSON, or invalid config.
- Files: `src/storage/anchorStorage.ts:61-84`
- Impact: Acceptable today — there is nothing to migrate from because storage is in-memory and the version field never crosses a process boundary. But the moment a persistent backend is wired in, every schema bump silently nukes user state.
- Fix approach: When/if persistence lands, add a `migrate(envelope: unknown): AnchorState` step keyed by `version`, with explicit `v2→v3` etc. branches before falling back to defaults.

**Pattern enforcement lives in a sibling skill, not in code or lint:**
- Issue: Cross-cutting Supernote firmware quirks (sync-first reentrancy release, `console.log`-only logger, `modifyButtonRes` unavailability, JSON locale maps, `editDataTypes` `0..5` filter, `setLassoBoxState` lifecycle, icon-sibling `buildPlugin.sh` patch) are documented in `~/.claude/skills/sn-plugin/` rather than enforced by ESLint rules or wrapped in helpers in this repo.
- Impact: Future contributors (or AI agents) without the skill loaded can plausibly re-introduce regressions (e.g. the SnAlign 0.1.0 regression where `editDataTypes` shipped without geometry type `5`, greying the button for shape selections).
- Fix approach: Either (a) add minimal custom ESLint rules for the most error-prone invariants (e.g. require `release()` before any `await` after `tryAcquire`), or (b) document the invariants in `CLAUDE.md` more aggressively (already partially done). Option (a) is more expensive but more durable.

## Known Bugs

None identified. No `TODO` / `FIXME` / `HACK` / `XXX` comments exist in `src/`, `__tests__/`, `index.js`, or `App.tsx`. The CI gates (lint, format, typecheck, test) are all green on `dev` as of 2026-05-17.

## Security Considerations

**No remote network or persistent secrets:**
- The plugin makes zero network calls and stores nothing on disk (see in-memory storage above). There is no attack surface for credential leakage, SSRF, or data exfiltration.
- Files: confirmed by absence of `fetch`, `XMLHttpRequest`, or SDK network imports across `src/`.

**Input trust boundary is the firmware:**
- All inputs (`getLassoRect`, `getPageSize`, button events) come from the Supernote firmware over AIDL. The plugin defensively validates via `isAnchorBox`, `isAlignmentConfig`, `isReferencePoint` (`src/core/anchor.ts:96-125`), `unwrap` (`src/sdk/unwrap.ts`), and `fitsInPage` (`src/sdk/pageSize.ts:55`). Malformed firmware responses fall back to safe defaults rather than crashing.
- Risk: Low. The firmware is the only caller and there is no untrusted user-controlled string parsed into code.

## Performance Bottlenecks

None observed. The hot paths are:
- Two-point alignment math (`computeAnchorShift` in `src/core/anchor.ts:77-87`) — O(1), pure arithmetic.
- `resolvePageSize` (`src/sdk/pageSize.ts:23-53`) — 2-3 firmware calls, but already cached in a closure for the entire popup lifetime (`src/handlers/onLassoMain.ts:120-122`). The handler comment explicitly justifies the caching: avoids 4 firmware calls per interaction, a real battery + latency win on E-Ink.

If anything, the codebase is over-optimized for an E-Ink interactive popup. No concerns here.

## Fragile Areas

**Reentrancy guard discipline relies on convention:**
- Files: `src/core/reentrancyGuard.ts`, `src/handlers/onLassoMain.ts:91-100` (`teardown`)
- Why fragile: The contract is "call `release()` **synchronously** before any `await` in teardown — clearing it after an `await` has been observed on a real device to leave the flag stuck `true`, locking out every future button press." The current `teardown` correctly puts `release()` on line 92, before the two `await`s on lines 98-99. But this is enforced only by a code comment, not by a lint rule or type. A future refactor that reorders `teardown` or extracts it into a helper that puts the release inside the await chain would silently brick the button on-device. Unit tests would not catch this because Jest does not reproduce the firmware's `state:stop` mid-await suspension.
- Safe modification: Keep `release()` as the first statement in any teardown-style helper. Any change to `teardown` or `performApply`'s `finally` block should be reviewed against the comment block at `src/handlers/onLassoMain.ts:24-27`.
- Test coverage: `__tests__/reentrancyGuard.test.ts` exists (22 lines) but only exercises the guard's internal state machine. No integration test reproduces the on-device failure mode.

**Page-size resolution single-source-of-truth assumption:**
- Files: `src/sdk/pageSize.ts:9-10` (`DEFAULT_PAGE_WIDTH = 1920`, `DEFAULT_PAGE_HEIGHT = 2560`)
- Why fragile: The fallback dimensions are A5X2-specific. CLAUDE.md confirms "Verified on Supernote A5X2 (1920×2560)". If any of `getCurrentFilePath`, `getCurrentPageNum`, or `getPageSize` fails on a different device model (e.g. A5X at 1404×1872, or Manta/Nomad variants), the bounds check uses the wrong page rectangle. Symptom: Apply could be falsely rejected (true rect is smaller than assumed) or falsely accepted (true rect is larger), leaving an alignment that exits the actual page.
- Safe modification: If shipping to other Supernote models becomes a goal, replace the literal fallback with a device-model probe via `getDeviceModel` (see `~/.claude/skills/sn-plugin/references/api-gotchas.md` for the page-size matrix), or refuse to render the Apply button at all when `resolvePageSize` hits the fallback.
- Mitigation today: All three firmware calls are routine and well-supported on A5X2, so the fallback is rarely hit in practice on the verified target.

**`editDataTypes: [0,1,2,3,4,5]` literal in button registration:**
- Files: `src/buttons/registerLassoButton.ts:17` (`EDIT_DATA_TYPES_ALL = [0, 1, 2, 3, 4, 5]`)
- Why fragile: The geometry type `5` is required or the firmware greys the button for any lasso selection containing shapes. SnAlign 0.1.0 shipped without `5` — a regression. No test enforces "all six types present" because the values are not introspectable from JS without instrumenting `pluginManager.registerButton`.
- Safe modification: Treat the array as a load-bearing constant. Any change should be reviewed against the comment block on lines 1-9 and cross-checked with `~/.claude/skills/sn-plugin/references/api-gotchas.md` (`editDataTypes` section).

**PopupRoot must not return null:**
- Files: `src/ui/PopupRoot.tsx`, `CLAUDE.md` "Conventions" section
- Why fragile: Returning `null` from `PopupRoot` has been observed to cause the firmware to dismiss the overlay before subsequent state updates can re-render — a soft race. The current code renders a safe header + close button when `state.callbacks` is null. This is a non-obvious contract that an autoformatter or "simplify-empty-component" refactor would break.

## Scaling Limits

Not applicable. This is a per-interaction popup with no batch processing, no concurrent operations, no growth in state size, and a single global button listener (`index.js:49-55`).

## Dependencies at Risk

**`sn-plugin-lib ^0.1.19`:**
- Risk: 0.x version, vendor-specific (Supernote), narrow user base. Breaking changes between minor versions are plausible because the package is still pre-1.0.
- Impact: Future bumps may require code changes in `src/sdk/types.ts`, `src/sdk/pageSize.ts`, or `src/handlers/onLassoMain.ts` where SDK signatures are mirrored.
- Mitigation today: All SDK touchpoints are wrapped behind dependency-injected interfaces (`PageSizeCommAPI`, `PageSizeFileAPI`, `LassoCommAPILike`, `PluginManagerLike`), so the blast radius of an SDK change is contained. Unit tests stub these interfaces directly.

**`react-native 0.79.2` + `react 19.0.0`:**
- Risk: Pinned to specific versions. The Supernote firmware bundles a specific JSC/Hermes runtime; upgrading RN beyond what the firmware supports will break sideload. This is a hard constraint, not a code defect.
- Migration plan: None until Supernote ships a firmware update with a newer runtime.

## Missing Critical Features

None for current scope. Features that are **not present and intentionally so**:
- Pen disable, OCR, sequential text insertion, floating window — none of these are needed for two-point alignment. If feature scope ever expands (e.g. "align and OCR the resulting block"), pull from `~/.claude/skills/sn-plugin/references/pen-emr.md`, `patterns.md` Pattern 13 (sequential text insertion), and `floating-window.md`.
- Per-device-model page-size table — see "Fragile Areas" above.
- Persistent storage — see "Tech Debt" above.

## Test Coverage Gaps

**No on-device / firmware-integration tests:**
- What's not tested: Real `setLassoBoxState` state-machine transitions, real `resizeLassoRect` commit semantics, real reentrancy under `state:stop` mid-await suspension, real `editDataTypes` filter behavior across content types, real page-size resolution on non-A5X2 hardware.
- Risk: All 87 unit tests are JS-level with hand-rolled firmware stubs. Drift between the stubs and real firmware behavior is the main residual risk for this plugin. The codebase relies on manual sideload verification on A5X2 + the sibling-plugin precedent documented in the `sn-plugin` skill.
- Priority: Low for now (the surface area is tiny, sideload-verify per release is tractable). Medium if the plugin ever ships to a wider device matrix.

**Reentrancy guard race condition not reproducible:**
- Files: `__tests__/reentrancyGuard.test.ts` (22 lines)
- What's not tested: The actual on-device failure mode where `release()` after `await` leaves the flag stuck. Jest cannot reproduce this — it would require firmware-level mid-await suspension.
- Risk: A future refactor could break the sync-first contract without any test failing. See "Fragile Areas" above for mitigation.
- Priority: Low (the contract is documented and the current code is correct).

## Process / Tooling Concerns

**CI branch protection only requires `build-check`:**
- Files: `.github/workflows/ci.yml` (lines 56-60). `build-check` `needs: [lint, format, typecheck, test]` but is itself a no-op `echo "All checks passed."` job.
- Impact: Today the dependency chain forces the four real gates to pass before `build-check` runs, so the effective protection is the same. But if any of the four gate jobs is renamed, deleted, or moved to a different workflow file, branch protection will still pass on `build-check` alone. The required-check name in GitHub branch protection is the only thing tying gates to merges.
- Fix approach: Either add each of `lint`, `format`, `typecheck`, `test` as individually required checks in branch protection (more robust), or document the constraint in `CLAUDE.md` so renames are caught in review. The current setup is fine in practice; flagging for awareness only.

**No `.github/ISSUE_TEMPLATE/`:**
- Files: confirmed absent (`.github/` contains only `CODEOWNERS` and `workflows/`).
- Impact: New issues have no structured triage path. For a one-maintainer project (`CODEOWNERS` shows `* @cc-nogueira`) this is fine; for community contributions it'd add friction.
- Priority: Low. Add only if external issue volume grows.

**No automated release versioning:**
- Files: `.github/workflows/release.yml` — `workflow_dispatch` only, version comes from `package.json` on `main`.
- Impact: Releases are intentionally manual ("open a normal dev → main PR that updates `package.json`, then run the workflow"). This is a deliberate design choice (tag-only flow, no auto-push to main), not debt.
- Priority: None. Documented in `CLAUDE.md`.

## Summary

For a 1.8k-LOC plugin with 87 tests, four green CI gates, strict TypeScript settings (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), and zero `TODO`/`FIXME` markers, this codebase is in good shape. The dominant risks are:

1. **Platform constraints** (no real persistence, single-device verification) — not fixable in code.
2. **Conventions enforced only by comments** (reentrancy release ordering, `editDataTypes` literal, non-null `PopupRoot`) — fixable with custom lint rules if the project grows.
3. **Drift between unit-test mocks and real firmware behavior** — the standard limitation for any plugin in this ecosystem; mitigated by sideload verification per release.

None of the above warrants a phase right now. Track them as "watch list" items and revisit if (a) Supernote ships a real KV API, (b) the plugin targets non-A5X2 hardware, or (c) contributor count grows beyond the current single maintainer.

---

*Concerns audit: 2026-05-17*
