# SnAlign — Supernote alignment plugin

A React Native plugin for the Supernote E-Ink tablet (`sn-plugin-lib`). The user picks a reference point on a saved "anchor" box and a reference point on the current lasso selection; the plugin translates the lasso so the two points coincide (with optional gaps and per-axis constraints), as long as the result fits inside the page.

## Model

```ts
type ReferencePoint =
  | 'top-left' | 'top' | 'top-right'
  | 'left'     | 'center' | 'right'
  | 'bottom-left' | 'bottom' | 'bottom-right';

type AlignmentConfig = {
  anchorRef: ReferencePoint;   // which point on the anchor box
  targetRef: ReferencePoint;   // which point on the lasso box
  constrainX: boolean;         // false = freeze X axis (no horizontal movement)
  constrainY: boolean;         // false = freeze Y axis (no vertical movement)
  gapX: number;                // firmware px; offsets the anchor point on X before shift
  gapY: number;                // firmware px; same for Y
};

type AnchorState = {config: AlignmentConfig; anchorBox: Rect | null};
```

`computeAnchorShift(anchorBox, currentBbox, config) → {dx, dy}`. Both fields are persisted as one envelope but are orthogonal — changing config doesn't disturb the anchor and vice versa.

## UI surface

A single lasso-toolbar button opens a popup containing everything.

| Toolbar | Type | Button | id | showType | Behaviour |
|---|---|---|---|---|---|
| Lasso (NOTE) | 2 | Alignment | 201 | 1 (popup) | Two reference pickers + axis toggles + gap steppers + contextual action button (Save Anchor when none, Apply + Clear when set). Apply is greyed when the resulting rect would exit the page. |

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
    AlignmentPopup.tsx    full popup body: two pickers, axis toggles, gap steppers, action button
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

## Conventions

- **Sync-first reentrancy release.** `release()` MUST run before any `await` in teardown. The firmware's `state:stop` can suspend the JS context mid-await and leave the busy flag stuck.
- **PopupRoot never returns null.** Returning null caused the firmware to dismiss the overlay before our state update could re-render. Render a safe header + close button when `state.callbacks` is null.
- **Subscribe replays state.** `popupController.subscribe(listener)` calls `listener(currentState)` immediately so a `show()` that fired before React mount isn't lost.
- **Settings changes auto-persist.** Picker / toggle / gap callbacks save through `storage.setConfig` immediately; only Save / Apply / Clear / Close tear down the popup.
- **Page bounds checked before Apply.** `resolvePageSize` queries firmware via `PluginCommAPI.getCurrentFilePath` + `getCurrentPageNum` + `PluginFileAPI.getPageSize`, falling back to 1920×2560 if any step fails. The popup pre-computes whether the next Apply would exit the page; `outOfBounds` flag drives the disabled state and the inline warning.
- **One global button listener** in `index.js`, route by `event.id`.
- **`closePluginView` lives on `PluginManager`**, not `PluginCommAPI`.
- **Logging**: firmware suppresses `console.warn`/`console.error`; route through `console.log` with explicit `[WARN]`/`[ERROR]` prefix. Every line we emit is `[align:<subsystem>] …` — grep `ReactNativeJS.*\[align:` in logcat.
- **Storage is in-memory only.** AsyncStorage native module isn't bundled in the host. No migration across schema versions — bumping `SCHEMA_VERSION` returns `DEFAULT_ANCHOR_STATE` for any older envelope.
- **Icons.** `PluginConfig.json.iconPath` is the only icon copied by default; `buildPlugin.sh` was patched to also copy sibling PNGs from the icon directory. At runtime, resolve via `file://${getPluginDirPath()}/<filename>`.
- **No emoji in code/comments unless user requests.**

## Firmware quirks (one-line each, see `~/.claude/projects/.../memory/supernote_sdk_quirks.md` for context)

- `modifyButtonRes` declared in SDK but not exposed by firmware — register the button you want; don't try to mutate it at runtime.
- Register all buttons before any `setButtonState` calls.
- `editDataTypes` values: `0=stroke, 1=title, 2=image, 3=text-box, 4=link, 5=geometry`. Use `[0..5]` for "any lasso content"; missing `5` greys the button for shape selections.
- `resizeLassoRect` translation commits on `setLassoBoxState(2)`; supports native undo.
- Plugin name + button names are JSON-encoded `{locale: string}` maps.
- `PluginFileAPI.getPageSize(notePath, page)` returns dimensions in firmware coords (same system as `resizeLassoRect`).
- Sibling plugin repos for reference: `~/repo/SN/sn-shapes`, `sn-mindmap`, `sn-dictionary`, `sn-plugin-demo-sticker`.

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
