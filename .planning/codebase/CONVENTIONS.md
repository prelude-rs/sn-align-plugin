# Coding Conventions

**Analysis Date:** 2026-05-17

These are the SnAlign-specific conventions. Cross-cutting Supernote firmware quirks (sync-first reentrancy release, `console.log`-only logger because the firmware filters `warn`/`error`, JSON locale maps, AsyncStorage absence, `editDataTypes` 0-5 filter, `buildPlugin.sh` icon-sibling patch, etc.) live in the **`sn-plugin` project skill** at `~/.claude/skills/sn-plugin/`. `CLAUDE.md` points readers there for the canonical write-up — this file only reiterates them where strictly load-bearing.

## Naming Patterns

**Files:**
- Source modules use `camelCase.ts` (`anchorStorage.ts`, `pageSize.ts`, `onLassoMain.ts`, `popupController.ts`, `reentrancyGuard.ts`).
- React components use `PascalCase.tsx` (`AlignmentPopup.tsx`, `PopupRoot.tsx`, `ReferencePicker.tsx`).
- Test files mirror the source filename: `__tests__/<sourceName>.test.ts` (e.g. `anchorStorage.ts` ↔ `__tests__/anchorStorage.test.ts`).
- Constant-only style helper: `styles.ts` (lowercase — exports `styles` object).

**Directories:**
- `camelCase` segments under `src/` grouped by concern: `core/`, `storage/`, `handlers/`, `buttons/`, `sdk/`, `ui/`, `i18n/`.

**Functions:**
- `camelCase` for everything: `computeAnchorShift`, `pointOnBox`, `translateRect`, `resolvePageSize`, `safeClosePluginView`, `safeSetButtonState`, `tryAcquire`, `release`.
- Arrow-function `const` declarations are the default style for module-scope helpers: see `pointOnBox`, `translateRect`, `tryAcquire` in `src/core/anchor.ts` and `src/core/reentrancyGuard.ts`. `async function` declarations are not used in this codebase.
- Type-guards use `is<TypeName>` prefix and explicit `v is T` predicate return — e.g. `isAnchorBox`, `isReferencePoint`, `isAlignmentConfig` in `src/core/anchor.ts`.
- "Safe" wrappers around throwing firmware calls are prefixed `safe`: `safeClosePluginView` (`src/sdk/closeView.ts`), `safeSetButtonState` (`src/buttons/buttonCommon.ts`), `safeSetLassoBoxState` (`src/handlers/onLassoMain.ts`).
- React components inside a file are declared as named `React.FC<Props>` arrow consts: `Toggle`, `OffsetStepper`, `Header`, `AnchorTopRow`, `MinimalBody`, `AlignmentPopup` in `src/ui/AlignmentPopup.tsx`. `React.memo` wrappers get an explicit `.displayName` (see `Glyph` in `src/ui/ReferencePicker.tsx:112-125`).

**Variables:**
- `camelCase` for locals.
- `UPPER_SNAKE_CASE` for module-level constants: `LASSO_BOX_STATE_HIDDEN`, `LASSO_BOX_STATE_RELEASED`, `BUTTON_TYPE_LASSO_TOOLBAR`, `APP_TYPE_NOTE`, `EDIT_DATA_TYPES_ALL`, `LASSO_ALIGNMENT_BUTTON_ID`, `DEFAULT_PAGE_WIDTH`, `OFFSET_STEP`, `FALLBACK_LOCALE`, `ICON_FILENAME`, `ANCHOR_STORAGE_KEY`.
- Defaults: `DEFAULT_<NOUN>` pattern (`DEFAULT_ALIGNMENT_CONFIG`, `DEFAULT_ANCHOR_STATE`, `DEFAULT_PAGE_WIDTH`).
- All-cap arrays/records that drive enumerations are declared `readonly` / `as const` (`ALL_REFERENCE_POINTS` in `src/core/anchor.ts:32-42`).

**Types:**
- `PascalCase` exclusively: `Rect`, `ReferencePoint`, `AlignmentConfig`, `AnchorState`, `AnchorEnvelope`, `PageSize`, `APIResponse<T>`, `Logger`, `LassoDeps`, `LassoOutcome`, `PopupState`, `AlignmentPopupCallbacks`.
- Suffix `-Like` for structural-typing shims that match a real SDK class without importing it: `PluginManagerLike`, `LassoCommAPILike`, `PageSizeCommAPI`, `PageSizeFileAPI`, `ClosablePluginView`, `KvBackend` — see `src/buttons/buttonCommon.ts`, `src/handlers/onLassoMain.ts`, `src/sdk/closeView.ts`. Rationale (called out in `src/sdk/types.ts:1-4`): keep the surface narrow so the real `sn-plugin-lib` classes match by shape, no module-load-time import dependency.
- `Deps` suffix for the dependency-injection bag of a handler: `LassoDeps`, `RegisterLassoDeps`.
- Discriminated string literal unions for outcomes: `LassoOutcome = 'opened' | 'busy' | 'failed'` (`src/handlers/onLassoMain.ts:56`).
- `readonly` on every field of public state envelopes (`AlignmentConfig`, `AnchorState`, `AnchorEnvelope`).

**Internal-only / test-only exports:**
- `__testing__` namespace (e.g. `popupController.ts:65-70`, `i18n.ts:295-300`) bundles internals exposed only for tests.
- One-off test reset escape hatches use `__<verb>...ForTest` (e.g. `__resetDefaultAnchorStorageForTest` in `src/storage/anchorStorage.ts:150`).

## Code Style

**Formatting** (`.prettierrc.js`):
- `arrowParens: 'avoid'`
- `bracketSameLine: true`
- `bracketSpacing: false` (no space inside `{}` — destructure as `{deps}` not `{ deps }`)
- `singleQuote: true`
- `trailingComma: 'all'`
- `printWidth: 120`

Run: `npx prettier --check "src/**/*.{ts,tsx}" "App.tsx" "index.js" "__tests__/**/*.ts"`.

**Linting** (`.eslintrc.js`):
- Extends `@react-native` only (resolved via `node_modules/@react-native/eslint-config`). That config sets up `eslint-comments`, `react`, `react-hooks`, `react-native`, `@react-native`, `jest`, plus `@typescript-eslint` for `*.ts`/`*.tsx`.
- Notable rules inherited from `@react-native`:
  - `'no-void': 1` — discourages `void expr` (`node_modules/@react-native/eslint-config/index.js:209`).
  - `'react-native/no-inline-styles': 1` — flags inline style literals (`index.js:330`); the codebase factors inline styles into module-level `ViewStyle` consts in `ReferencePicker.tsx` (`CENTER_DOT_LAYOUT`, `ARROW_BASE_STYLE`, `CELL_FILL_WHITE`, `CELL_FILL_BLACK`) to satisfy this.
  - `'@typescript-eslint/no-unused-vars': ['error', {argsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_'}]` — prefix intentionally-unused params with `_`.
  - `'@typescript-eslint/no-shadow': 1` — avoid shadowing outer scope names.

Run: `npx eslint src/ App.tsx index.js __tests__/`.

**TypeScript** (`tsconfig.json`):
- Extends `@react-native/typescript-config/tsconfig.json` (strict mode).
- Plus the SnAlign-specific overlay:
  - `noUncheckedIndexedAccess: true` — `array[i]` and `record[key]` are typed `T | undefined`. The codebase handles this with explicit `??` fallbacks (e.g. `swap.split('_')[0] ?? FALLBACK_LOCALE` in `src/i18n/i18n.ts:261`) and chained optional access (`pathRes?.success`, `sizeRes?.error?.message`).
  - `exactOptionalPropertyTypes: true` — `{x?: T}` cannot be assigned `{x: undefined}`. The codebase prefers `T | null` over `T | undefined` for state slots (e.g. `anchorBox: Rect | null` in `src/storage/anchorStorage.ts:33`, `callbacks: AlignmentPopupCallbacks | null` in `src/ui/popupController.ts:18`).
  - `noImplicitOverride`, `noUnusedLocals`, `noUnusedParameters`.

Run: `npx tsc --noEmit`.

## Import Organization

**Order observed across `src/**`:**
1. External packages (`react`, `react-native`, `sn-plugin-lib`).
2. Sibling intra-module imports, then cross-module imports referencing other `src/` subtrees with relative paths (`../core/anchor`, `../sdk/types`, `../ui/popupController`).

There are no path aliases — every cross-module reference is a relative path.

**Type vs value imports:**
- `import type {…}` is used aggressively whenever a symbol is only referenced in type position (see `src/handlers/onLassoMain.ts:31-36`, `src/storage/anchorStorage.ts:26`). Mixed imports stay on one line: `import {computeAnchorShift, translateRect, type AlignmentConfig, type ReferencePoint, type Rect} from '../core/anchor'` (`onLassoMain.ts:30`).

**No barrel files.** Every module is imported by its full filename — there are no `index.ts` re-export files inside `src/`.

## Error Handling

**Three patterns, used consistently:**

1. **Throwing unwrap for "result expected" firmware calls.** `unwrap` in `src/sdk/unwrap.ts` converts an `APIResponse<T>` failure (or missing `result`) into a thrown `Error` with a `${name} failed: ${msg}` shape. Used only inside `try`-blocks that have a meaningful fallback (`tryGetLassoRect` in `onLassoMain.ts:58-65` catches and returns `null`).
2. **Safe-wrapper that warns and continues.** When the firmware call is best-effort (button state, close view, lasso box state, set button state), wrap it in a `safe*` helper that catches and routes to `logger.warn` — never to `throw`. Examples: `safeClosePluginView` (`src/sdk/closeView.ts:12-18`), `safeSetButtonState` (`src/buttons/buttonCommon.ts:44-56`), `safeSetLassoBoxState` (`src/handlers/onLassoMain.ts:67-76`).
3. **Top-level promise `.catch` on every fire-and-forget.** Any `async` function invoked without `await` (popup callbacks, the top-level `onButtonPress` dispatch in `index.js:51-54`) chains `.catch(...)` to silence unhandled rejection warnings. When the inner body already logs, the outer `.catch` body is an empty block with a `/* logged inside */` comment (`src/handlers/onLassoMain.ts:233-251`).

**Error message format:** `` `[align:<subsystem>] <verb> failed: ${(e as Error).message}` ``. The cast pattern `(e as Error).message` is used everywhere — see `onLassoMain.ts:62, 71, 113, 192`, `pageSize.ts:51`, `anchorStorage.ts:118, 126`. Errors caught from `unknown` are never re-thrown; they are logged at the level matching their severity (`warn` for recoverable, `error` for "user-visible operation crashed").

## Logging

**Framework:** custom `Logger` interface in `src/sdk/types.ts:12-16`:

```ts
export type Logger = {
  log: (msg: string) => void;
  warn: (msg: string) => void;
  error: (msg: string) => void;
};
```

The runtime implementation lives in `index.js:21-25` and **routes every level through `console.log`** with an explicit prefix:

```js
const logger = {
  log: msg => console.log(msg),
  warn: msg => console.log(`[WARN] ${msg}`),
  error: msg => console.log(`[ERROR] ${msg}`),
};
```

This is mandatory because the Supernote firmware filters `console.warn` / `console.error` from logcat (every `ReactNativeJS` line emits at `info` level regardless of source). See the **`sn-plugin` skill** at `~/.claude/skills/sn-plugin/` for the on-device evidence and matching pattern across sibling plugins.

**Namespacing:** every message starts with `[align:<subsystem>]`:
- `[align:lasso]` — the lasso handler (`src/handlers/onLassoMain.ts`)
- `[align:pageSize]` — page size resolution (`src/sdk/pageSize.ts`)
- `[align:storage]` — storage backend (`src/storage/anchorStorage.ts`)
- `[align:button]` — button registration (`src/buttons/registerLassoButton.ts` uses `TAG = 'align:button'`)
- `[align:init]` — top-level init failures in `index.js:62`

The button-related `safe*` helpers in `src/buttons/buttonCommon.ts` and `src/sdk/closeView.ts` accept a `tag` parameter so the same helper produces `[align:button]` or `[align:lasso]` prefixes depending on the caller.

**Level choice:**
- `log` — successful state transitions ("popup opened", "set anchor box=…", "resize lasso (dx=…, dy=…)").
- `warn` — recoverable / expected failures (firmware call returned `success:false`, no anchor / no lasso when user clicks Apply, out-of-bounds rejection, transient throws inside `safe*` wrappers, reentry rejection).
- `error` — only when an `async` body crashed unexpectedly inside `catch (e)` of a handler entry point.

## Comments

**Sparse — the codebase prefers self-documenting code with comments only on non-obvious WHY.**

What comments exist explain:
- **Firmware quirks and their on-device evidence.** Examples: `src/core/reentrancyGuard.ts:1-5` ("the flag MUST be cleared synchronously before any subsequent await — clearing it after `await closePluginView` has been observed to leave it stuck `true`"); `src/ui/PopupRoot.tsx:10-13` ("Returning `null` from the first render caused the firmware to dismiss the overlay before our state update could re-render"); `src/handlers/onLassoMain.ts:1-27` (the lasso state lifecycle 0/1/2 + caching rationale).
- **Math derivations.** `src/core/anchor.ts:1-17` (file-top block explaining how `pointOnBox` maps the 9 reference points to coordinates) and `src/ui/ReferencePicker.tsx:34-43` (chevron arm vectors at 45° from the apex).
- **Cross-plugin precedent.** Citations like "sn-formula / sn-dictionary precedent" or "sn-mindmap pattern" appear when a workaround is shared across sibling plugins.
- **Tricky CSS / layout invariants** (e.g. `src/ui/styles.ts:181-189` explains why label and spacer cells share a width).

**No JSDoc / TSDoc.** Function signatures and TypeScript types carry the contract. Inline `//` comments are used for short clarifications; `//` block comments (4-20 lines) sit at the top of a file or above a non-obvious block. There are no doc comments rendered by a documentation generator.

**Test-only escape-hatch comments:** test reset functions and `__testing__` exports get a one-liner explaining they exist for test isolation (see `src/storage/anchorStorage.ts:150`).

## Function Design

**Size:** Most exported helpers are one expression / one block. The longest single function is the `onLassoMain` body in `src/handlers/onLassoMain.ts` (~165 lines including nested closures); it composes smaller named locals (`tryGetLassoRect`, `safeSetLassoBoxState`, `wouldExitPage`, `teardown`, `refreshUi`, `patchConfig`, `onPatchError`, `performApply`) rather than inlining behaviour.

**Parameters:**
- **Dependency injection over module-scope singletons.** Handlers (`onLassoMain`), button registrations (`registerLassoButton`), storage factories (`createKvBackedAnchorStorage`, `createMemoryAnchorStorage`) all take a single `deps` object so tests can substitute stubs. The wiring lives in `index.js`. See `LassoDeps` in `src/handlers/onLassoMain.ts:49-54`, `RegisterLassoDeps` in `src/buttons/registerLassoButton.ts:21-25`.
- **Pick the slice you need.** When a helper only uses one method of a larger interface, the parameter is typed as `Pick<Logger, 'warn'>` or `Pick<PluginManagerLike, 'setButtonState'>` — see `src/buttons/buttonCommon.ts:23, 45-46`, `src/sdk/pageSize.ts:26`, `src/storage/anchorStorage.ts:111`. This keeps test stubs minimal.

**Return values:**
- Plain object literals over multi-return tuples: `{dx, dy}` not `[number, number]` (`computeAnchorShift`).
- Outcome strings rather than booleans when a function has more than two distinct success states: `LassoOutcome = 'opened' | 'busy' | 'failed'`.
- Async helpers that "can recover" return `T | null`; helpers that "should crash" return `T` and throw via `unwrap`.

## Module Design

**Exports:** Named exports only — there is a single `export default PopupRoot` in `src/ui/PopupRoot.tsx:50` (consumed by `App.tsx`), and `export default function App` in `App.tsx:4`. Everything else uses named `export const` / `export type`.

**Per-file responsibility:** every module under `src/` has a 1-line-to-1-paragraph header comment explaining the module's purpose (see `src/handlers/onLassoMain.ts:1-27`, `src/storage/anchorStorage.ts:1-17`, `src/sdk/pageSize.ts:1-5`).

**No barrels.** Cross-module imports always reference the actual filename. There is no `src/index.ts`.

## SnAlign-Specific Architectural Rules

These are load-bearing decisions called out in `CLAUDE.md`; anyone modifying the code must respect them.

- **PopupRoot never returns `null`.** Returning `null` from the first render caused the firmware to dismiss the overlay before the state update could re-render. The "no callbacks yet" branch in `src/ui/PopupRoot.tsx:18-37` renders a safe header + close button instead of `null`.
- **`popupController.subscribe()` replays current state on subscribe.** Listeners get fired with the current state immediately so a `show()` that fired before React mount isn't lost (`src/ui/popupController.ts:57-63`).
- **Settings changes auto-persist.** Picker / toggle / offset callbacks save through `storage.setConfig` immediately and do **not** tear down the popup. Only `onApply`, `onApplyAndReAnchor`, `onSetAnchor`, and `onClose` call `teardown()` (`src/handlers/onLassoMain.ts:200-251`).
- **Page bounds checked before Apply.** `resolvePageSize` is captured once at popup open (firmware can't change page while the popup is shown — menu is hidden, no nav). `wouldExitPage` pre-computes whether the next Apply would exit, and that flag drives both the disabled state of the Apply buttons and the inline warning copy (`src/handlers/onLassoMain.ts:78-89`, `src/sdk/pageSize.ts`).
- **One global button listener** in `index.js`, routed by `event.id`. There is only one ID today (`LASSO_ALIGNMENT_BUTTON_ID = 201`, `src/buttons/registerLassoButton.ts:19`).
- **`config` and `anchorBox` are orthogonal.** Mutating one never disturbs the other. This is enforced at the storage layer by `setConfig` / `setAnchorBox` doing a read-modify-write of only their slot (`src/storage/anchorStorage.ts:101-108`). Any "fix" that couples them is wrong.
- **`performApply(alsoReAnchor)` is shared between Apply and Apply & Re-anchor.** The re-anchor variant calls `storage.setAnchorBox(newRect)` after a successful resize. The re-anchor step is skipped on resize failure or out-of-bounds rejection (`src/handlers/onLassoMain.ts:156-198`) — chaining off a failed step would silently corrupt the anchor.
- **Sync-first `release()` before any `await` in teardown.** The reentrancy guard flag must be cleared synchronously before any subsequent `await closePluginView()` / `await safeSetLassoBoxState()`. See `src/handlers/onLassoMain.ts:91-100` (`teardown` calls `release()` on its first line, then awaits). Detailed rationale and on-device evidence live in the **`sn-plugin` skill** at `~/.claude/skills/sn-plugin/`.

---

*Convention analysis: 2026-05-17*
