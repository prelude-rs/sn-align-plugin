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
