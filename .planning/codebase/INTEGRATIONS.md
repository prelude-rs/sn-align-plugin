# External Integrations

**Analysis Date:** 2026-05-17

SnAlign integrates with exactly one external surface: the Supernote firmware via `sn-plugin-lib`. There are no HTTP clients, no databases, no third-party services, no telemetry. CI/CD on GitHub Actions is the only out-of-process integration.

## Supernote Firmware SDK (`sn-plugin-lib`)

Imported in exactly two places:
- `index.js:8` — `import {PluginCommAPI, PluginFileAPI, PluginManager} from 'sn-plugin-lib';`
- `src/ui/PopupRoot.tsx:3` — `import {PluginManager} from 'sn-plugin-lib';` (sole use: emergency `closePluginView()` from the null-callbacks fallback shell).

All firmware calls are wrapped in dependency-injection seams (`LassoCommAPILike`, `PageSizeFileAPI`, `PageSizeCommAPI`, `PluginManagerLike`) so tests can mock them without touching the real SDK. Wiring lives in `index.js`.

### `PluginManager` methods used

| Method | Call site | Purpose |
|--------|-----------|---------|
| `init()` | `index.js:16` | One-time bootstrap before any other SDK call. |
| `registerButton(type, appTypes, button)` | `src/buttons/registerLassoButton.ts:32` | Registers id `201` as a `BUTTON_TYPE_LASSO_TOOLBAR=2` (constant) button for `appTypes: ['NOTE']`. Button config: `editDataTypes: [0,1,2,3,4,5]` (all selection types — strokes, titles, images, text-boxes, links, geometry), `showType: 1` (mounts the React popup as a centered dialog), `regionType: 1`, `regionWidth: 600`, `regionHeight: 800`. |
| `registerButtonListener(listener)` | `src/buttons/registerLassoButton.ts:53` | Installs the global `onButtonPress` dispatcher. The listener routes by `event.id` (only id `201` today). |
| `getPluginDirPath()` | `src/buttons/buttonCommon.ts:30` (via `resolveIconUri`) | Resolves the on-device plugin directory so the button icon can be addressed as `file://<dir>/icon.png`. Returns empty URI on failure — button renders without icon, never aborts registration. |
| `closePluginView()` | `index.js:35`, `src/ui/PopupRoot.tsx:27` | Dismisses the overlay window. Wrapped in `safeClosePluginView` (`src/sdk/closeView.ts`) which swallows errors — the overlay will eventually go away regardless. |

`PluginManagerLike` (`src/buttons/buttonCommon.ts:11`) also declares `setButtonState` and an optional `modifyButtonRes`, but neither is currently called from the live handler — `safeSetButtonState` (`buttonCommon.ts:44`) exists for future use. `modifyButtonRes` is left optional because the firmware does not expose it on all firmware revisions (cross-cutting SDK quirk).

### `PluginCommAPI` methods used

| Method | Call site | Purpose |
|--------|-----------|---------|
| `getCurrentFilePath()` | `index.js:30` → `src/sdk/pageSize.ts:29` | Half of the page-size resolution (file path + page number → `getPageSize`). |
| `getCurrentPageNum()` | `index.js:31` → `src/sdk/pageSize.ts:29` | Other half. Both called in parallel via `Promise.all`. |
| `getLassoRect()` | `index.js:32` → `src/handlers/onLassoMain.ts:60` | Reads the current lasso selection as `{left, top, right, bottom}` in firmware coords. Called **once** at popup-open time and the result is cached for the entire popup lifetime (no firmware change possible while the popup is showing — menu is hidden, no nav). |
| `resizeLassoRect(rect)` | `index.js:33` → `src/handlers/onLassoMain.ts:181` | The actual "apply" — translates the lasso selection to the computed position. Firmware semantics: pending until committed via `setLassoBoxState(2)`. |
| `setLassoBoxState(state)` | `index.js:34` → `src/handlers/onLassoMain.ts:69` | State machine for the lasso menu/box. `1=Hide` is called on popup-open to remove visual pollution while keeping the selection alive for resize. `2=Released` is called on every teardown path (Set Anchor / Apply / Apply & Re-anchor / Close) to commit the pending `resizeLassoRect` and release the gesture chain. Missing this commit leaves pen taps non-responsive until the user exits the note. |

### `PluginFileAPI` methods used

| Method | Call site | Purpose |
|--------|-----------|---------|
| `getPageSize(notePath, page)` | `index.js:39` → `src/sdk/pageSize.ts:36` | Returns `{width, height}` for the resolved file + page. Used to gate `wouldExitPage` checks in `onLassoMain.ts:78`. On any failure (renamed notes, missing API, transient error) the resolver falls back to `1920×2560` (`DEFAULT_PAGE_WIDTH`/`DEFAULT_PAGE_HEIGHT` in `pageSize.ts:9-10`). |

### Methods NOT used

For reference (so future phases don't assume they're wired up):
- `setButtonState` — declared in `PluginManagerLike` but never called from a live path.
- `modifyButtonRes` — optional in the type, never called (firmware-unreliable cross-cutting quirk).
- No file-API reads/writes (`writeFile`, `readFile`, page rendering, thumbnail APIs) — SnAlign is purely a lasso-position editor.
- No layer / stroke / handwriting-recognition APIs.

### Response envelope

All SDK methods (except `getPluginDirPath` → `string | null | undefined`, and `closePluginView` → `boolean`) return `APIResponse<T> = { success: boolean; result?: T; error?: { code: number; message: string } }` (defined locally in `src/sdk/types.ts`). The `unwrap` helper (`src/sdk/unwrap.ts`) throws on `!success || result === undefined` with a labeled message. Most call sites prefer the soft-fail pattern (log + continue) rather than throwing.

## Runtime Constraints (Hermes / JSC inside Supernote firmware)

- **Logger:** `console.warn` and `console.error` are filtered from the firmware's logcat output (every `ReactNativeJS` line is logged at info level). `index.js:20-25` defines a logger that routes everything through `console.log` with `[WARN]` / `[ERROR]` prefixes. All `deps.logger.*` calls in `src/handlers/` and `src/sdk/` flow through this.
- **Reentrancy:** The firmware's `state:stop` event can suspend the JS context mid-`await`. `src/core/reentrancyGuard.ts` provides a module-level busy flag; `tryAcquire()` is called at handler entry and `release()` **must be called synchronously before any further await** in teardown — see comment block in `src/handlers/onLassoMain.ts:24-27`.
- **AsyncStorage absent:** The plugin host bundles no AsyncStorage native module. `src/storage/anchorStorage.ts` documents this and uses an in-memory `Map`-style fallback (`createMemoryAnchorStorage`). Session-only persistence is sufficient because the JS context survives lasso taps and intra-session note swaps; state is lost on device restart or plugin reinstall.
- **Locale strings as JSON:** Firmware-visible names (button label, plugin name) are passed as JSON-stringified `{locale: string}` maps via `localizedLassoButtonName()` / `localizedPluginName()` in `src/i18n/i18n.ts:292-293`. Plain English strings would also work but lose multi-locale rendering on non-English Supernote firmware.
- **Page coordinate system:** Firmware coords match `getLassoRect` / `resizeLassoRect` and are bounded by `getPageSize`. On A5X2 this is `1920×2560` (the fallback constants).

## GitHub Actions

The only out-of-repo integration. Both workflows pin to `ubuntu-latest` + Node 20 with `cache: npm`.

### `.github/workflows/ci.yml`

- Trigger: `pull_request` to `main` or `dev`.
- Five parallel jobs: `lint`, `format`, `typecheck`, `test`, `build-check` (`needs: [lint, format, typecheck, test]`).
- Actions: `actions/checkout@v6`, `actions/setup-node@v6`.
- Branch protection on `dev` and `main` requires `build-check` to pass before merge.

### `.github/workflows/release.yml`

- Trigger: `workflow_dispatch` only (manual). Tag-only — does not push commits to `main`.
- Inputs: optional `version` (validated `^[0-9]+\.[0-9]+\.[0-9]+$`) — defaults to `package.json` version on `main`.
- Permissions: `contents: write` (needed to push tags and publish releases).
- Actions: `actions/checkout@v6` (with `fetch-depth: 0`, `ref: main`, `token: ${{ secrets.GITHUB_TOKEN }}`), `actions/setup-node@v6`, `softprops/action-gh-release@v3` (Node 24 compatible — bumped from v2 in commit `95455df`).
- Tag pusher identity: `github-actions[bot]` (`41898282+github-actions[bot]@users.noreply.github.com`).
- Publishes `build/outputs/SnAlign.snplg` to the release.

## Data Storage

**Local (on-device):** in-memory only via `createMemoryAnchorStorage` (`src/storage/anchorStorage.ts:131`). Default constructed once and cached via `getDefaultAnchorStorage()` (`anchorStorage.ts:143`). Schema version `3` envelope: `{version, config: AlignmentConfig, anchorBox: Rect | null}`.

**Remote:** None.

**Persistence across plugin reinstall / device restart:** None — anchor and config reset to `DEFAULT_ANCHOR_STATE`.

## Authentication / Identity

Not applicable — no user accounts, no remote services.

## Monitoring / Telemetry

None. All observability is via `console.log` lines visible through Supernote's logcat output (when device-side ADB logging is available).

## Webhooks / Callbacks

**Incoming firmware callbacks:**
- `onButtonPress(event)` — registered via `PluginManager.registerButtonListener` in `src/buttons/registerLassoButton.ts:46`. Dispatched from `index.js:49-55`; routes by `event.id` (only id `201` handled).

**Outgoing:** None.

## Environment Configuration

**Required env vars (runtime):** None. The plugin reads no `process.env` keys.

**Required env vars (CI):** Only `GITHUB_TOKEN`, auto-provided by GitHub Actions; passed to checkout in `release.yml:41`.

**Secrets location:** No `.env` files. No secrets directory. The only secret in scope is the GitHub-provided token; no custom secrets are configured.

---

*Integration audit: 2026-05-17*
