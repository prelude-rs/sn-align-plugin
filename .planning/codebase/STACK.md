# Technology Stack

**Analysis Date:** 2026-05-17

SnAlign is a small React Native plugin (~1.9k LOC of TS/TSX + ~60 LOC entry JS) packaged as a Supernote `.snplg` artifact via a custom bash builder. No backend, no databases, no network — pure on-device firmware integration.

## Languages

**Primary:**
- TypeScript 5.9 (`^5.9.3`) — all source under `src/` (`.ts` + `.tsx`).
- JavaScript — single entry file `index.js` (CommonJS-ish, ESM-style imports via Babel preset).

**Strict TypeScript flags** (`tsconfig.json` extends `@react-native/typescript-config/tsconfig.json` and adds):
- `noUncheckedIndexedAccess: true` — array/object index access returns `T | undefined`.
- `noImplicitOverride: true` — `override` keyword required.
- `noUnusedLocals: true`, `noUnusedParameters: true` — dead-code guard.
- `exactOptionalPropertyTypes: true` — `{ x?: T }` is distinct from `{ x: T | undefined }`.

These are load-bearing: the `APIResponse<T>` envelope in `src/sdk/types.ts` and the orthogonal `{config, anchorBox}` storage shape in `src/storage/anchorStorage.ts` rely on the stricter optional/index semantics for type safety.

**Test sources:** Jest tests under `__tests__/` are also TypeScript (`.ts`).

## Runtime

**Target runtime:** Hermes / JSC bundled inside the Supernote firmware (Android-based, A5X2 verified at 1920×2560).
- The plugin runs inside the Supernote host process; the JS context survives across lasso taps and note swaps within a session.
- No `AsyncStorage` native module is available in the plugin host — see `src/storage/anchorStorage.ts` (storage is in-memory only via `createMemoryAnchorStorage`).

**CI runtime:** Node.js 20 (pinned in `.github/workflows/ci.yml` and `release.yml`).
**Local dev requirement:** Node `>=18` (`package.json` engines field).

**Package Manager:**
- npm (lockfile `package-lock.json` present, 462 KB).
- No yarn / pnpm artifacts.

## Frameworks

**Core:**
- React 19.0.0 — UI tree mounted via `AppRegistry.registerComponent` in `index.js`.
- React Native 0.79.2 — JSX components (`View`, `Text`, `Pressable`, `StyleSheet`). No native modules outside `sn-plugin-lib`.
- sn-plugin-lib `^0.1.19` (resolved 0.1.34 in `node_modules`) — Supernote plugin framework providing `PluginManager`, `PluginCommAPI`, `PluginFileAPI`. See `INTEGRATIONS.md` for method-level usage.

**Testing:**
- Jest `^29.6.3` with preset `react-native` (`jest.config.js`).
- `react-test-renderer` 19.0.0 (declared but the existing suite is pure-logic — no component snapshots in `__tests__/`).
- 7 test files, 84 tests covering `core/anchor`, `core/reentrancyGuard`, `storage/anchorStorage`, `sdk/pageSize`, `i18n/i18n`, `ui/popupController`, `handlers/onLassoMain`.

**Build / Dev tooling:**
- `@babel/core` `^7.25.2`, `@babel/preset-env` `^7.25.3`, `@babel/runtime` `^7.25.0`.
- `@react-native/babel-preset` 0.79.2 (`babel.config.js`).
- `@react-native/metro-config` 0.79.2 (`metro.config.js` — uses defaults via `mergeConfig`).
- `@react-native/eslint-config` 0.79.2 (`.eslintrc.js` extends `@react-native`, root config).
- `@react-native/typescript-config` 0.79.2 (base for `tsconfig.json`).
- `@react-native-community/cli` 18.0.0 + platform-android 18.0.0 (dev convenience; the plugin doesn't run via Android Studio).
- Prettier `^3.8.3` (`.prettierrc.js`: `arrowParens: 'avoid'`, `bracketSameLine: true`, `bracketSpacing: false`, `singleQuote: true`, `trailingComma: 'all'`, `printWidth: 120`).

## Key Dependencies

**Critical (runtime):**
- `sn-plugin-lib` ^0.1.19 — only native bridge to the Supernote firmware. All UI affordances and lasso operations are routed through it.
- `react` 19.0.0 / `react-native` 0.79.2 — the popup UI (`src/ui/`) is plain RN; no animation libs, no gesture handler, no navigation.

**Notably absent:**
- No AsyncStorage, no MMKV, no SQLite, no realm. Persistence is in-memory only (`src/storage/anchorStorage.ts`). `createKvBackedAnchorStorage` is exported but currently unused — kept for any future firmware that bundles a real KV.
- No HTTP client (no `fetch` / `axios` usage in `src/`).
- No analytics, telemetry, error tracking.
- No i18n library — `src/i18n/i18n.ts` is a hand-rolled `StringId → locale → string` map for 7 locales (en, zh_CN, zh_TW, ja, th, nl, de).

## Configuration

**TypeScript:**
- `tsconfig.json` (project-root) — see strict flags above.

**Linting / Formatting:**
- `.eslintrc.js` — `{root: true, extends: '@react-native'}`.
- `.prettierrc.js` — see formatting settings above.

**React Native tooling:**
- `babel.config.js`, `metro.config.js` — both minimal, defaults from RN preset.
- `app.json` — `{"name": "SnAlign", "displayName": "SnAlign"}`.

**Plugin packaging:**
- `PluginConfig.json` — declares `pluginID: snplgalignv1`, `pluginKey: SnAlign`, `versionName: 0.3.0`, `versionCode: 300`, `iconPath: assets/icon.png`, `jsMainPath: index`. The `name` field is a JSON-encoded `{locale: string}` map consumed verbatim by the firmware.

**Environment variables:**
- None. The plugin has no `.env` file and reads no `process.env` keys at runtime.
- CI uses only `${{ secrets.GITHUB_TOKEN }}` (provided by GitHub Actions) and the workflow-input `version` override in `release.yml`.

## Platform Requirements

**Development:**
- Node `>=18` (`package.json` engines).
- `jq` or `python3` available on PATH for `buildPlugin.sh` JSON manipulation.
- bash for the build script (`buildPlugin.sh`); a PowerShell sibling `buildPlugin.ps1` exists but is not the CI path.

**Production target:**
- Supernote A5X2 (Android-based, 1920×2560 screen, 21632×16224 EMR coords) — explicitly verified.
- `DEFAULT_PAGE_WIDTH = 1920` / `DEFAULT_PAGE_HEIGHT = 2560` hardcoded in `src/sdk/pageSize.ts` as the fallback when firmware queries fail.

## Build Pipeline

**Command chain (`package.json` scripts):**
```sh
npm run build      # rm -rf build && bash buildPlugin.sh → build/outputs/SnAlign.snplg
npm test           # jest (84 tests)
npm run coverage   # jest --coverage
npm run lint       # eslint .
```

**`buildPlugin.sh` (executable, ~730 lines):**
- Reads `package.json` for name/desc/version (`jq` or `python3` fallback).
- Generates a build-time `PluginConfig.json` under `build/` with `iconPath` rewritten to `/<filename>`.
- Copies the icon referenced by `iconPath` and **all sibling `*.png` files in the icon directory** into the build (project-specific patch — supports `assets/icon-anchored.png` shipping alongside `assets/icon.png` for a future "saved" visual).
- Bundles the Metro JS bundle and the assets into the `.snplg` archive at `build/outputs/SnAlign.snplg`.

**CI gating (`.github/workflows/ci.yml`):**
Five parallel jobs on `pull_request` to `main` or `dev`, all on `ubuntu-latest` + Node 20:
1. `lint` — `npx eslint src/ App.tsx index.js __tests__/`
2. `format` — `npx prettier --check "src/**/*.{ts,tsx}" "App.tsx" "index.js" "__tests__/**/*.ts"`
3. `typecheck` — `npx tsc --noEmit`
4. `test` — `npx jest --coverage`
5. `build-check` — no-op gate that `needs: [lint, format, typecheck, test]`. Branch protection requires this single job.

**Release pipeline (`.github/workflows/release.yml`):**
- Trigger: `workflow_dispatch` only (manual, tag-only — no commit pushes).
- Re-runs lint + typecheck + jest as gates (no `--coverage` here).
- Resolves version: workflow input override (validated `^[0-9]+\.[0-9]+\.[0-9]+$`) or `package.json` version on `main`.
- Fails if `vX.Y.Z` tag already exists.
- Runs `npm run build` to produce `build/outputs/SnAlign.snplg`.
- Pushes an annotated `vX.Y.Z` tag pointing at `main`'s tip (via `github-actions[bot]`).
- Generates release notes from `git log <prev>..<new>` (excludes `chore(release):` and Copilot/bot commits, maps GitHub noreply emails to `@handles`).
- Publishes the GitHub Release via `softprops/action-gh-release@v3` with the `.snplg` attached.

---

*Stack analysis: 2026-05-17*
