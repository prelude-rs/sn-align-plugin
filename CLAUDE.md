# SnAlign — Supernote alignment plugin

A React Native plugin for the Supernote E-Ink tablet (`sn-plugin-lib`). The user picks a reference point on a saved "anchor" box and a reference point on the current lasso selection; the plugin translates the lasso so the two points coincide (with optional per-axis offsets and per-axis align toggles), as long as the result fits inside the page.

## Model

```ts
type ReferencePoint =
  | 'top-left' | 'top' | 'top-right'
  | 'left'     | 'center' | 'right'
  | 'bottom-left' | 'bottom' | 'bottom-right';

type AlignmentConfig = {
  anchorRef: ReferencePoint;   // which point on the anchor box
  targetRef: ReferencePoint;   // which point on the lasso box
  alignX: boolean;             // false = freeze X axis (no horizontal movement)
  alignY: boolean;             // false = freeze Y axis (no vertical movement)
  offsetX: number;             // firmware px; shifts the anchor point on X before the snap (signed; negative shifts left)
  offsetY: number;             // firmware px; same for Y (negative shifts up)
};

type AnchorState = {config: AlignmentConfig; anchorBox: Rect | null};
```

`computeAnchorShift(anchorBox, currentBbox, config) → {dx, dy}`. Both fields are persisted as one envelope but are orthogonal — changing config doesn't disturb the anchor and vice versa.

## UI surface

A single lasso-toolbar button opens a popup containing everything.

| Toolbar | Type | Button | id | showType | Behaviour |
|---|---|---|---|---|---|
| Lasso (NOTE) | 2 | Alignment | 201 | 1 (popup) | First open with no anchor: minimal layout — header + status + primary **Set Anchor** button only. With anchor saved: top row holds status + **Set New Anchor** button; below sit the two reference pickers, axis toggles, offset steppers, warning slot, and a bottom action row with **Apply Alignment** (primary) + **Apply & Re-anchor** (secondary; saves the translated rect as the new anchor for chaining). Apply-family buttons grey out together when the resulting rect would exit the page or no axis is enabled. |

There is no page-toolbar button. The 9-cell pickers (8 sides/corners + center) live side-by-side in the popup. `editDataTypes: [0,1,2,3,4,5]` covers strokes, titles, images, text-boxes, links, and geometry — without `5` the firmware greys the button for any selection containing a shape.

## Repo layout

```
src/
  core/
    anchor.ts             ReferencePoint, AlignmentConfig, pointOnBox, computeAnchorShift, translateRect, guards
    reentrancyGuard.ts    module-level busy flag (release SYNC-FIRST before any await)
  storage/
    anchorStorage.ts      v3 envelope, setConfig / setAnchorBox helpers
  handlers/
    onLassoMain.ts        single popup-driven handler — opens popup, wires callbacks, applies on action
  buttons/
    buttonCommon.ts       resolveIconUri, safeSetButtonState, shared types
    registerLassoButton.ts BUTTON_TYPE_LASSO_TOOLBAR=2, single id 201, showType:1
  sdk/
    pageSize.ts           resolvePageSize via getCurrentFilePath + getCurrentPageNum + getPageSize, fallback to 1920×2560
    types.ts              APIResponse, Logger
    closeView.ts          safeClosePluginView
    unwrap.ts             throw-on-failed APIResponse helper
  ui/
    ReferencePicker.tsx   reusable 9-cell grid (8 chevrons + center dot)
    AlignmentPopup.tsx    full popup body: two pickers, axis toggles, offset steppers, action button
    PopupRoot.tsx         null-safe shell that mounts AlignmentPopup
    popupController.ts    state bus with replay-on-subscribe + updatePopup patch helper
    styles.ts
  i18n/i18n.ts            StringIds + JSON-encoded {locale: name} for the firmware
__tests__/                Jest, 84 tests
assets/
  icon.png                lasso button icon
  icon-anchored.png       (still bundled; available for future "saved" state visual)
index.js                  AppRegistry, deps wiring, single button registration
PluginConfig.json         pluginID `snplgalignv1`, pluginKey `SnAlign`, iconPath
buildPlugin.sh            patched to copy sibling PNGs adjacent to iconPath
.github/workflows/
  ci.yml                  PR gates on dev|main: lint, format (prettier), typecheck (tsc), test, build-check (no-op gate that needs the four)
  release.yml             manual workflow_dispatch — tag-only (no push to main); reads version from package.json
```

## Commands

```sh
npx eslint src/ App.tsx index.js __tests__/                                          # lint
npx prettier --check "src/**/*.{ts,tsx}" "App.tsx" "index.js" "__tests__/**/*.ts"   # format
npx tsc --noEmit                                                                     # typecheck (strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes)
npm test                                                                             # Jest, 84 tests
npm run build                                                                        # rm -rf build && bash buildPlugin.sh → build/outputs/SnAlign.snplg
gh workflow run release.yml --ref main                                               # tags v<package.json version>
gh workflow run release.yml --ref main -f version=X.Y.Z                              # one-off override
```

## Conventions (project-specific)

For cross-cutting Supernote firmware quirks (sync-first reentrancy release, console.log-only logger, modifyButtonRes unavailability, JSON locale maps, editDataTypes 0-5 filter, AsyncStorage failure mode, icon-sibling `buildPlugin.sh` patch, etc.) see the **`sn-plugin` skill**. The conventions below are SnAlign-specific decisions.

- **PopupRoot never returns null.** Returning null caused the firmware to dismiss the overlay before our state update could re-render. Render a safe header + close button when `state.callbacks` is null.
- **Subscribe replays state.** `popupController.subscribe(listener)` calls `listener(currentState)` immediately so a `show()` that fired before React mount isn't lost.
- **Settings changes auto-persist.** Picker / toggle / offset callbacks save through `storage.setConfig` immediately; only Apply / Apply & Re-anchor / Set Anchor / Close tear down the popup.
- **Page bounds checked before Apply.** `resolvePageSize` queries firmware via `PluginCommAPI.getCurrentFilePath` + `getCurrentPageNum` + `PluginFileAPI.getPageSize`, falling back to 1920×2560 if any step fails. The popup pre-computes whether the next Apply would exit the page; `outOfBounds` flag drives the disabled state and the inline warning.
- **One global button listener** in `index.js`, routes by `event.id` (only id 201 today).
- **`config` and `anchorBox` are orthogonal.** Changing config doesn't disturb the anchor and vice versa. This is load-bearing — any "fix" that couples them is wrong.
- **`performApply(alsoReAnchor)` shared between Apply and Apply & Re-anchor.** The re-anchor variant calls `storage.setAnchorBox(newRect)` after successful resize. Skipped on resize failure / out-of-bounds so chaining off a failed step can't silently corrupt the anchor.

## Branch / PR workflow

- Project skill at `.claude/skills/git/SKILL.md` enforces the conventions: branches `<type>/<user>/<short-desc>`, target `dev` (not `main`) for normal work, run all 5 local checks before opening PR, branch protection on `dev` requires `build-check` to pass.
- `dev → main` is the release-train path; `main` is what gets tagged.

## Release flow

`release.yml` is `workflow_dispatch` only and is **tag-only** (does not push commits to main):

1. lint + typecheck + test gate
2. resolve version: workflow input override OR `package.json` on main
3. fail if `vX.Y.Z` tag already exists
4. build `.snplg`
5. push annotated `vX.Y.Z` tag pointing at main's tip
6. generate notes (commits since previous v* tag, contributors with @-handles, excluding Copilot + bot itself)
7. publish GitHub Release with notes + `.snplg`

To bump version: open a normal dev → main PR that updates `package.json`, then run the workflow.

## Verified on

- Supernote A5X2 (1920×2560 Android, 21632×16224 EMR coords)
- React Native 0.79.2, sn-plugin-lib ^0.1.19
- node 20 in CI; tested locally with the device-bundled JSC/Hermes runtime

<!-- GSD:project-start source:PROJECT.md -->
## Project

**SnAlign**

A React Native plugin for the Supernote E-Ink tablet (`sn-plugin-lib`). The user picks a reference point on a saved "anchor" rectangle and a reference point on the current lasso selection; SnAlign translates the lasso so the two points coincide, with optional per-axis offsets and per-axis align toggles, as long as the result fits inside the page. Target users: Supernote owners who want precise spatial alignment between handwriting / shapes / images / text-boxes on a note page.

**Core Value:** Translate a lasso selection so a chosen reference point lands on a chosen reference point of a saved anchor — accurately, in one tap, on the device.

### Constraints

- **Tech stack**: React Native 0.79.2 (locked by PluginHost), TypeScript strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`, Node 20 in CI. Any deviation breaks the runtime contract.
- **SDK dependency**: `sn-plugin-lib` is the sole bridge to firmware. Upgrades in this dependency are the load-bearing event of this milestone.
- **Storage**: In-memory only out of the box. If AsyncStorage or another native KV becomes available via the lib upgrade or `node_change/` bundling, that opens up persistent state. Otherwise, in-memory remains the contract.
- **Hardware verification**: A5X2 is the only device we test on. Logic must degrade gracefully on other firmware versions / page sizes (`resolvePageSize` fallback to 1920×2560 is the safety net).
- **Branch protection**: All changes enter `dev` via PR. `dev → main` is the release-train path. `main` is what gets tagged.
- **CI gates**: lint, prettier, typecheck, jest, build-check must all pass before merge. Branch protection on `dev` requires `build-check`.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript 5.9 (`^5.9.3`) — all source under `src/` (`.ts` + `.tsx`).
- JavaScript — single entry file `index.js` (CommonJS-ish, ESM-style imports via Babel preset).
- `noUncheckedIndexedAccess: true` — array/object index access returns `T | undefined`.
- `noImplicitOverride: true` — `override` keyword required.
- `noUnusedLocals: true`, `noUnusedParameters: true` — dead-code guard.
- `exactOptionalPropertyTypes: true` — `{ x?: T }` is distinct from `{ x: T | undefined }`.
## Runtime
- The plugin runs inside the Supernote host process; the JS context survives across lasso taps and note swaps within a session.
- No `AsyncStorage` native module is available in the plugin host — see `src/storage/anchorStorage.ts` (storage is in-memory only via `createMemoryAnchorStorage`).
- npm (lockfile `package-lock.json` present, 462 KB).
- No yarn / pnpm artifacts.
## Frameworks
- React 19.0.0 — UI tree mounted via `AppRegistry.registerComponent` in `index.js`.
- React Native 0.79.2 — JSX components (`View`, `Text`, `Pressable`, `StyleSheet`). No native modules outside `sn-plugin-lib`.
- sn-plugin-lib `^0.1.19` (resolved 0.1.34 in `node_modules`) — Supernote plugin framework providing `PluginManager`, `PluginCommAPI`, `PluginFileAPI`. See `INTEGRATIONS.md` for method-level usage.
- Jest `^29.6.3` with preset `react-native` (`jest.config.js`).
- `react-test-renderer` 19.0.0 (declared but the existing suite is pure-logic — no component snapshots in `__tests__/`).
- 7 test files, 84 tests covering `core/anchor`, `core/reentrancyGuard`, `storage/anchorStorage`, `sdk/pageSize`, `i18n/i18n`, `ui/popupController`, `handlers/onLassoMain`.
- `@babel/core` `^7.25.2`, `@babel/preset-env` `^7.25.3`, `@babel/runtime` `^7.25.0`.
- `@react-native/babel-preset` 0.79.2 (`babel.config.js`).
- `@react-native/metro-config` 0.79.2 (`metro.config.js` — uses defaults via `mergeConfig`).
- `@react-native/eslint-config` 0.79.2 (`.eslintrc.js` extends `@react-native`, root config).
- `@react-native/typescript-config` 0.79.2 (base for `tsconfig.json`).
- `@react-native-community/cli` 18.0.0 + platform-android 18.0.0 (dev convenience; the plugin doesn't run via Android Studio).
- Prettier `^3.8.3` (`.prettierrc.js`: `arrowParens: 'avoid'`, `bracketSameLine: true`, `bracketSpacing: false`, `singleQuote: true`, `trailingComma: 'all'`, `printWidth: 120`).
## Key Dependencies
- `sn-plugin-lib` ^0.1.19 — only native bridge to the Supernote firmware. All UI affordances and lasso operations are routed through it.
- `react` 19.0.0 / `react-native` 0.79.2 — the popup UI (`src/ui/`) is plain RN; no animation libs, no gesture handler, no navigation.
- No AsyncStorage, no MMKV, no SQLite, no realm. Persistence is in-memory only (`src/storage/anchorStorage.ts`). `createKvBackedAnchorStorage` is exported but currently unused — kept for any future firmware that bundles a real KV.
- No HTTP client (no `fetch` / `axios` usage in `src/`).
- No analytics, telemetry, error tracking.
- No i18n library — `src/i18n/i18n.ts` is a hand-rolled `StringId → locale → string` map for 7 locales (en, zh_CN, zh_TW, ja, th, nl, de).
## Configuration
- `tsconfig.json` (project-root) — see strict flags above.
- `.eslintrc.js` — `{root: true, extends: '@react-native'}`.
- `.prettierrc.js` — see formatting settings above.
- `babel.config.js`, `metro.config.js` — both minimal, defaults from RN preset.
- `app.json` — `{"name": "SnAlign", "displayName": "SnAlign"}`.
- `PluginConfig.json` — declares `pluginID: snplgalignv1`, `pluginKey: SnAlign`, `versionName: 0.3.0`, `versionCode: 300`, `iconPath: assets/icon.png`, `jsMainPath: index`. The `name` field is a JSON-encoded `{locale: string}` map consumed verbatim by the firmware.
- None. The plugin has no `.env` file and reads no `process.env` keys at runtime.
- CI uses only `${{ secrets.GITHUB_TOKEN }}` (provided by GitHub Actions) and the workflow-input `version` override in `release.yml`.
## Platform Requirements
- Node `>=18` (`package.json` engines).
- `jq` or `python3` available on PATH for `buildPlugin.sh` JSON manipulation.
- bash for the build script (`buildPlugin.sh`); a PowerShell sibling `buildPlugin.ps1` exists but is not the CI path.
- Supernote A5X2 (Android-based, 1920×2560 screen, 21632×16224 EMR coords) — explicitly verified.
- `DEFAULT_PAGE_WIDTH = 1920` / `DEFAULT_PAGE_HEIGHT = 2560` hardcoded in `src/sdk/pageSize.ts` as the fallback when firmware queries fail.
## Build Pipeline
- Reads `package.json` for name/desc/version (`jq` or `python3` fallback).
- Generates a build-time `PluginConfig.json` under `build/` with `iconPath` rewritten to `/<filename>`.
- Copies the icon referenced by `iconPath` and **all sibling `*.png` files in the icon directory** into the build (project-specific patch — supports `assets/icon-anchored.png` shipping alongside `assets/icon.png` for a future "saved" visual).
- Bundles the Metro JS bundle and the assets into the `.snplg` archive at `build/outputs/SnAlign.snplg`.
- Trigger: `workflow_dispatch` only (manual, tag-only — no commit pushes).
- Re-runs lint + typecheck + jest as gates (no `--coverage` here).
- Resolves version: workflow input override (validated `^[0-9]+\.[0-9]+\.[0-9]+$`) or `package.json` version on `main`.
- Fails if `vX.Y.Z` tag already exists.
- Runs `npm run build` to produce `build/outputs/SnAlign.snplg`.
- Pushes an annotated `vX.Y.Z` tag pointing at `main`'s tip (via `github-actions[bot]`).
- Generates release notes from `git log <prev>..<new>` (excludes `chore(release):` and Copilot/bot commits, maps GitHub noreply emails to `@handles`).
- Publishes the GitHub Release via `softprops/action-gh-release@v3` with the `.snplg` attached.
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- Source modules use `camelCase.ts` (`anchorStorage.ts`, `pageSize.ts`, `onLassoMain.ts`, `popupController.ts`, `reentrancyGuard.ts`).
- React components use `PascalCase.tsx` (`AlignmentPopup.tsx`, `PopupRoot.tsx`, `ReferencePicker.tsx`).
- Test files mirror the source filename: `__tests__/<sourceName>.test.ts` (e.g. `anchorStorage.ts` ↔ `__tests__/anchorStorage.test.ts`).
- Constant-only style helper: `styles.ts` (lowercase — exports `styles` object).
- `camelCase` segments under `src/` grouped by concern: `core/`, `storage/`, `handlers/`, `buttons/`, `sdk/`, `ui/`, `i18n/`.
- `camelCase` for everything: `computeAnchorShift`, `pointOnBox`, `translateRect`, `resolvePageSize`, `safeClosePluginView`, `safeSetButtonState`, `tryAcquire`, `release`.
- Arrow-function `const` declarations are the default style for module-scope helpers: see `pointOnBox`, `translateRect`, `tryAcquire` in `src/core/anchor.ts` and `src/core/reentrancyGuard.ts`. `async function` declarations are not used in this codebase.
- Type-guards use `is<TypeName>` prefix and explicit `v is T` predicate return — e.g. `isAnchorBox`, `isReferencePoint`, `isAlignmentConfig` in `src/core/anchor.ts`.
- "Safe" wrappers around throwing firmware calls are prefixed `safe`: `safeClosePluginView` (`src/sdk/closeView.ts`), `safeSetButtonState` (`src/buttons/buttonCommon.ts`), `safeSetLassoBoxState` (`src/handlers/onLassoMain.ts`).
- React components inside a file are declared as named `React.FC<Props>` arrow consts: `Toggle`, `OffsetStepper`, `Header`, `AnchorTopRow`, `MinimalBody`, `AlignmentPopup` in `src/ui/AlignmentPopup.tsx`. `React.memo` wrappers get an explicit `.displayName` (see `Glyph` in `src/ui/ReferencePicker.tsx:112-125`).
- `camelCase` for locals.
- `UPPER_SNAKE_CASE` for module-level constants: `LASSO_BOX_STATE_HIDDEN`, `LASSO_BOX_STATE_RELEASED`, `BUTTON_TYPE_LASSO_TOOLBAR`, `APP_TYPE_NOTE`, `EDIT_DATA_TYPES_ALL`, `LASSO_ALIGNMENT_BUTTON_ID`, `DEFAULT_PAGE_WIDTH`, `OFFSET_STEP`, `FALLBACK_LOCALE`, `ICON_FILENAME`, `ANCHOR_STORAGE_KEY`.
- Defaults: `DEFAULT_<NOUN>` pattern (`DEFAULT_ALIGNMENT_CONFIG`, `DEFAULT_ANCHOR_STATE`, `DEFAULT_PAGE_WIDTH`).
- All-cap arrays/records that drive enumerations are declared `readonly` / `as const` (`ALL_REFERENCE_POINTS` in `src/core/anchor.ts:32-42`).
- `PascalCase` exclusively: `Rect`, `ReferencePoint`, `AlignmentConfig`, `AnchorState`, `AnchorEnvelope`, `PageSize`, `APIResponse<T>`, `Logger`, `LassoDeps`, `LassoOutcome`, `PopupState`, `AlignmentPopupCallbacks`.
- Suffix `-Like` for structural-typing shims that match a real SDK class without importing it: `PluginManagerLike`, `LassoCommAPILike`, `PageSizeCommAPI`, `PageSizeFileAPI`, `ClosablePluginView`, `KvBackend` — see `src/buttons/buttonCommon.ts`, `src/handlers/onLassoMain.ts`, `src/sdk/closeView.ts`. Rationale (called out in `src/sdk/types.ts:1-4`): keep the surface narrow so the real `sn-plugin-lib` classes match by shape, no module-load-time import dependency.
- `Deps` suffix for the dependency-injection bag of a handler: `LassoDeps`, `RegisterLassoDeps`.
- Discriminated string literal unions for outcomes: `LassoOutcome = 'opened' | 'busy' | 'failed'` (`src/handlers/onLassoMain.ts:56`).
- `readonly` on every field of public state envelopes (`AlignmentConfig`, `AnchorState`, `AnchorEnvelope`).
- `__testing__` namespace (e.g. `popupController.ts:65-70`, `i18n.ts:295-300`) bundles internals exposed only for tests.
- One-off test reset escape hatches use `__<verb>...ForTest` (e.g. `__resetDefaultAnchorStorageForTest` in `src/storage/anchorStorage.ts:150`).
## Code Style
- `arrowParens: 'avoid'`
- `bracketSameLine: true`
- `bracketSpacing: false` (no space inside `{}` — destructure as `{deps}` not `{ deps }`)
- `singleQuote: true`
- `trailingComma: 'all'`
- `printWidth: 120`
- Extends `@react-native` only (resolved via `node_modules/@react-native/eslint-config`). That config sets up `eslint-comments`, `react`, `react-hooks`, `react-native`, `@react-native`, `jest`, plus `@typescript-eslint` for `*.ts`/`*.tsx`.
- Notable rules inherited from `@react-native`:
- Extends `@react-native/typescript-config/tsconfig.json` (strict mode).
- Plus the SnAlign-specific overlay:
## Import Organization
- `import type {…}` is used aggressively whenever a symbol is only referenced in type position (see `src/handlers/onLassoMain.ts:31-36`, `src/storage/anchorStorage.ts:26`). Mixed imports stay on one line: `import {computeAnchorShift, translateRect, type AlignmentConfig, type ReferencePoint, type Rect} from '../core/anchor'` (`onLassoMain.ts:30`).
## Error Handling
## Logging
- `[align:lasso]` — the lasso handler (`src/handlers/onLassoMain.ts`)
- `[align:pageSize]` — page size resolution (`src/sdk/pageSize.ts`)
- `[align:storage]` — storage backend (`src/storage/anchorStorage.ts`)
- `[align:button]` — button registration (`src/buttons/registerLassoButton.ts` uses `TAG = 'align:button'`)
- `[align:init]` — top-level init failures in `index.js:62`
- `log` — successful state transitions ("popup opened", "set anchor box=…", "resize lasso (dx=…, dy=…)").
- `warn` — recoverable / expected failures (firmware call returned `success:false`, no anchor / no lasso when user clicks Apply, out-of-bounds rejection, transient throws inside `safe*` wrappers, reentry rejection).
- `error` — only when an `async` body crashed unexpectedly inside `catch (e)` of a handler entry point.
## Comments
- **Firmware quirks and their on-device evidence.** Examples: `src/core/reentrancyGuard.ts:1-5` ("the flag MUST be cleared synchronously before any subsequent await — clearing it after `await closePluginView` has been observed to leave it stuck `true`"); `src/ui/PopupRoot.tsx:10-13` ("Returning `null` from the first render caused the firmware to dismiss the overlay before our state update could re-render"); `src/handlers/onLassoMain.ts:1-27` (the lasso state lifecycle 0/1/2 + caching rationale).
- **Math derivations.** `src/core/anchor.ts:1-17` (file-top block explaining how `pointOnBox` maps the 9 reference points to coordinates) and `src/ui/ReferencePicker.tsx:34-43` (chevron arm vectors at 45° from the apex).
- **Cross-plugin precedent.** Citations like "sn-formula / sn-dictionary precedent" or "sn-mindmap pattern" appear when a workaround is shared across sibling plugins.
- **Tricky CSS / layout invariants** (e.g. `src/ui/styles.ts:181-189` explains why label and spacer cells share a width).
## Function Design
- **Dependency injection over module-scope singletons.** Handlers (`onLassoMain`), button registrations (`registerLassoButton`), storage factories (`createKvBackedAnchorStorage`, `createMemoryAnchorStorage`) all take a single `deps` object so tests can substitute stubs. The wiring lives in `index.js`. See `LassoDeps` in `src/handlers/onLassoMain.ts:49-54`, `RegisterLassoDeps` in `src/buttons/registerLassoButton.ts:21-25`.
- **Pick the slice you need.** When a helper only uses one method of a larger interface, the parameter is typed as `Pick<Logger, 'warn'>` or `Pick<PluginManagerLike, 'setButtonState'>` — see `src/buttons/buttonCommon.ts:23, 45-46`, `src/sdk/pageSize.ts:26`, `src/storage/anchorStorage.ts:111`. This keeps test stubs minimal.
- Plain object literals over multi-return tuples: `{dx, dy}` not `[number, number]` (`computeAnchorShift`).
- Outcome strings rather than booleans when a function has more than two distinct success states: `LassoOutcome = 'opened' | 'busy' | 'failed'`.
- Async helpers that "can recover" return `T | null`; helpers that "should crash" return `T` and throw via `unwrap`.
## Module Design
## SnAlign-Specific Architectural Rules
- **PopupRoot never returns `null`.** Returning `null` from the first render caused the firmware to dismiss the overlay before the state update could re-render. The "no callbacks yet" branch in `src/ui/PopupRoot.tsx:18-37` renders a safe header + close button instead of `null`.
- **`popupController.subscribe()` replays current state on subscribe.** Listeners get fired with the current state immediately so a `show()` that fired before React mount isn't lost (`src/ui/popupController.ts:57-63`).
- **Settings changes auto-persist.** Picker / toggle / offset callbacks save through `storage.setConfig` immediately and do **not** tear down the popup. Only `onApply`, `onApplyAndReAnchor`, `onSetAnchor`, and `onClose` call `teardown()` (`src/handlers/onLassoMain.ts:200-251`).
- **Page bounds checked before Apply.** `resolvePageSize` is captured once at popup open (firmware can't change page while the popup is shown — menu is hidden, no nav). `wouldExitPage` pre-computes whether the next Apply would exit, and that flag drives both the disabled state of the Apply buttons and the inline warning copy (`src/handlers/onLassoMain.ts:78-89`, `src/sdk/pageSize.ts`).
- **One global button listener** in `index.js`, routed by `event.id`. There is only one ID today (`LASSO_ALIGNMENT_BUTTON_ID = 201`, `src/buttons/registerLassoButton.ts:19`).
- **`config` and `anchorBox` are orthogonal.** Mutating one never disturbs the other. This is enforced at the storage layer by `setConfig` / `setAnchorBox` doing a read-modify-write of only their slot (`src/storage/anchorStorage.ts:101-108`). Any "fix" that couples them is wrong.
- **`performApply(alsoReAnchor)` is shared between Apply and Apply & Re-anchor.** The re-anchor variant calls `storage.setAnchorBox(newRect)` after a successful resize. The re-anchor step is skipped on resize failure or out-of-bounds rejection (`src/handlers/onLassoMain.ts:156-198`) — chaining off a failed step would silently corrupt the anchor.
- **Sync-first `release()` before any `await` in teardown.** The reentrancy guard flag must be cleared synchronously before any subsequent `await closePluginView()` / `await safeSetLassoBoxState()`. See `src/handlers/onLassoMain.ts:91-100` (`teardown` calls `release()` on its first line, then awaits). Detailed rationale and on-device evidence live in the **`sn-plugin` skill** at `~/.claude/skills/sn-plugin/`.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## System Overview
```text
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
- **Strict layering, no upward imports.** UI never imports the handler; the handler never imports React; core math has zero plugin/SDK imports and is pure.
- **Dependency injection at the edge.** `index.js` constructs a `LassoDeps` envelope (`comm`, `fileApi`, `storage`, `logger`) and passes it to `onLassoMain`. Tests substitute fakes for every field — no module-level firmware reads.
- **Pure-core / impure-shell split.** All math (`src/core/anchor.ts`) is pure and unit-tested in isolation. Side effects live in the handler and SDK layer.
- **Orthogonal model.** `config` (reference points, axis toggles, offsets) and `anchorBox` (saved rect) are persisted in one envelope but are independent — any change to one never disturbs the other. Load-bearing invariant.
- **Single firmware button → single popup.** No page-toolbar button. The popup is the only surface; every interaction (pick, toggle, stepper, set-anchor, apply, apply-and-re-anchor, close) flows back through callbacks on the same handler closure.
- **State bus over prop drilling.** `popupController.ts` is a tiny pub/sub; the handler pushes state, `PopupRoot` subscribes. Subscribe replays current state to handle the `show()`-before-mount race.
## Layers
- Purpose: Initialise firmware bindings, build DI envelope, register button, route presses
- Location: `index.js` (+ `App.tsx`)
- Contains: `PluginManager.init`, logger construction, `lassoComm` / `fileApi` / `storage` wiring, `onButtonPress` router
- Depends on: `sn-plugin-lib`, `registerLassoButton`, `onLassoMain`, `getDefaultAnchorStorage`
- Used by: Firmware (`AppRegistry`, button listener)
- Purpose: Declare the lasso-toolbar button to the firmware and route press events
- Location: `src/buttons/`
- Contains: `registerLassoButton` (constants `BUTTON_TYPE_LASSO_TOOLBAR=2`, `LASSO_ALIGNMENT_BUTTON_ID=201`, `EDIT_DATA_TYPES_ALL=[0,1,2,3,4,5]`, `showType:1`), `resolveIconUri`, `safeSetButtonState`
- Depends on: `sn-plugin-lib`-shaped `PluginManagerLike`, `Logger`, `i18n.localizedLassoButtonName`
- Used by: `index.js`
- Purpose: Orchestrate one full popup interaction from tap to teardown
- Location: `src/handlers/onLassoMain.ts`
- Contains: reentrancy gate, one-shot reads (lasso rect + page size), closure-local `cfg`/`anchorBox`, callback table, shared `performApply(alsoReAnchor)`, `teardown` (releases guard, hides popup, `setLassoBoxState(2)`, `closePluginView`)
- Depends on: `core/anchor`, `core/reentrancyGuard`, `storage/anchorStorage`, `sdk/*`, `ui/popupController`, `ui/AlignmentPopup` (callbacks type only)
- Used by: `index.js` `onButtonPress`
- Purpose: Math and the reentrancy primitive
- Location: `src/core/`
- Contains: `Rect`, `ReferencePoint`, `AlignmentConfig`, `pointOnBox`, `computeAnchorShift`, `translateRect`, type guards (`anchor.ts`); `tryAcquire`/`release`/`isBusy` (`reentrancyGuard.ts`)
- Depends on: nothing (pure TS)
- Used by: handler, storage, UI
- Purpose: Persist/restore the `{config, anchorBox}` envelope
- Location: `src/storage/anchorStorage.ts`
- Contains: v3 envelope schema, `parseEnvelope` (rejects wrong version, validates with core guards, returns `DEFAULT_ANCHOR_STATE` on any mismatch), `serialiseEnvelope`, `buildStorage`, `createMemoryAnchorStorage` (default), `createKvBackedAnchorStorage` (future-proof, unused at runtime), `getDefaultAnchorStorage` (module-cached singleton)
- Depends on: `core/anchor` (guards, defaults, types), `sdk/types` (`Logger`)
- Used by: `index.js`, handler
- Purpose: Narrow, structurally-typed wrappers over `sn-plugin-lib` quirks
- Location: `src/sdk/`
- Contains: `APIResponse<T>` + `Logger` types (`types.ts`); `resolvePageSize` + `fitsInPage` + `DEFAULT_PAGE_WIDTH=1920`/`DEFAULT_PAGE_HEIGHT=2560` (`pageSize.ts`); `unwrap` (`unwrap.ts`); `safeClosePluginView` (`closeView.ts`)
- Depends on: nothing internal (structural types only)
- Used by: handler, button registration
- Purpose: Render the popup and broker state from the handler
- Location: `src/ui/`
- Contains: `PopupRoot.tsx` (null-safe shell, mounts `AlignmentPopup`), `AlignmentPopup.tsx` (header, two-picker layout when anchored / minimal layout when not, axis toggles, offset steppers, warning slot, action row), `ReferencePicker.tsx` (3×3 grid: 8 chevrons + center dot), `popupController.ts` (state bus with replay-on-subscribe), `styles.ts`
- Depends on: `core/anchor` (types), `i18n/i18n` (`t`)
- Used by: `App.tsx` → React; handler (writes via `showPopup`/`updatePopup`/`hidePopup`)
- Purpose: Localised UI strings + firmware-visible names
- Location: `src/i18n/i18n.ts`
- Contains: `StringId` union, `STRINGS` per-locale table (en/zh_CN/zh_TW/ja/th/nl/de), `detectLocale`, `t`, `localizedLassoButtonName` + `localizedPluginName` (JSON-encoded for the firmware)
- Depends on: nothing
- Used by: UI components, `registerLassoButton`
## Data Flow
### Primary Apply Path
### Set Anchor flow
### Apply & Re-anchor flow
### Settings-only flow (no firmware touch)
- Handler closure holds the live `cfg` + `anchorBox` for the popup's lifetime — a single source of truth that's mirrored to storage on every settings change.
- `popupController.ts` holds the most recent `PopupState` (`{active, config, hasAnchor, outOfBounds, noLasso, callbacks}`) in a module variable; React reads it through `subscribe` (which replays the current state immediately).
- Storage holds the persisted envelope across taps.
## Key Abstractions
- Purpose: A page-space bounding box in firmware coords (`{left, top, right, bottom}`)
- Examples: `src/core/anchor.ts` line 19
- Used by: every layer
- Purpose: One of the 8 sides/corners or the center of a rect
- Examples: `src/core/anchor.ts` lines 21-30; rendered by `src/ui/ReferencePicker.tsx`
- Pattern: Tagged string union with a corresponding `ALL_REFERENCE_POINTS` tuple, `isReferencePoint` guard, and a `Record<Exclude<ReferencePoint,'center'>, Spec>` table in the picker
- Purpose: The user's choice — anchor reference point, target reference point, two axis toggles, two signed offsets
- Examples: `src/core/anchor.ts` lines 44-51; default at lines 53-60
- Pattern: Readonly POJO; mutated only by spreading (`{...cfg, ...patch}`)
- Purpose: The persisted shape — `{config, anchorBox}` (and a `version: 3` discriminator on the envelope)
- Examples: `src/storage/anchorStorage.ts` lines 30-39
- Pattern: Schema-versioned envelope; any non-`3` version is treated as absent and returns `DEFAULT_ANCHOR_STATE`
- Purpose: Match `sn-plugin-lib`'s `{success, result?, error?}` shape without importing the lib at module-load time
- Examples: `src/sdk/types.ts` lines 6-10
- Pattern: Structural type — every firmware call is shaped this way; `unwrap` throws on `!success`
- Purpose: Reject overlapping presses on a single-threaded JS engine where awaits can be suspended by firmware events
- Examples: `src/core/reentrancyGuard.ts`
- Pattern: Sync `tryAcquire` / `release`; release MUST happen before any await in the failure-recovery path (sync-first invariant)
- Purpose: Decouple the handler from React
- Examples: `src/ui/popupController.ts` lines 12-19
- Pattern: Singleton `currentState`, `Set<Listener>`, `subscribe` replays current state on attach
- Purpose: Capture handler-local `cfg` / `anchorBox` / `lasso` / `page` in the callback table so every press has a consistent view of state
- Examples: `src/handlers/onLassoMain.ts` lines 200-252
## Entry Points
- Location: `index.js`
- Triggers: `AppRegistry.registerComponent` (React UI bring-up), `PluginManager.init()` (firmware bring-up), top-level `registerLassoButton(...)` call
- Responsibilities: Construct logger (`console.log`-only — the firmware drops `console.warn`/`error` from logcat), build the `lassoDeps` envelope, define the single `onButtonPress` router that dispatches `event.id === 201` to `onLassoMain`
- Location: `index.js:49-55`, registered via `src/buttons/registerLassoButton.ts`
- Triggers: User taps the lasso-toolbar Alignment button (id 201)
- Responsibilities: Catch any `onLassoMain` rejection and log it; never throw back into the firmware
- Location: `App.tsx` → `src/ui/PopupRoot.tsx`
- Triggers: Firmware mounts the React tree for the registered component
- Responsibilities: Always render visible UI (never `null`); subscribe to the popup bus and re-render on every state push
## Architectural Constraints
- **Threading:** Single-threaded JS engine (JSC/Hermes); all firmware APIs are async via `Promise<APIResponse<T>>`. The reentrancy guard exists because firmware events (`state:stop`) can suspend mid-await.
- **Sync-first guard release:** `release()` in `teardown` MUST run before any `await`. Clearing the flag after `await closePluginView()` has been observed to leave it stuck `true` on a real device, rejecting every future press (see comment in `src/core/reentrancyGuard.ts` and the `teardown` order in `src/handlers/onLassoMain.ts:91-100`).
- **Global state:**
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
### Returning `null` from `PopupRoot` while inactive
### Coupling `config` and `anchorBox` writes
### Re-reading the lasso rect or page size from inside a callback
### Re-anchoring after a failed resize
## Error Handling
- `APIResponse<T>` failures are detected by checking `res?.success` and reading `res?.error?.message ?? 'unknown'`; `unwrap` throws on failure for read-side flows that need a value (`src/sdk/unwrap.ts`).
- `safeSetLassoBoxState` / `safeClosePluginView` swallow throws and log them — these are teardown-side calls where re-throwing would strand state.
- Every `performApply` / `onSetAnchor` body is wrapped in `try/catch` with the `teardown(deps)` call in `finally` so the popup and reentrancy guard always clear.
- Settings-only callbacks (`patchConfig`) use a `.catch(onPatchError(label))` adapter — the storage write rarely fails (in-memory) but logs and continues if it does.
- The top-level `index.js` `onButtonPress` catches any `onLassoMain` rejection so it never reaches the firmware.
- `resolvePageSize` never throws — failures fall through to the `1920×2560` fallback.
- Storage `parseEnvelope` silently returns `DEFAULT_ANCHOR_STATE` on any JSON parse error, missing version, or guard failure (forward-compatibility for future schema bumps).
## Cross-Cutting Concerns
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

| Skill | Description | Path |
|-------|-------------|------|
| git | Use when creating branches, commits, PRs, and managing git workflow. Enforces the project's branch naming, commit conventions, and PR rules. | `.claude/skills/git/SKILL.md` |
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
