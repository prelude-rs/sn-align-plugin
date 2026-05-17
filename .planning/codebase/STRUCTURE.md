# Codebase Structure

**Analysis Date:** 2026-05-17

## Directory Layout

```
sn-align-plugin/
├── index.js                       # Firmware entry: AppRegistry, deps wiring, global button listener (routes by event.id)
├── App.tsx                        # React root: mounts <PopupRoot />
├── PluginConfig.json              # Plugin manifest: pluginID `snplgalignv1`, pluginKey `SnAlign`, iconPath, name (JSON locale map)
├── package.json                   # NPM manifest, scripts (lint/test/build), deps (react 19, react-native 0.79.2, sn-plugin-lib ^0.1.19)
├── tsconfig.json                  # Extends @react-native/typescript-config; adds noUncheckedIndexedAccess, exactOptionalPropertyTypes, noImplicitOverride, noUnused*
├── jest.config.js                 # Jest config (preset: react-native)
├── babel.config.js                # Babel config (@react-native/babel-preset)
├── metro.config.js                # Metro bundler config
├── .eslintrc.js                   # @react-native/eslint-config
├── .prettierrc.js                 # Prettier config
├── buildPlugin.sh                 # Patched packager: copies sibling PNGs next to iconPath and zips into build/outputs/SnAlign.snplg
├── buildPlugin.ps1                # Windows packager
├── CLAUDE.md                      # Project-specific Claude instructions
├── README.md                      # User-facing readme
├── LICENSE
├── src/
│   ├── core/                      # Pure domain math + reentrancy primitive (zero firmware deps)
│   │   ├── anchor.ts              # Rect, ReferencePoint, AlignmentConfig, pointOnBox, computeAnchorShift, translateRect, type guards
│   │   └── reentrancyGuard.ts     # Module-level busy flag (sync tryAcquire / release / isBusy)
│   ├── storage/                   # Persistence layer
│   │   └── anchorStorage.ts       # v3 envelope, in-memory default, KV interface for future, AnchorStorage facade
│   ├── handlers/                  # Firmware-event orchestrators
│   │   └── onLassoMain.ts         # Single popup-driven handler: open, callbacks, performApply(alsoReAnchor), teardown
│   ├── buttons/                   # Firmware button registrations
│   │   ├── buttonCommon.ts        # resolveIconUri, safeSetButtonState, shared button types
│   │   └── registerLassoButton.ts # Lasso-toolbar button: id 201, type 2 (LASSO), showType 1 (popup), editDataTypes [0..5]
│   ├── sdk/                       # Narrow wrappers over sn-plugin-lib quirks
│   │   ├── types.ts               # APIResponse<T>, Logger
│   │   ├── unwrap.ts              # Throw-on-failed APIResponse helper
│   │   ├── closeView.ts           # safeClosePluginView (best-effort, warn on throw)
│   │   └── pageSize.ts            # resolvePageSize (path + page → getPageSize, fallback 1920×2560), fitsInPage
│   ├── ui/                        # React components + the popup state bus
│   │   ├── PopupRoot.tsx          # Always-rendering shell; subscribes to popupController; mounts AlignmentPopup
│   │   ├── AlignmentPopup.tsx     # Popup body: header, two pickers, axis toggles, offset steppers, warning slot, action row
│   │   ├── ReferencePicker.tsx    # 3×3 grid (8 chevrons + center dot)
│   │   ├── popupController.ts     # State bus (showPopup / updatePopup / hidePopup / subscribe-with-replay)
│   │   └── styles.ts              # StyleSheet for the whole popup
│   └── i18n/
│       └── i18n.ts                # StringId union, STRINGS table per locale, t(id), JSON-encoded firmware name maps
├── __tests__/                     # Jest specs (84 tests total)
│   ├── anchor.test.ts             # pointOnBox / computeAnchorShift / translateRect / guards
│   ├── anchorStorage.test.ts      # v3 envelope round-trip, version rejection, setConfig/setAnchorBox orthogonality
│   ├── i18n.test.ts               # locale normalisation, fallback chain, firmware name JSON
│   ├── onLassoMain.test.ts        # End-to-end handler with mocked deps
│   ├── pageSize.test.ts           # resolvePageSize happy path + fallbacks, fitsInPage
│   ├── popupController.test.ts    # State bus, replay-on-subscribe
│   └── reentrancyGuard.test.ts    # tryAcquire / release semantics
├── assets/                        # Bundled assets — copied next to iconPath by buildPlugin.sh
│   ├── icon.png                   # Lasso-toolbar button icon (declared in PluginConfig.json)
│   ├── icon-anchored.png          # Reserved for a future "anchor saved" icon variant (bundled but unused at runtime)
│   └── demo/                      # Demo media for README
├── android/                       # Android scaffold (React Native CLI default; required for bundle)
├── build/                         # Output (.snplg artifact) — gitignored
├── coverage/                      # Jest coverage output — gitignored
├── node_modules/                  # NPM deps — gitignored
├── app.json                       # React Native app name (consumed by AppRegistry)
├── .watchmanconfig
├── .gitignore
├── .planning/                     # GSD planning artifacts (codebase maps, phase docs)
├── .claude/                       # Claude tooling: project skills, agents, commands, hooks
└── .github/workflows/
    ├── ci.yml                     # PR gates on dev|main: lint, prettier, tsc, jest, build-check (aggregate gate)
    └── release.yml                # Manual workflow_dispatch — tag-only release; reads version from package.json
```

## Directory Purposes

**`src/core/`:**
- Purpose: Pure domain logic with zero external dependencies — math, types, type guards, the reentrancy primitive
- Contains: Two TypeScript modules, no React, no SDK imports
- Key files: `src/core/anchor.ts` (alignment math + types), `src/core/reentrancyGuard.ts` (module-level `busy` flag)

**`src/storage/`:**
- Purpose: Persist and restore the `{config, anchorBox}` envelope
- Contains: Schema-versioned envelope (`version: 3`), in-memory default backend, KV interface kept for future firmware
- Key files: `src/storage/anchorStorage.ts`

**`src/handlers/`:**
- Purpose: Orchestrate one full firmware event from press to teardown
- Contains: The single popup-driven lasso handler
- Key files: `src/handlers/onLassoMain.ts`

**`src/buttons/`:**
- Purpose: Declare firmware buttons and translate raw press events into handler invocations
- Contains: The single lasso-toolbar registration plus shared button utilities
- Key files: `src/buttons/registerLassoButton.ts`, `src/buttons/buttonCommon.ts`

**`src/sdk/`:**
- Purpose: Narrow structural-typed wrappers over `sn-plugin-lib` so the handler layer doesn't depend on the lib's runtime classes
- Contains: `APIResponse` / `Logger` types, `unwrap`, `safeClosePluginView`, `resolvePageSize`/`fitsInPage`
- Key files: `src/sdk/types.ts`, `src/sdk/pageSize.ts`, `src/sdk/unwrap.ts`, `src/sdk/closeView.ts`

**`src/ui/`:**
- Purpose: React components + the state bus that mediates handler → React
- Contains: All `.tsx` components, the popup controller (state bus), and shared styles
- Key files: `src/ui/PopupRoot.tsx`, `src/ui/AlignmentPopup.tsx`, `src/ui/ReferencePicker.tsx`, `src/ui/popupController.ts`, `src/ui/styles.ts`

**`src/i18n/`:**
- Purpose: Localised UI strings and firmware-visible button/plugin names
- Contains: `StringId` union, per-locale string tables (en, zh_CN, zh_TW, ja, th, nl, de), JSON-encoded `{locale: name}` maps for the firmware
- Key files: `src/i18n/i18n.ts`

**`__tests__/`:**
- Purpose: Jest specs (84 tests). One spec file per source module, co-located by name (test file mirrors source filename)
- Generated: No
- Committed: Yes

**`assets/`:**
- Purpose: Bundled binary assets — the build script copies every sibling file next to `iconPath` into the `.snplg`
- Contains: `icon.png` (declared in `PluginConfig.json`), `icon-anchored.png` (reserved for future use), `demo/` (README media)
- Generated: No
- Committed: Yes

**`android/`:**
- Purpose: Android scaffold from the React Native CLI; required for the Metro bundle even though we don't ship the APK
- Generated: Originally yes (`react-native init`), now hand-edited
- Committed: Yes

**`build/`:**
- Purpose: `buildPlugin.sh` output — produces `build/outputs/SnAlign.snplg`
- Generated: Yes
- Committed: No (gitignored)

**`coverage/`:**
- Purpose: Jest `--coverage` output
- Generated: Yes
- Committed: No (gitignored)

**`.github/workflows/`:**
- Purpose: GitHub Actions definitions
- Contains: `ci.yml` (PR gates), `release.yml` (`workflow_dispatch`-only, tag-only release)
- Committed: Yes

**`.planning/`:**
- Purpose: GSD planning artifacts — codebase maps under `.planning/codebase/`, phase plans under `.planning/phases/`
- Generated: Partly (the codebase maps are agent-written)
- Committed: Yes

**`.claude/`:**
- Purpose: Claude Code tooling — project skills (`git/`), agents, commands, hooks
- Committed: Yes (project-shared)

## Key File Locations

**Entry Points:**
- `index.js`: Firmware boot, `AppRegistry.registerComponent`, `PluginManager.init`, deps wiring, single global `onButtonPress` listener that routes by `event.id`
- `App.tsx`: React root component, mounts `<PopupRoot />`

**Configuration:**
- `PluginConfig.json`: Firmware-visible manifest (`pluginID: snplgalignv1`, `pluginKey: SnAlign`, `iconPath: assets/icon.png`, `versionName`, `versionCode`, JSON-encoded name map)
- `package.json`: NPM scripts and runtime deps (react 19.0.0, react-native 0.79.2, sn-plugin-lib ^0.1.19)
- `tsconfig.json`: Strict TS — extends `@react-native/typescript-config`, adds `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noUnusedLocals`, `noUnusedParameters`
- `babel.config.js`, `metro.config.js`, `jest.config.js`, `.eslintrc.js`, `.prettierrc.js`: standard React Native tooling configs
- `app.json`: React Native app name

**Core Logic:**
- `src/core/anchor.ts`: Alignment math (`pointOnBox`, `computeAnchorShift`, `translateRect`), runtime guards, default `AlignmentConfig`
- `src/core/reentrancyGuard.ts`: Module-level busy flag
- `src/handlers/onLassoMain.ts`: Full popup lifecycle including the shared `performApply(alsoReAnchor)` helper
- `src/storage/anchorStorage.ts`: v3 envelope, in-memory default `AnchorStorage` (cached singleton via `getDefaultAnchorStorage`)
- `src/buttons/registerLassoButton.ts`: The single firmware button (id 201, type 2, showType 1, edit types 0..5)
- `src/sdk/pageSize.ts`: Page-size resolution with hard 1920×2560 fallback

**UI:**
- `src/ui/PopupRoot.tsx`: Always-rendering shell (never returns `null`)
- `src/ui/AlignmentPopup.tsx`: The popup body (minimal layout when no anchor, full layout when anchored)
- `src/ui/ReferencePicker.tsx`: 3×3 reference-point grid
- `src/ui/popupController.ts`: Pub/sub state bus with replay-on-subscribe
- `src/ui/styles.ts`: All popup styles
- `src/i18n/i18n.ts`: Localisation + firmware name maps

**Testing:**
- `__tests__/anchor.test.ts`, `anchorStorage.test.ts`, `i18n.test.ts`, `onLassoMain.test.ts`, `pageSize.test.ts`, `popupController.test.ts`, `reentrancyGuard.test.ts`

**Build:**
- `buildPlugin.sh`: Patched packager — copies every PNG sibling of `iconPath` into the `.snplg` so `icon-anchored.png` (and any future variants) ship alongside `icon.png`
- `.github/workflows/ci.yml`: PR gates
- `.github/workflows/release.yml`: Manual tag-only release

## Naming Conventions

**Files:**
- `camelCase.ts` for non-React modules (e.g. `anchorStorage.ts`, `popupController.ts`, `pageSize.ts`, `reentrancyGuard.ts`, `registerLassoButton.ts`, `buttonCommon.ts`)
- `PascalCase.tsx` for React component files (e.g. `AlignmentPopup.tsx`, `ReferencePicker.tsx`, `PopupRoot.tsx`)
- `.test.ts` suffix for Jest specs, mirroring the source filename (e.g. `anchor.test.ts` for `src/core/anchor.ts`)
- Top-level config files follow ecosystem norms (`tsconfig.json`, `babel.config.js`, `metro.config.js`, `package.json`)

**Directories:**
- Lowercase singular nouns: `core`, `storage`, `handlers`, `buttons`, `sdk`, `ui`, `i18n`
- `__tests__/` is flat — every spec lives at the root, named after the source module it covers

**TypeScript identifiers:**
- `UPPER_SNAKE_CASE` for constants (`LASSO_ALIGNMENT_BUTTON_ID`, `BUTTON_TYPE_LASSO_TOOLBAR`, `EDIT_DATA_TYPES_ALL`, `ANCHOR_STORAGE_KEY`, `DEFAULT_ALIGNMENT_CONFIG`, `DEFAULT_PAGE_WIDTH`, `LASSO_BOX_STATE_HIDDEN`, `LASSO_BOX_STATE_RELEASED`)
- `PascalCase` for types and React components (`AlignmentConfig`, `ReferencePoint`, `Rect`, `AnchorState`, `PopupState`, `AlignmentPopup`, `PopupRoot`, `ReferencePicker`)
- `camelCase` for functions, callbacks, and variables (`computeAnchorShift`, `translateRect`, `pointOnBox`, `performApply`, `refreshUi`, `patchConfig`, `wouldExitPage`)
- Type guards prefixed `is*` (`isAnchorBox`, `isReferencePoint`, `isAlignmentConfig`)
- Safe-wrapper functions prefixed `safe*` (`safeSetLassoBoxState`, `safeClosePluginView`, `safeSetButtonState`)
- Tagged log prefixes per module: `[align:lasso]`, `[align:pageSize]`, `[align:button]`, `[align:storage]`, `[align:init]`

**Event routing:**
- One global `onButtonPress` listener in `index.js` routes by `event.id`. Today only `event.id === LASSO_ALIGNMENT_BUTTON_ID` (201) is handled. Any new button gets a new numeric id constant and an additional branch in the same router.

## Where to Add New Code

**New core math / pure helper:**
- Implementation: `src/core/` (new file, camelCase, no React/SDK imports)
- Tests: `__tests__/<name>.test.ts`

**New persisted state field:**
- Type changes: `src/core/anchor.ts` (extend `AlignmentConfig` and `DEFAULT_ALIGNMENT_CONFIG`; extend `isAlignmentConfig` guard)
- Schema bump: `src/storage/anchorStorage.ts` (increment `SCHEMA_VERSION`, decide whether old envelopes migrate or reset to default)
- Handler wiring: `src/handlers/onLassoMain.ts` (new callback in `AlignmentPopupCallbacks`, new `patchConfig` call)
- UI: extend `src/ui/AlignmentPopup.tsx` and `src/ui/styles.ts`
- Tests: update `__tests__/anchorStorage.test.ts`, `__tests__/anchor.test.ts`, and `__tests__/onLassoMain.test.ts`

**New firmware button:**
- Registration: new file under `src/buttons/` (e.g. `registerXButton.ts`) following the `registerLassoButton.ts` shape; export a numeric id constant
- Handler: new file under `src/handlers/` orchestrating its lifecycle
- Entry wiring: `index.js` — extend the deps envelope if needed, register the button at boot, add a branch to `onButtonPress` (route by `event.id`)
- Tests: `__tests__/onXMain.test.ts` mocking the same deps shape

**New firmware-call wrapper:**
- Implementation: `src/sdk/` (camelCase, structurally typed via `APIResponse<T>`)
- Use `unwrap` for read paths that need the value; use a `safe*` wrapper for teardown-side calls that must not throw

**New UI component:**
- Implementation: `src/ui/<Name>.tsx` (PascalCase, functional component, `React.FC<Props>`, styles in `src/ui/styles.ts`)
- Localised strings: add `StringId` entries to `src/i18n/i18n.ts` and translations in every locale block (en is the source of truth)
- Connection to handler: prefer extending `AlignmentPopupCallbacks` over importing handler state directly

**New popup state field:**
- Type: `src/ui/popupController.ts` (extend `PopupState` and `initialState`)
- Handler: `src/handlers/onLassoMain.ts` (compute and include in `showPopup` + `refreshUi`)
- UI: `src/ui/AlignmentPopup.tsx` + `src/ui/PopupRoot.tsx` (pass through as a prop)
- Tests: `__tests__/popupController.test.ts`

**New locale:**
- Add a key (e.g. `'fr'`) to `STRINGS`, `LASSO_BUTTON_NAME`, and `PLUGIN_NAME` in `src/i18n/i18n.ts`
- Mirror the new locale in `PluginConfig.json`'s `name` JSON map
- Cover the new locale in `__tests__/i18n.test.ts`

**Bundled asset (icon, image):**
- Drop the file in `assets/` next to `icon.png`; `buildPlugin.sh` copies every sibling of `iconPath` into the `.snplg`

**Shared utilities:**
- Pure helpers with no firmware deps: `src/core/`
- Firmware-shaped helpers: `src/sdk/`
- React-only helpers: `src/ui/` (or a new `src/ui/hooks/` if hooks proliferate)

## Special Directories

**`build/`:**
- Purpose: Output of `npm run build` / `buildPlugin.sh` — contains `outputs/SnAlign.snplg` (the device-installable plugin bundle)
- Generated: Yes
- Committed: No

**`coverage/`:**
- Purpose: Jest `--coverage` HTML and lcov output
- Generated: Yes
- Committed: No

**`node_modules/`:**
- Purpose: NPM install target
- Generated: Yes
- Committed: No

**`android/`:**
- Purpose: React Native CLI Android scaffold — Metro requires it even though we ship the JS bundle inside a `.snplg`, not an APK
- Generated: Initially (kept and hand-edited)
- Committed: Yes

**`.planning/`:**
- Purpose: GSD planning artifacts. `.planning/codebase/` holds the agent-written codebase maps (this file, `ARCHITECTURE.md`, etc.). Phase plans live under `.planning/phases/`.
- Generated: Partly (agent-written)
- Committed: Yes

**`.claude/`:**
- Purpose: Claude Code tooling — `.claude/skills/git/SKILL.md` enforces the project's branch + PR conventions; `agents/`, `commands/`, `hooks/`, `get-shit-done/` host the GSD workflow scaffolding
- Committed: Yes

**`assets/demo/`:**
- Purpose: README demo media (GIF/video). Not bundled into the `.snplg` (the build script only copies PNGs adjacent to `iconPath`).
- Committed: Yes

---

*Structure analysis: 2026-05-17*
