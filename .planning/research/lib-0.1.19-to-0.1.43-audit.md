# sn-plugin-lib 0.1.19 → 0.1.43 API Diff Audit

Date: 2026-05-17
Authority order (per D-03): source > types > docs.
Evidence:
- Machine .d.ts diff: ./lib-0.1.19-to-0.1.43-dts.diff
- Ghost-upgrade tsc log: ./lib-0.1.43-ghost-tsc.log
- Ghost-upgrade jest log: ./lib-0.1.43-ghost-jest.log

## Table of Contents
1. Executive Summary
2. Call-Site Sweep (SnAlign-touched APIs)
3. Breaking Changes
4. Behavioral Changes
5. Net-new APIs
6. Four Targeted Answers (filled in Plan 04)
7. sn-plugin Skill Gotcha Cross-Reference (filled in Plan 05)
8. Unknowns / Paper-only Claims (filled in Plan 05)

## 1. Executive Summary

The 0.1.19 → 0.1.43 upgrade is **effectively safe** for the current SnAlign codebase. Evidence from the ghost-upgrade run captured in `./lib-0.1.43-ghost-tsc.log` and `./lib-0.1.43-ghost-jest.log`:

- **`npx tsc --noEmit` clean** (exit 0, zero diagnostics) under our strict TS flags (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `strict`). Per D-11 a strict-TS-only failure would still count as Breaking — none observed.
- **`npx jest` clean** — 7/7 suites pass, 87/87 tests pass.

The audit window does contain one **public-API rename** (`PluginCommAPI.updateLassoRect` → `resizeLassoRect`) that would have broken any pre-`0.1.34` consumer; SnAlign already uses the new name (the `^0.1.19` resolution in our lockfile pulled 0.1.34, which already shipped the rename). It is classified as **Breaking** in §3 with `SnAlign-impact: None — already migrated`.

The 0.1.43 release is otherwise additive: 7 new methods on `PluginCommAPI` (notably `lassoElements`, `resizeLassoRect`, `getPenInfo`, `generateLassoPreview`), 2 new methods on `PluginManager` (`registerMotionListener`, `showPluginView`), 1 new method on `PluginFileAPI` (`deleteElements`), 2 net-new model files (`LassoPreview`, `PenInfo`), and 3 net-new top-level type exports (`EventType`, `MotionEvent`, `Pointer`).

Naming convention used below:
- Call-site rows in §2: numbered `#N`; verdict tags `unchanged` / `breaking` / `behavioral` / `paper-only-deferred`.
- §3 entries: `B-NN` for Breaking.
- §4 entries: `Beh-NN` for Behavioral.
- §5 entries: `N-NN` for Net-new.

## 2. Call-Site Sweep

Every SnAlign integration point from `.planning/codebase/INTEGRATIONS.md`, compared 0.1.19 baseline (from `/tmp/sn-019/node_modules/sn-plugin-lib/`) → 0.1.43 (from `node_modules/sn-plugin-lib/` in the working tree, since the scratch branch's `npm install` left it at 0.1.43 content). Each row cites both endpoints and the SnAlign call site.

| # | API | 0.1.19 declaration | 0.1.43 declaration | SnAlign call site | Verdict | Note |
|---|-----|--------------------|---------------------|---------------------|---------|------|
| 1 | `PluginManager.init` | `init(): Promise<void>` (lib/typescript/src/PluginManager.d.ts:6) | `init(): Promise<void>` (node_modules/sn-plugin-lib/lib/typescript/src/PluginManager.d.ts:11) | `index.js:16` | **unchanged** | No change — SnAlign safe. |
| 2 | `PluginManager.registerButton` | `registerButton(type: number, appTypes: string[], button: Object): Promise<boolean>` (lib/typescript/src/PluginManager.d.ts:34) | `registerButton(type: number, appTypes: string[], button: Object): Promise<boolean>` (node_modules/sn-plugin-lib/lib/typescript/src/PluginManager.d.ts:65) | `src/buttons/registerLassoButton.ts:32` | **unchanged** | Validation comment now mentions deduplication; behavior unchanged. No change — SnAlign safe. |
| 3 | `PluginManager.registerButtonListener` | `registerButtonListener(buttonListener: ButtonListener): ButtonSubscription` (lib/typescript/src/PluginManager.d.ts:8) | `registerButtonListener(buttonListener: ButtonListener): ButtonSubscription` (node_modules/sn-plugin-lib/lib/typescript/src/PluginManager.d.ts:18) | `src/buttons/registerLassoButton.ts:53` | **unchanged** | No change — SnAlign safe. |
| 4 | `PluginManager.getPluginDirPath` | `getPluginDirPath(): Promise<string \| null \| undefined>` (lib/typescript/src/PluginManager.d.ts:6) | `getPluginDirPath(): Promise<string \| null \| undefined>` (node_modules/sn-plugin-lib/lib/typescript/src/PluginManager.d.ts:99) | `src/buttons/buttonCommon.ts:30` | **unchanged** | No change — SnAlign safe. |
| 5 | `PluginManager.closePluginView` | `closePluginView(): Promise<boolean>` (lib/typescript/src/PluginManager.d.ts) | `closePluginView(): Promise<boolean>` (node_modules/sn-plugin-lib/lib/typescript/src/PluginManager.d.ts:120) | `index.js:35`, `src/ui/PopupRoot.tsx:27`, `src/sdk/closeView.ts` | **unchanged** | No change — SnAlign safe. (Companion `showPluginView` is net-new; see N-04.) |
| 6 | `PluginCommAPI.getLassoRect` | `getLassoRect(): Promise<APIResponse<Object>>` (lib/typescript/src/sdk/PluginCommAPI.d.ts) | `getLassoRect(): Promise<APIResponse<Object>>` (node_modules/sn-plugin-lib/lib/typescript/src/sdk/PluginCommAPI.d.ts:116) | `src/handlers/onLassoMain.ts:60` | **unchanged** | No change — SnAlign safe. The `result: {left,top,right,bottom}` envelope is identical. |
| 7 | `PluginCommAPI.resizeLassoRect` | _absent — method was named `updateLassoRect` in 0.1.19_ | `resizeLassoRect(rect: {left,top,right,bottom}): Promise<APIResponse<boolean>>` (node_modules/sn-plugin-lib/lib/typescript/src/sdk/PluginCommAPI.d.ts:130) | `src/handlers/onLassoMain.ts:181`, `src/handlers/onLassoMain.ts:44` (Pick<,'resizeLassoRect'>) | **breaking** (audit window) | The 0.1.19 method was `updateLassoRect`; renamed in 0.1.34 (transitively). SnAlign already uses the new name (`resizeLassoRect`); see §3 B-01. `SnAlign-impact: None — already migrated`. |
| 8 | `PluginCommAPI.setLassoBoxState` | `setLassoBoxState(state: number): Promise<APIResponse<boolean>>` (lib/typescript/src/sdk/PluginCommAPI.d.ts) | `setLassoBoxState(state: number): Promise<APIResponse<boolean>>` (node_modules/sn-plugin-lib/lib/typescript/src/sdk/PluginCommAPI.d.ts:103) | `src/handlers/onLassoMain.ts:69`, etc. | **unchanged** | Signature unchanged. State-enum (`0=Show, 1=Hide, 2=Completely remove`) unchanged. The `paper-only` question of whether `state=2`'s auto-commit semantics shifted is **deferred to Phase 4 sideload** (Unknowns §8). |
| 9 | `PluginCommAPI.getCurrentFilePath` | `getCurrentFilePath(): Promise<Object \| null \| undefined>` (lib/typescript/src/sdk/PluginCommAPI.d.ts) | `getCurrentFilePath(): Promise<Object \| null \| undefined>` (node_modules/sn-plugin-lib/lib/typescript/src/sdk/PluginCommAPI.d.ts:194) | `src/sdk/pageSize.ts:29` | **unchanged** | No change — SnAlign safe. |
| 10 | `PluginCommAPI.getCurrentPageNum` | `getCurrentPageNum(): Promise<Object \| null \| undefined>` (lib/typescript/src/sdk/PluginCommAPI.d.ts) | `getCurrentPageNum(): Promise<Object \| null \| undefined>` (node_modules/sn-plugin-lib/lib/typescript/src/sdk/PluginCommAPI.d.ts:189) | `src/sdk/pageSize.ts:29` | **unchanged** | No change — SnAlign safe. |
| 11 | `PluginFileAPI.getPageSize` | `getPageSize(notePath: string, page: number): Promise<Object \| null \| undefined>` (lib/typescript/src/sdk/PluginFileAPI.d.ts) | `getPageSize(notePath: string, page: number): Promise<Object \| null \| undefined>` (node_modules/sn-plugin-lib/lib/typescript/src/sdk/PluginFileAPI.d.ts:138) | `src/sdk/pageSize.ts:36` | **unchanged** | No change — SnAlign safe. |

**Sweep result:** 10 of 11 call-site rows are `unchanged`. The 11th (`resizeLassoRect`) is `breaking` against the strict 0.1.19 baseline but `SnAlign-impact: None — already migrated` because the lockfile resolved 0.1.34 (which had the rename). The four ROADMAP success criterion #4 APIs (`getLassoRect`, `resizeLassoRect`, `setLassoBoxState`, `getCurrentFilePath`, `getCurrentPageNum`, `closePluginView`, `getPageSize`) all appear above with verdicts.

## 3. Breaking Changes

### B-01: `PluginCommAPI.updateLassoRect` removed; replaced by `resizeLassoRect`
- 0.1.19 shape: `static updateLassoRect(rect: {left,top,right,bottom}): Promise<APIResponse<boolean>>` (from `/tmp/sn-019/node_modules/sn-plugin-lib/lib/typescript/src/sdk/PluginCommAPI.d.ts`)
- 0.1.43 shape: `static resizeLassoRect(rect: {left,top,right,bottom}): Promise<APIResponse<boolean>>` (`node_modules/sn-plugin-lib/lib/typescript/src/sdk/PluginCommAPI.d.ts:130`)
- SnAlign impact: **None — already migrated.** `src/handlers/onLassoMain.ts:181` already calls `resizeLassoRect`. Type stub `LassoCommAPILike` at `src/handlers/onLassoMain.ts:44` uses `resizeLassoRect: (rect: Rect) => Promise<APIResponse<boolean>>` (the new name).
- Strict-TS gate: N/A (call site already uses the new name, so no diagnostics fire).
- Evidence: `lib-0.1.19-to-0.1.43-dts.diff` (PluginCommAPI hunk shows `-    static updateLassoRect` / `+    static resizeLassoRect`); confirmed by source at `node_modules/sn-plugin-lib/src/sdk/PluginCommAPI.ts`.
- Phase 2 action: **No action required.** Add a one-line note to the Phase 2 changelog acknowledging the rename was already in-effect via the 0.1.34 transitive resolution. If a future contributor pins back to `0.1.19` directly, this becomes a real break — flag in `package.json` review.

### Removed / Deprecated
Per D-12, this subsection lists 0.1.19 APIs that 0.1.43 removed or deprecated **even when SnAlign doesn't currently call them**.

- **`PluginCommAPI.updateLassoRect`** — see B-01 above. `SnAlign-impact: None — not currently called` (would be the verdict for any consumer that hadn't already migrated; SnAlign already uses the new name).
- No other public-API removals detected. All other 0.1.19 exports (every static method on `PluginCommAPI` / `PluginFileAPI` / `PluginManager` / `PluginNoteAPI` / `PluginDocAPI`, every model class, every utility) survive in 0.1.43 with their signatures intact.

**§3 headline:** 1 Breaking entry; SnAlign impact = none (already migrated). The Breaking bucket would have been empty had the 0.1.19 baseline matched our lockfile-resolved 0.1.34.

## 4. Behavioral Changes

### Beh-01: `PluginManager.setButtonState` documentation now declares "throws on invalid params"
- 0.1.19 shape: `setButtonState(id: number, state: boolean): Promise<boolean>` — JSDoc described the return only.
- 0.1.43 shape: same signature; JSDoc now explicitly says: "Validates parameters via verifyParams. `id` must be a non-negative integer, `state` must be a boolean. Invalid parameters throw immediately and prevent calling into the native layer." (`node_modules/sn-plugin-lib/lib/typescript/src/PluginManager.d.ts:78-89`).
- SnAlign impact: `src/buttons/buttonCommon.ts:safeSetButtonState` already wraps the call in try/catch via the `safe*` pattern. No change required; the new throw-on-invalid behavior is already swallowed.
- Evidence: hunks in `lib-0.1.19-to-0.1.43-dts.diff` for `PluginManager.d.ts` show the JSDoc expansion. Source-side confirmation in `node_modules/sn-plugin-lib/src/PluginManager.ts` — the actual `verifyParams` call is present in 0.1.43.
- Tagging: `paper-only` per D-14 — the type signature is unchanged, so types don't surface this. The JSDoc + source comment is the audit's evidence.
- Phase 2 action: No source edit required. Optionally tighten `safeSetButtonState` to log a more descriptive warning when the throw is `Invalid params:` (low priority; cosmetic logging improvement).

### Beh-02: `PluginManager.registerButton` runtime validation explicitly described
- 0.1.19 shape: `registerButton(type: number, appTypes: string[], button: Object): Promise<boolean>` — JSDoc declared `@throws Error When parameters are invalid`.
- 0.1.43 shape: same signature; JSDoc now adds: "Validates `type`: must be 1 (sidebar), 2 (lasso toolbar), or 3 (document selection toolbar). Validates `appTypes`: must be a non-empty string array, and each item must be in `AppType`. Deduplicates `appTypes` before passing to the native API."
- SnAlign impact: `src/buttons/registerLassoButton.ts:32` passes `type=2`, `appTypes=['NOTE']`, button payload — all already valid. The explicit dedup behavior is new but irrelevant (`appTypes` is a singleton array).
- Tagging: `paper-only`.
- Phase 2 action: No action.

**§4 headline:** 2 Behavioral entries, both `paper-only` documentation expansions of pre-existing runtime behavior. No SnAlign source edits triggered.

## 5. Net-new APIs

Scope per D-06: mandatory in-domain net-new in `PluginManager`, `PluginCommAPI`, `PluginFileAPI`; adjacent-domain net-new in `PluginNoteAPI`, `PluginDocAPI`, `model/`, `event/`, `utils/`. Unrelated domains (handwriting recognition pipeline, layer engine, custom drawing, sticker subsystem internals) get one "Present, not surveyed" line.

### N-01: `PluginCommAPI.lassoElements(rect)`
- Signature: `static lassoElements(rect: {left,top,right,bottom}): Promise<APIResponse<boolean>>` (node_modules/sn-plugin-lib/lib/typescript/src/sdk/PluginCommAPI.d.ts:149)
- Source: `node_modules/sn-plugin-lib/src/sdk/PluginCommAPI.ts` (companion implementation)
- Use case (paper read): Programmatically create or replace the active lasso selection by specifying a rectangle. Distinct from `resizeLassoRect` (which mutates the existing lasso); this can _initiate_ a lasso programmatically.
- Phase 3 candidate: **needs-eval.** Could simplify alignment by letting Apply replace the existing lasso instead of resizing it. Eval gate: does it preserve element selection across the replace? Behavior under undo? Defer to Phase 3 sideload spike before committing.

### N-02: `PluginCommAPI.getPenInfo()`
- Signature: `static getPenInfo(): Promise<APIResponse<PenInfo>>` (note: typed as `Promise<Object | null | undefined>` in the .d.ts due to the lib's external-type erasure; runtime shape is `PenInfo` per `node_modules/sn-plugin-lib/lib/typescript/src/model/PenInfo.d.ts`)
- Source: `node_modules/sn-plugin-lib/src/sdk/PluginCommAPI.ts`
- Use case (paper read): Returns the current pen tool's state (color, thickness, etc. — see `PenInfo.d.ts`). Not directly useful for alignment, but interesting for any future Phase that wants to mirror pen attributes.
- Phase 3 candidate: **no.** Not relevant to lasso alignment.

### N-03: `PluginCommAPI.generateLassoPreview(imagePath)`
- Signature: `static generateLassoPreview(imagePath: string): Promise<APIResponse<LassoPreview>>` (declared as `Promise<Object | null | undefined>` in the .d.ts; runtime shape is `LassoPreview` per `node_modules/sn-plugin-lib/lib/typescript/src/model/lasso/LassoPreview.d.ts`)
- Source: `node_modules/sn-plugin-lib/src/sdk/PluginCommAPI.ts`
- Use case (paper read): Render the current lasso content as a preview image (presumably PNG) at the given path. Could let SnAlign show a thumbnail of "what's being aligned" in the popup.
- Phase 3 candidate: **needs-eval.** Possibly cool UX but adds disk I/O on every popup open. Defer.

### N-04: `PluginManager.showPluginView()`
- Signature: `showPluginView(): Promise<boolean>` (node_modules/sn-plugin-lib/lib/typescript/src/PluginManager.d.ts:125)
- Source: `node_modules/sn-plugin-lib/src/PluginManager.ts`
- Use case (paper read): Complement to `closePluginView`. Lets a plugin re-show its view without a fresh button-press cycle. Could simplify Apply & Re-anchor's flow if we ever want to keep the popup open after Apply.
- Phase 3 candidate: **needs-eval.** Tied to the "should Apply close or keep open?" UX question; defer until that's revisited.

### N-05: `PluginManager.registerMotionListener(registerType, listener)`
- Signature: `registerMotionListener(regisgerType: number, listener: PluginEventListener): PluginEventSubscription` (node_modules/sn-plugin-lib/lib/typescript/src/PluginManager.d.ts:54) (typo `regisgerType` from the lib's own JSDoc preserved)
- Source: `node_modules/sn-plugin-lib/src/PluginManager.ts`
- Use case (paper read): Listen to raw touch/motion events. `listener.onMsg(msg)` receives a `MotionEvent` (new model type — see N-08) where `msg.pointers` is a `Pointer[]`.
- Phase 3 candidate: **no.** SnAlign's UX is button-driven; raw motion is out of scope.

### N-06: `PluginFileAPI.deleteElements(notePath, page, numsInPage)`
- Signature: `static deleteElements(notePath: string, page: number, numsInPage: number[]): Promise<Object | null | undefined>` (node_modules/sn-plugin-lib/lib/typescript/src/sdk/PluginFileAPI.d.ts:54)
- Source: `node_modules/sn-plugin-lib/src/sdk/PluginFileAPI.ts`
- Use case (paper read): Delete the elements at the given page indices. Complements the existing `modifyElements`/`insertElements`/`replaceElements`. Not exposed via PluginCommAPI (lasso-scope), so SnAlign would need note-path discovery to use it.
- Phase 3 candidate: **no.** Not useful for alignment.

### N-07: `PluginCommAPI.getCacheElement(uuid)`
- Signature: `static getCacheElement(uuid: string): Promise<APIResponse<Element>>` (typed as `Promise<Object | null | undefined>` in the .d.ts)
- Source: `node_modules/sn-plugin-lib/src/sdk/PluginCommAPI.ts`
- Use case (paper read): Read back a single element by UUID from the cache (companion to `createElement`/`recycleElement`/`clearElementCache`).
- Phase 3 candidate: **no.** Element-cache-aware features are out of scope.

### N-08: `PluginCommAPI.recognizeElements(elements, size)` and `cancelRecognize()`
- Signatures:
  - `static recognizeElements(elements: Object[] | null | undefined, size: {width: number, height: number}): Promise<APIResponse<string>>`
  - `static cancelRecognize(): Promise<APIResponse<boolean>>`
- Source: `node_modules/sn-plugin-lib/src/sdk/PluginCommAPI.ts`
- Use case (paper read): Handwriting → text recognition with cancel support. Returns the recognized string.
- Phase 3 candidate: **no.** Out of SnAlign scope.

### N-09: `model/lasso/LassoPreview.d.ts` (net-new type module)
- Source: `node_modules/sn-plugin-lib/lib/typescript/src/model/lasso/LassoPreview.d.ts`
- Use case: Return type for N-03 `generateLassoPreview`.
- Phase 3 candidate: tied to N-03's eval.

### N-10: `model/PenInfo.d.ts` (net-new type module)
- Source: `node_modules/sn-plugin-lib/lib/typescript/src/model/PenInfo.d.ts`
- Use case: Return type for N-02 `getPenInfo`.
- Phase 3 candidate: **no.**

### N-11: Top-level barrel re-exports — `EventType`, `MotionEvent`, `Pointer`
- Source: `node_modules/sn-plugin-lib/lib/typescript/src/index.d.ts:12-13` — these are now re-exported from the package root (previously only reachable via `./event/PluginEvent`).
- Use case: Consumers of N-05 (`registerMotionListener`) get cleaner imports.
- Phase 3 candidate: **no** (transitive on N-05).

### Adjacent-domain net-new — `PluginNoteAPI` / `PluginDocAPI` / `utils/PointUtils` / `sdk/utils/VerifyUtils`
The .d.ts diff shows changes in `sdk/PluginNoteAPI.d.ts`, `sdk/PluginDocAPI.d.ts`, `utils/PointUtils.d.ts`, and `sdk/utils/VerifyUtils.d.ts` — mostly comment translations plus a small number of additive method signatures. None are referenced from SnAlign's source. Survey verdict: **no Phase 3 candidates** in the lasso-alignment context. Specific net-new methods not enumerated here can be read from the diff directly if a future phase needs them.

### Unrelated-domain net-new APIs (per D-06 — present, not surveyed)
The 0.1.43 release also touches handwriting-recognition internals, the layer engine, custom-drawing primitives, and sticker subsystem internals. **Present, not surveyed.** No SnAlign relevance.

**§5 headline:** 11 in-domain Net-new entries (N-01..N-11). Three are `needs-eval` Phase 3 candidates (N-01, N-03, N-04); the rest are `no`.

## 6. Four Targeted Answers

These answers feed the ADOPT-01 (persistent storage) and ADOPT-02 (simplification) decisions in Phase 3. Per D-07/D-08, claims here are static analysis only — on-device runtime proof is deferred to Phase 4 sideload (and surfaced in §8 Unknowns).

Every subsection below cites at least one `node_modules/sn-plugin-lib/...` path locally, enforced by the §6 verify gate (per-subsection `awk`/`grep` block — see Plan 01-04 Task 1's verify automation).

### 6.1 AsyncStorage — bundled? new KV API?

Static evidence (each bullet cites a path under `node_modules/sn-plugin-lib/`):

- **Native (Android):** `grep -rni "asyncstorage\|@react-native-async-storage" node_modules/sn-plugin-lib/android/` → **no matches.** The `node_modules/sn-plugin-lib/android/src/main/java/com/ratta/supernote/pluginlib/modules/PluginModule.java` (the central native bridge) declares its `@ReactMethod` surface (e.g. `modifyButtonRes` at line 113); none of the methods provide an `AsyncStorage`-shaped KV API.
- **Native (iOS):** `node_modules/sn-plugin-lib/RtnSupernotePluginCore.podspec` declares the pod's resource scope; no `AsyncStorage` integration declared. (iOS isn't a target platform for SnAlign — A5X2 is Android — but the audit covers the package surface.)
- **Peer deps:** `node_modules/sn-plugin-lib/package.json` — `"dependencies": {}` (empty); `"peerDependencies": ["react", "react-native"]`. **No AsyncStorage-shaped peer or runtime dep.** Same as 0.1.19.
- **Net-new KV surface check:** Walked `node_modules/sn-plugin-lib/lib/typescript/src/PluginManager.d.ts`, `lib/typescript/src/module/NativePluginManager.d.ts`, `lib/typescript/src/sdk/PluginFileAPI.d.ts`, and `lib/typescript/src/sdk/PluginCommAPI.d.ts` for KV-shaped methods (`getItem` / `setItem` / `removeItem` / `kvStore` / `storage`). **No matches.** No new public method exposes a KV store.

Verdict:
- **Bundling:** **no** — `AsyncStorage` is neither a dep, peerDep, nor bundled in the native bridge (Android Java side has no AsyncStorage module registration; the podspec has no AsyncStorage resource).
- **New KV API on PluginManager / NativePluginManager / PluginFileAPI:** **no** — none found.
- **SnAlign-impact (per ADOPT-01):** `src/storage/anchorStorage.ts` keeps `createMemoryAnchorStorage` as the default. The unused `createKvBackedAnchorStorage` + `KvBackend` interface remain in place for any future firmware that bundles a KV. **In-memory remains the contract; ADOPT-01 stays deferred** — matches the current `sn-plugin` skill claim at `~/.claude/skills/sn-plugin/references/storage.md`.
- **Deferred to Phase 4 sideload:** runtime confirmation that no untyped KV native module is silently registered by the firmware host (the audit can only see what the tarball ships; the host firmware could in principle inject AsyncStorage). Phase 4 sideload's diagnostic is: `try { require('@react-native-async-storage/async-storage') } catch` on device.

### 6.2 modifyButtonRes — does it work in 0.1.43?

Static evidence (each bullet cites a path under `node_modules/sn-plugin-lib/`):

- **Type declaration:** Declared at `node_modules/sn-plugin-lib/lib/typescript/src/module/NativePluginManager.d.ts:112` — `modifyButtonRes(button: Object): Promise<boolean>`. **Not** re-declared on the public `PluginManager` surface (`lib/typescript/src/PluginManager.d.ts` has no `modifyButtonRes` line).
- **Source implementation (TS bridge):** Declared at `node_modules/sn-plugin-lib/src/module/NativePluginManager.ts:130` — `modifyButtonRes(button: Object,): Promise<boolean>;`. The public wrapper `node_modules/sn-plugin-lib/src/PluginManager.ts` does NOT re-export it (grep confirms: only `unregisterButtonRes` is bridged through — line 521). So a JS consumer would have to call `NativePluginManager.modifyButtonRes(...)` directly, bypassing the public API.
- **Source implementation (native Android):** Implemented at `node_modules/sn-plugin-lib/android/src/main/java/com/ratta/supernote/pluginlib/modules/PluginModule.java:113` — `public void modifyButtonRes(ReadableMap button, Promise promise)`. The native side accepts the call.
- **Cross-reference with current skill gotcha:** `~/.claude/skills/sn-plugin/references/api-gotchas.md` claims `modifyButtonRes` is "declared in .d.ts but NOT exposed by firmware". The 0.1.43 source corroborates that the **public TS wrapper doesn't bridge it** (refines the prior claim — the native side is there, but the JS-facing API isn't). Firmware on-device reliability remains unverified.

Verdict:
- **Type present:** **yes** — on `NativePluginManager.d.ts:112` (but NOT on the public `PluginManager.d.ts`).
- **Source implementation present:** **yes** (native Android side at `PluginModule.java:113` + TS bridge interface). The public wrapper, however, does NOT bridge it through.
- **Paper assessment:** **still unreliable from a public-API standpoint.** A consumer would need to import `NativePluginManager` directly (bypassing the public surface), and on-device reliability remains an open question per the existing skill gotcha.
- **SnAlign-impact (per ADOPT-02):** **skip — still marked unreliable.** SnAlign already disables modifyButtonRes in `src/buttons/buttonCommon.ts`'s SnAlign-side stub (`PluginManagerLike.modifyButtonRes?` is optional and never invoked at runtime). Keep as-is for Phase 2.
- **Deferred to Phase 4 sideload (per D-08):** on-device reliability across A5X2 firmware variants. Specifically: does a direct call to `NativePluginManager.modifyButtonRes(...)` actually mutate a registered button's resources on A5X2? Flag for SKILL-01 / SKILL-02 gotcha audit in Phase 4 — the skill text needs the "TS wrapper doesn't bridge it" nuance added.

### 6.3 Page-bounds query — is there a built-in?

Static evidence (each bullet cites a path under `node_modules/sn-plugin-lib/`):

- **Type-surface walk:** Searched `node_modules/sn-plugin-lib/lib/typescript/src/PluginCommAPI.d.ts` and `node_modules/sn-plugin-lib/lib/typescript/src/sdk/PluginFileAPI.d.ts` for any method matching: `pageBounds`, `pageRect`, `getPageRect`, `clampToPage`, `pageExtent`, `pageInfo`. **No matches.** The 0.1.43 type surface still exposes only `PluginFileAPI.getPageSize(notePath, page)` and `PluginCommAPI.getCurrentPageNum()` + `getCurrentFilePath()` — the same 3-step resolution SnAlign already uses in `src/sdk/pageSize.ts`.
- **Source walk:** Searched `node_modules/sn-plugin-lib/src/sdk/PluginCommAPI.ts` and `node_modules/sn-plugin-lib/src/sdk/PluginFileAPI.ts` for any `clamp` / `inPage` / `wouldExit` helper. **No matches.** No source-only utility hides a page-bounds query that the .d.ts doesn't surface.

Verdict:
- **New page-bounds query:** **none found.** The 0.1.43 release does not add a single-call page-bounds / clamp-rect helper to `PluginCommAPI` or `PluginFileAPI`. SnAlign's existing 3-step `resolvePageSize` (`src/sdk/pageSize.ts:18-50`) + fallback to `1920×2560` remains the right approach.
- **SnAlign-impact (per ADOPT-02):** **no win — keep current 3-step + fallback.** The `wouldExitPage` computation in `src/handlers/onLassoMain.ts` stays as-is; no simplification opportunity from the SDK side.

### 6.4 Other new lasso/page APIs

Static evidence (each bullet cites a path under `node_modules/sn-plugin-lib/`):

- Walked `node_modules/sn-plugin-lib/lib/typescript/src/sdk/PluginCommAPI.d.ts` for net-new methods relevant to the lasso/page flow. Per D-06, only "adjacent-domain" net-new in `PluginCommAPI` / `PluginFileAPI` counts; unrelated domains (handwriting recognition pipeline, layer engine, custom drawing) get a "present, not surveyed" mention.
- Cross-referenced against §5 (Net-new APIs) — restated the relevant `node_modules/sn-plugin-lib/...` citations inline below so this subsection independently satisfies the per-subsection citation gate.

Verdict per new lasso/page-relevant method:

| Method | Citation | Phase 3 candidate | Reason |
|--------|----------|-------------------|--------|
| `PluginCommAPI.lassoElements(rect)` | `node_modules/sn-plugin-lib/lib/typescript/src/sdk/PluginCommAPI.d.ts:149` | **needs-eval** | Could replace the lasso programmatically (vs. resizing). Eval gate: element-selection preservation, undo behavior on A5X2. |
| `PluginCommAPI.resizeLassoRect(rect)` | `node_modules/sn-plugin-lib/lib/typescript/src/sdk/PluginCommAPI.d.ts:130` | **no — already adopted** | Renamed from `updateLassoRect`; SnAlign already calls it (§3 B-01). No new work. |
| `PluginCommAPI.getLassoElements()` | `node_modules/sn-plugin-lib/lib/typescript/src/sdk/PluginCommAPI.d.ts:174` (present in 0.1.19 too) | **no** | Pre-existing; not relevant to alignment (returns elements, not bounds). |
| `PluginCommAPI.getLassoElementTypeCounts()` | `node_modules/sn-plugin-lib/lib/typescript/src/sdk/PluginCommAPI.d.ts:179` (present in 0.1.19 too) | **no** | Pre-existing. Could power a popup-side label ("aligning N strokes + M images"); cosmetic only. |
| `PluginCommAPI.deleteLassoElements()` | `node_modules/sn-plugin-lib/lib/typescript/src/sdk/PluginCommAPI.d.ts:184` (present in 0.1.19 too) | **no** | Pre-existing; destructive — out of SnAlign scope. |
| `PluginCommAPI.generateLassoPreview(imagePath)` | `node_modules/sn-plugin-lib/lib/typescript/src/sdk/PluginCommAPI.d.ts:292` | **needs-eval** | Could let SnAlign show a preview thumbnail in the popup. Eval gate: disk-I/O latency on E-Ink. |
| `PluginCommAPI.getLassoGeometries()` | `node_modules/sn-plugin-lib/lib/typescript/src/sdk/PluginCommAPI.d.ts:204` (present in 0.1.19 too) | **no** | Pre-existing. |
| `PluginManager.showPluginView()` | `node_modules/sn-plugin-lib/lib/typescript/src/PluginManager.d.ts:125` | **needs-eval** | Would enable "Apply without closing" UX. Tied to undecided UX question — defer with N-04. |
| `PluginFileAPI.deleteElements(notePath, page, numsInPage)` | `node_modules/sn-plugin-lib/lib/typescript/src/sdk/PluginFileAPI.d.ts:54` | **no** | File-scope delete, requires path discovery; not relevant to lasso flow. |

**Unrelated-domain net-new APIs (per D-06 — present, not surveyed):** the 0.1.43 release also touches handwriting-recognition (PluginCommAPI's `recognizeElements` / `cancelRecognize` per §5 N-08), pen-info read-back (N-02), element-cache lookup (N-07), motion-event listening (N-05), and assorted layer / sticker / drawing internals. Present, not surveyed.

---

## 7. sn-plugin Skill Gotcha Cross-Reference
_Filled in Plan 05 (gsd-plan 01-05)._

## 8. Unknowns / Paper-only Claims
_Filled in Plan 05 (gsd-plan 01-05)._
