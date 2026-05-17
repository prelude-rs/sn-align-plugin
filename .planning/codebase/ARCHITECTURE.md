<!-- refreshed: 2026-05-17 -->
# Architecture

**Analysis Date:** 2026-05-17

## System Overview

```text
┌─────────────────────────────────────────────────────────────────────┐
│  Firmware host (Supernote Android, sn-plugin-lib)                   │
│  PluginManager · PluginCommAPI · PluginFileAPI · AppRegistry        │
└────────────────────┬────────────────────────────────────────────────┘
                     │ button press (event.id) │ React render
                     ▼                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Entry & wiring  `index.js`                                         │
│  - AppRegistry.registerComponent(appName, () => App)                │
│  - PluginManager.init() + registerLassoButton()                     │
│  - Single onButtonPress router: event.id === 201 → onLassoMain      │
└────────────────────┬────────────────────────────────────────────────┘
                     │
        ┌────────────┼─────────────────────────────────┐
        ▼            ▼                                 ▼
┌──────────────┐ ┌──────────────────────────┐ ┌──────────────────────┐
│ Button reg.  │ │ Handler                   │ │ React shell          │
│ `src/buttons/`│ │ `src/handlers/onLasso     │ │ `App.tsx`            │
│              │ │  Main.ts`                 │ │ `src/ui/PopupRoot.   │
│ registerLasso│ │ - tryAcquire guard        │ │  tsx` (always-render)│
│ Button (id   │ │ - load storage            │ │ Subscribes to        │
│ 201, type 2, │ │ - cache lasso + pageSize  │ │ popupController bus  │
│ showType 1)  │ │ - showPopup + callbacks   │ │ → mounts             │
└──────────────┘ │ - performApply(reAnchor?) │ │ AlignmentPopup       │
                 │ - teardown (release, hide,│ └──────────────────────┘
                 │   lasso state 2, close)   │            ▲
                 └────────────┬──────────────┘            │ state push
                              │                           │
        ┌─────────────────────┼─────────────┬─────────────┘
        ▼                     ▼             ▼
┌─────────────────┐  ┌──────────────────┐ ┌───────────────────────────┐
│ Core math       │  │ Storage           │ │ Popup controller (bus)    │
│ `src/core/`     │  │ `src/storage/`    │ │ `src/ui/popupController.  │
│ - anchor.ts     │  │ anchorStorage.ts  │ │  ts`                      │
│ pointOnBox      │  │ v3 envelope:      │ │ showPopup / updatePopup / │
│ computeAnchor   │  │ {config,anchorBox}│ │ hidePopup / subscribe     │
│ Shift, translate│  │ in-memory backend │ │ (replays state on         │
│ Rect, guards    │  │ (firmware has no  │ │  subscribe)               │
│ - reentrancy    │  │ KV); KV interface │ └───────────────────────────┘
│ Guard           │  │ kept for future   │
└─────────────────┘  └──────────────────┘
        ▲
        │ used by
┌─────────────────────────────────────────────────────────────────────┐
│ SDK helpers   `src/sdk/`                                             │
│ - pageSize.ts: resolvePageSize (path + page → getPageSize, fallback  │
│   1920×2560), fitsInPage                                             │
│ - types.ts: APIResponse<T>, Logger                                   │
│ - unwrap.ts: throw-on-failed APIResponse                             │
│ - closeView.ts: safeClosePluginView                                  │
└─────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Firmware effects (write side)                                        │
│ resizeLassoRect · setLassoBoxState(1=hide / 2=release) ·            │
│ closePluginView                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Entry / DI wiring | Init `PluginManager`, build deps envelope (`comm`, `fileApi`, `storage`, `logger`), register lasso button, route `event.id` to handler | `index.js` |
| React root | Hosts the always-visible popup shell registered with `AppRegistry` | `App.tsx`, `src/ui/PopupRoot.tsx` |
| Lasso button registration | Registers a single id=201 button on the lasso toolbar (`BUTTON_TYPE_LASSO_TOOLBAR=2`, `showType:1`, `editDataTypes:[0..5]`) and attaches a global listener | `src/buttons/registerLassoButton.ts`, `src/buttons/buttonCommon.ts` |
| Lasso handler | Drives the full popup lifecycle: acquire reentrancy guard, snapshot lasso + page size, show popup, mutate `cfg` on settings callbacks, run `performApply(alsoReAnchor)` on Apply, teardown firmware state on every exit path | `src/handlers/onLassoMain.ts` |
| Alignment math | Pure functions over `Rect` + `AlignmentConfig`: `pointOnBox`, `computeAnchorShift`, `translateRect`, runtime type guards | `src/core/anchor.ts` |
| Reentrancy guard | Module-level `busy` flag; sync `tryAcquire` / `release` | `src/core/reentrancyGuard.ts` |
| Storage | v3 envelope `{config, anchorBox}`; `load` / `save` / `setConfig` / `setAnchorBox`; in-memory default (no firmware KV available), KV interface preserved for future | `src/storage/anchorStorage.ts` |
| SDK helpers | Page-size resolution with fallback, `APIResponse<T>` unwrap, safe close-view wrapper, narrow logger/type contracts | `src/sdk/pageSize.ts`, `src/sdk/unwrap.ts`, `src/sdk/closeView.ts`, `src/sdk/types.ts` |
| Popup UI | Renders the popup card (two pickers, axis toggles, offset steppers, warning slot, Apply / Apply & Re-anchor / Set Anchor buttons), the 9-cell reference picker, and styles | `src/ui/AlignmentPopup.tsx`, `src/ui/ReferencePicker.tsx`, `src/ui/styles.ts` |
| Popup state bus | Mediates handler → React: `showPopup`, `updatePopup`, `hidePopup`, `subscribe` (replays current state immediately) | `src/ui/popupController.ts` |
| i18n | `t(id)` for the React UI; JSON-encoded `{locale: name}` maps for the firmware-visible button + plugin name; locale normaliser | `src/i18n/i18n.ts` |

## Pattern Overview

**Overall:** Layered, dependency-injected, event-driven plugin with a single firmware-popup React surface.

**Key Characteristics:**
- **Strict layering, no upward imports.** UI never imports the handler; the handler never imports React; core math has zero plugin/SDK imports and is pure.
- **Dependency injection at the edge.** `index.js` constructs a `LassoDeps` envelope (`comm`, `fileApi`, `storage`, `logger`) and passes it to `onLassoMain`. Tests substitute fakes for every field — no module-level firmware reads.
- **Pure-core / impure-shell split.** All math (`src/core/anchor.ts`) is pure and unit-tested in isolation. Side effects live in the handler and SDK layer.
- **Orthogonal model.** `config` (reference points, axis toggles, offsets) and `anchorBox` (saved rect) are persisted in one envelope but are independent — any change to one never disturbs the other. Load-bearing invariant.
- **Single firmware button → single popup.** No page-toolbar button. The popup is the only surface; every interaction (pick, toggle, stepper, set-anchor, apply, apply-and-re-anchor, close) flows back through callbacks on the same handler closure.
- **State bus over prop drilling.** `popupController.ts` is a tiny pub/sub; the handler pushes state, `PopupRoot` subscribes. Subscribe replays current state to handle the `show()`-before-mount race.

## Layers

**Entry / Composition Root:**
- Purpose: Initialise firmware bindings, build DI envelope, register button, route presses
- Location: `index.js` (+ `App.tsx`)
- Contains: `PluginManager.init`, logger construction, `lassoComm` / `fileApi` / `storage` wiring, `onButtonPress` router
- Depends on: `sn-plugin-lib`, `registerLassoButton`, `onLassoMain`, `getDefaultAnchorStorage`
- Used by: Firmware (`AppRegistry`, button listener)

**Button registration:**
- Purpose: Declare the lasso-toolbar button to the firmware and route press events
- Location: `src/buttons/`
- Contains: `registerLassoButton` (constants `BUTTON_TYPE_LASSO_TOOLBAR=2`, `LASSO_ALIGNMENT_BUTTON_ID=201`, `EDIT_DATA_TYPES_ALL=[0,1,2,3,4,5]`, `showType:1`), `resolveIconUri`, `safeSetButtonState`
- Depends on: `sn-plugin-lib`-shaped `PluginManagerLike`, `Logger`, `i18n.localizedLassoButtonName`
- Used by: `index.js`

**Handler:**
- Purpose: Orchestrate one full popup interaction from tap to teardown
- Location: `src/handlers/onLassoMain.ts`
- Contains: reentrancy gate, one-shot reads (lasso rect + page size), closure-local `cfg`/`anchorBox`, callback table, shared `performApply(alsoReAnchor)`, `teardown` (releases guard, hides popup, `setLassoBoxState(2)`, `closePluginView`)
- Depends on: `core/anchor`, `core/reentrancyGuard`, `storage/anchorStorage`, `sdk/*`, `ui/popupController`, `ui/AlignmentPopup` (callbacks type only)
- Used by: `index.js` `onButtonPress`

**Core (pure):**
- Purpose: Math and the reentrancy primitive
- Location: `src/core/`
- Contains: `Rect`, `ReferencePoint`, `AlignmentConfig`, `pointOnBox`, `computeAnchorShift`, `translateRect`, type guards (`anchor.ts`); `tryAcquire`/`release`/`isBusy` (`reentrancyGuard.ts`)
- Depends on: nothing (pure TS)
- Used by: handler, storage, UI

**Storage:**
- Purpose: Persist/restore the `{config, anchorBox}` envelope
- Location: `src/storage/anchorStorage.ts`
- Contains: v3 envelope schema, `parseEnvelope` (rejects wrong version, validates with core guards, returns `DEFAULT_ANCHOR_STATE` on any mismatch), `serialiseEnvelope`, `buildStorage`, `createMemoryAnchorStorage` (default), `createKvBackedAnchorStorage` (future-proof, unused at runtime), `getDefaultAnchorStorage` (module-cached singleton)
- Depends on: `core/anchor` (guards, defaults, types), `sdk/types` (`Logger`)
- Used by: `index.js`, handler

**SDK helpers:**
- Purpose: Narrow, structurally-typed wrappers over `sn-plugin-lib` quirks
- Location: `src/sdk/`
- Contains: `APIResponse<T>` + `Logger` types (`types.ts`); `resolvePageSize` + `fitsInPage` + `DEFAULT_PAGE_WIDTH=1920`/`DEFAULT_PAGE_HEIGHT=2560` (`pageSize.ts`); `unwrap` (`unwrap.ts`); `safeClosePluginView` (`closeView.ts`)
- Depends on: nothing internal (structural types only)
- Used by: handler, button registration

**UI:**
- Purpose: Render the popup and broker state from the handler
- Location: `src/ui/`
- Contains: `PopupRoot.tsx` (null-safe shell, mounts `AlignmentPopup`), `AlignmentPopup.tsx` (header, two-picker layout when anchored / minimal layout when not, axis toggles, offset steppers, warning slot, action row), `ReferencePicker.tsx` (3×3 grid: 8 chevrons + center dot), `popupController.ts` (state bus with replay-on-subscribe), `styles.ts`
- Depends on: `core/anchor` (types), `i18n/i18n` (`t`)
- Used by: `App.tsx` → React; handler (writes via `showPopup`/`updatePopup`/`hidePopup`)

**i18n:**
- Purpose: Localised UI strings + firmware-visible names
- Location: `src/i18n/i18n.ts`
- Contains: `StringId` union, `STRINGS` per-locale table (en/zh_CN/zh_TW/ja/th/nl/de), `detectLocale`, `t`, `localizedLassoButtonName` + `localizedPluginName` (JSON-encoded for the firmware)
- Depends on: nothing
- Used by: UI components, `registerLassoButton`

## Data Flow

### Primary Apply Path

1. User draws a lasso, taps the Alignment button on the lasso toolbar → firmware fires button event (`registerLassoButton.ts:46-53`).
2. `index.js` `onButtonPress` checks `event.id === LASSO_ALIGNMENT_BUTTON_ID` (201) and invokes `onLassoMain(lassoDeps)` (`index.js:49-55`).
3. Handler `tryAcquire()`s the reentrancy guard; if busy, closes the overlay and returns `'busy'` (`src/handlers/onLassoMain.ts:103-107`).
4. Handler `storage.load()`s the v3 envelope into `cfg` + `anchorBox` (`onLassoMain.ts:111-131`).
5. One-shot reads cached for the popup's lifetime: `tryGetLassoRect` and `resolvePageSize` (`onLassoMain.ts:121-122`). `resolvePageSize` calls `comm.getCurrentFilePath` + `comm.getCurrentPageNum` in parallel, then `fileApi.getPageSize`; falls back to 1920×2560 on any failure (`src/sdk/pageSize.ts:23-53`).
6. `safeSetLassoBoxState(1)` hides the lasso menu while keeping the selection alive for the later resize (`onLassoMain.ts:126`).
7. Handler computes initial `outOfBounds` via `wouldExitPage` (which calls `computeAnchorShift` + `translateRect` + `fitsInPage`) and pushes state to the bus via `showPopup(state, callbacks)` (`onLassoMain.ts:254-262`).
8. `popupController.showPopup` calls every listener; `PopupRoot.tsx` (subscribed via `useEffect`) re-renders and mounts `AlignmentPopup` (`src/ui/popupController.ts:40-42`, `src/ui/PopupRoot.tsx:14-47`).
9. User adjusts picker / toggle / stepper → each press hits its callback → handler's `patchConfig` mutates closure-local `cfg`, calls `storage.setConfig(cfg)`, and `refreshUi()` pushes the new `{config, hasAnchor, noLasso, outOfBounds}` via `updatePopup` (`onLassoMain.ts:142-218`).
10. User taps **Apply Alignment** → `callbacks.onApply` calls `performApply(false)` (`onLassoMain.ts:237-241`).
11. `performApply` re-computes `{dx, dy} = computeAnchorShift(anchorBox, lasso, cfg)`, builds `newRect = translateRect(lasso, dx, dy)`, re-checks `fitsInPage(newRect, page)` (defensive even though the button is disabled when out-of-bounds), and calls `comm.resizeLassoRect(newRect)` (`onLassoMain.ts:156-186`).
12. On success — or on the `(dx,dy)===(0,0)` no-op branch — `teardown(deps)` runs in the `finally` (`onLassoMain.ts:193-198`).
13. `teardown` synchronously `release()`s the reentrancy guard (sync-first, before any await), `hidePopup()`s the bus, awaits `setLassoBoxState(2)` (commits the resize and releases the gesture chain), then awaits `safeClosePluginView` (`onLassoMain.ts:91-100`).

### Set Anchor flow

1. User taps **Set Anchor** (no anchor yet) or **Set New Anchor** (anchor exists) → `callbacks.onSetAnchor` fires (`onLassoMain.ts:219-236`).
2. Handler calls `storage.setAnchorBox(lasso)` — `cfg` is left untouched (orthogonal).
3. `teardown(deps)` runs in `finally`.

### Apply & Re-anchor flow

1. User taps **Apply & Re-anchor** → `callbacks.onApplyAndReAnchor` calls `performApply(true)` (`onLassoMain.ts:242-246`).
2. Same as Primary Apply Path through step 11.
3. On a successful resize, `storage.setAnchorBox(newRect)` saves the translated rect as the new anchor for chaining (`onLassoMain.ts:187-190`).
4. **Re-anchor is skipped** if the resize failed or the rect didn't fit (early `return` before the `setAnchorBox` call) so a failed step can't silently corrupt the anchor.
5. `teardown(deps)` runs in `finally`.

### Settings-only flow (no firmware touch)

1. Picker pick / toggle / stepper press → corresponding `onSet*` / `onToggle*` callback.
2. `patchConfig({...patch})` mutates `cfg`, awaits `storage.setConfig(cfg)`, calls `refreshUi()`.
3. Popup stays open. No reentrancy guard release, no firmware call — these callbacks are explicitly safe outside the guard.

**State Management:**
- Handler closure holds the live `cfg` + `anchorBox` for the popup's lifetime — a single source of truth that's mirrored to storage on every settings change.
- `popupController.ts` holds the most recent `PopupState` (`{active, config, hasAnchor, outOfBounds, noLasso, callbacks}`) in a module variable; React reads it through `subscribe` (which replays the current state immediately).
- Storage holds the persisted envelope across taps.

## Key Abstractions

**`Rect`:**
- Purpose: A page-space bounding box in firmware coords (`{left, top, right, bottom}`)
- Examples: `src/core/anchor.ts` line 19
- Used by: every layer

**`ReferencePoint` (9 values):**
- Purpose: One of the 8 sides/corners or the center of a rect
- Examples: `src/core/anchor.ts` lines 21-30; rendered by `src/ui/ReferencePicker.tsx`
- Pattern: Tagged string union with a corresponding `ALL_REFERENCE_POINTS` tuple, `isReferencePoint` guard, and a `Record<Exclude<ReferencePoint,'center'>, Spec>` table in the picker

**`AlignmentConfig`:**
- Purpose: The user's choice — anchor reference point, target reference point, two axis toggles, two signed offsets
- Examples: `src/core/anchor.ts` lines 44-51; default at lines 53-60
- Pattern: Readonly POJO; mutated only by spreading (`{...cfg, ...patch}`)

**`AnchorState` / `AnchorEnvelope`:**
- Purpose: The persisted shape — `{config, anchorBox}` (and a `version: 3` discriminator on the envelope)
- Examples: `src/storage/anchorStorage.ts` lines 30-39
- Pattern: Schema-versioned envelope; any non-`3` version is treated as absent and returns `DEFAULT_ANCHOR_STATE`

**`APIResponse<T>` (structural):**
- Purpose: Match `sn-plugin-lib`'s `{success, result?, error?}` shape without importing the lib at module-load time
- Examples: `src/sdk/types.ts` lines 6-10
- Pattern: Structural type — every firmware call is shaped this way; `unwrap` throws on `!success`

**Reentrancy guard (module-level flag):**
- Purpose: Reject overlapping presses on a single-threaded JS engine where awaits can be suspended by firmware events
- Examples: `src/core/reentrancyGuard.ts`
- Pattern: Sync `tryAcquire` / `release`; release MUST happen before any await in the failure-recovery path (sync-first invariant)

**`PopupState` + state bus:**
- Purpose: Decouple the handler from React
- Examples: `src/ui/popupController.ts` lines 12-19
- Pattern: Singleton `currentState`, `Set<Listener>`, `subscribe` replays current state on attach

**Closure-based callbacks (`AlignmentPopupCallbacks`):**
- Purpose: Capture handler-local `cfg` / `anchorBox` / `lasso` / `page` in the callback table so every press has a consistent view of state
- Examples: `src/handlers/onLassoMain.ts` lines 200-252

## Entry Points

**`index.js` (firmware boot):**
- Location: `index.js`
- Triggers: `AppRegistry.registerComponent` (React UI bring-up), `PluginManager.init()` (firmware bring-up), top-level `registerLassoButton(...)` call
- Responsibilities: Construct logger (`console.log`-only — the firmware drops `console.warn`/`error` from logcat), build the `lassoDeps` envelope, define the single `onButtonPress` router that dispatches `event.id === 201` to `onLassoMain`

**Button press (firmware → handler):**
- Location: `index.js:49-55`, registered via `src/buttons/registerLassoButton.ts`
- Triggers: User taps the lasso-toolbar Alignment button (id 201)
- Responsibilities: Catch any `onLassoMain` rejection and log it; never throw back into the firmware

**React mount (firmware → UI):**
- Location: `App.tsx` → `src/ui/PopupRoot.tsx`
- Triggers: Firmware mounts the React tree for the registered component
- Responsibilities: Always render visible UI (never `null`); subscribe to the popup bus and re-render on every state push

## Architectural Constraints

- **Threading:** Single-threaded JS engine (JSC/Hermes); all firmware APIs are async via `Promise<APIResponse<T>>`. The reentrancy guard exists because firmware events (`state:stop`) can suspend mid-await.
- **Sync-first guard release:** `release()` in `teardown` MUST run before any `await`. Clearing the flag after `await closePluginView()` has been observed to leave it stuck `true` on a real device, rejecting every future press (see comment in `src/core/reentrancyGuard.ts` and the `teardown` order in `src/handlers/onLassoMain.ts:91-100`).
- **Global state:**
  - Module-level reentrancy `busy` flag (`src/core/reentrancyGuard.ts`).
  - Module-level `currentState` + `listeners` in `src/ui/popupController.ts` (singleton bus).
  - Module-level `cachedDefault` `AnchorStorage` in `src/storage/anchorStorage.ts` (in-memory singleton).
  - Module-level `LOCALE` in `src/i18n/i18n.ts` (frozen at module load).
- **`config` ⟂ `anchorBox`:** Load-bearing invariant. The handler never writes both at once except through Apply & Re-anchor's deliberate `setAnchorBox(newRect)`. Anything that couples them is wrong.
- **`PopupRoot` never returns `null`:** Returning `null` caused the firmware to dismiss the overlay before the next state update could re-render. The fallback branch renders a header + close button.
- **Subscribe replays state:** `popupController.subscribe(listener)` calls `listener(currentState)` synchronously so a `show()` that fired before React mounted isn't lost.
- **Settings auto-persist:** Picker / toggle / offset callbacks call `storage.setConfig` immediately; only Apply / Apply & Re-anchor / Set Anchor / Close tear down the popup.
- **Page-bounds checked before Apply:** `wouldExitPage(cfg, anchorBox, lasso, page)` is computed in the handler on every state push; the popup uses the `outOfBounds` flag to disable the Apply buttons and render the inline warning. `performApply` re-checks defensively before calling `resizeLassoRect`.
- **`editDataTypes: [0,1,2,3,4,5]` is mandatory.** Omitting `5` (geometry) makes the firmware grey the button for any selection containing a shape.
- **Firmware filters non-`console.log` levels:** The logger in `index.js` routes `warn`/`error` through `console.log` with explicit prefixes.
- **Lasso box state sequencing:** `setLassoBoxState(1)` (Hide) on entry — keeps the selection alive for the later `resizeLassoRect`. `setLassoBoxState(2)` (Release) on every teardown path — commits any pending resize and releases the host's gesture chain so pen taps continue landing on the page.

## Anti-Patterns

### Releasing the reentrancy guard after an `await`

**What happens:** Code like `await closePluginView(); release();` leaves the `busy` flag stuck `true` if the firmware suspends mid-await (it does — `state:stop` is documented to fire during teardown).
**Why it's wrong:** Every subsequent button press is rejected as "already running" until the host process restarts.
**Do this instead:** Call `release()` synchronously at the very top of `teardown`, before any `await` (see `src/handlers/onLassoMain.ts:91-100`).

### Returning `null` from `PopupRoot` while inactive

**What happens:** Rendering `null` causes the firmware overlay to dismiss before the next state update can re-render.
**Why it's wrong:** The popup never appears on the next press.
**Do this instead:** Render a safe header + close button when `state.callbacks` is null (see `src/ui/PopupRoot.tsx:18-37`; precedent: `sn-dictionary`'s `DefinitionPopup`).

### Coupling `config` and `anchorBox` writes

**What happens:** A "convenience" path that updates both in one call (e.g. "clear anchor when picker changes").
**Why it's wrong:** Breaks the orthogonality invariant — users expect to tweak reference points without losing their anchor and vice versa.
**Do this instead:** Use `storage.setConfig(...)` and `storage.setAnchorBox(...)` separately. `Apply & Re-anchor` is the only place that legitimately writes both kinds of state, and it does so as two separate, sequenced calls.

### Re-reading the lasso rect or page size from inside a callback

**What happens:** `getLassoRect` / `getCurrentFilePath` / `getCurrentPageNum` / `getPageSize` called per interaction.
**Why it's wrong:** Wastes battery and adds latency on E-Ink, and neither value can change while the popup is showing (lasso menu hidden, no nav).
**Do this instead:** Capture both at popup open; every callback reads the closure-local cached values (see `onLassoMain.ts:121-122`).

### Re-anchoring after a failed resize

**What happens:** Unconditional `setAnchorBox(newRect)` regardless of `resizeLassoRect` success.
**Why it's wrong:** Silently corrupts the anchor — the user thinks they're chaining off a successful step.
**Do this instead:** The `performApply(alsoReAnchor)` early-returns before the re-anchor block if `resizeLassoRect` returned `success:false` (see `onLassoMain.ts:181-190`).

## Error Handling

**Strategy:** Best-effort with structured logging. Firmware calls are wrapped so a failure logs and the user-facing state still settles (popup closes, button stays usable).

**Patterns:**
- `APIResponse<T>` failures are detected by checking `res?.success` and reading `res?.error?.message ?? 'unknown'`; `unwrap` throws on failure for read-side flows that need a value (`src/sdk/unwrap.ts`).
- `safeSetLassoBoxState` / `safeClosePluginView` swallow throws and log them — these are teardown-side calls where re-throwing would strand state.
- Every `performApply` / `onSetAnchor` body is wrapped in `try/catch` with the `teardown(deps)` call in `finally` so the popup and reentrancy guard always clear.
- Settings-only callbacks (`patchConfig`) use a `.catch(onPatchError(label))` adapter — the storage write rarely fails (in-memory) but logs and continues if it does.
- The top-level `index.js` `onButtonPress` catches any `onLassoMain` rejection so it never reaches the firmware.
- `resolvePageSize` never throws — failures fall through to the `1920×2560` fallback.
- Storage `parseEnvelope` silently returns `DEFAULT_ANCHOR_STATE` on any JSON parse error, missing version, or guard failure (forward-compatibility for future schema bumps).

## Cross-Cutting Concerns

**Logging:** Injected `Logger` (`src/sdk/types.ts`) with `log`/`warn`/`error`. Concrete implementation in `index.js` routes everything through `console.log` with `[WARN]` / `[ERROR]` prefixes since the firmware filters `console.warn` and `console.error`. Every log line is namespaced (`[align:lasso]`, `[align:pageSize]`, `[align:button]`, `[align:storage]`).

**Validation:** Runtime type guards in `src/core/anchor.ts` (`isAnchorBox`, `isReferencePoint`, `isAlignmentConfig`) gate any externally-sourced data (currently only storage replays). Strict TypeScript (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) catches the rest at compile time.

**Authentication:** None — the plugin runs in-process inside the firmware.

**Localisation:** All UI strings come from `src/i18n/i18n.ts` via `t(id)`. The firmware-visible button/plugin names are JSON-encoded `{locale: name}` strings (firmware contract).

---

*Architecture analysis: 2026-05-17*
