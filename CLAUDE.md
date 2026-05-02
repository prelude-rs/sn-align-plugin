# SnAlign — Supernote alignment plugin

A React Native plugin for the Supernote E-Ink tablet (`sn-plugin-lib`). Lets the user save a lasso selection's edge or corner as an "anchor", then later snap other lasso selections so their matching edge or corner lines up with the anchor.

## Model

Two **orthogonal** persisted fields combine at apply time:

- `alignmentType: AlignmentType` — one of 8 directions (4 corners + 4 sides). Default `'left'`.
- `anchorBox: Rect | null` — the saved bounding box, optional.

`computeAnchorShift(anchorBox, currentBbox, alignmentType)` derives `{dx, dy}` for the translation. Changing `alignmentType` does NOT clear `anchorBox` — the box is a `Rect`, so any direction can be applied against it without re-saving.

## UI surface

Two buttons across two toolbars (single global `registerButtonListener` dispatches by `event.id`).

| Toolbar | Type | Button | id | showType | Behaviour |
|---|---|---|---|---|---|
| Page (NOTE) | 1 | Set Alignment | 200 | 1 (popup) | 3×3 picker → sets `alignmentType`; Clear Anchor → `anchorBox = null`. |
| Lasso (NOTE) | 2 | Set Anchor | 201 | 0 (no overlay) | Saves current lasso bbox as `anchorBox`. Visible iff `anchorBox` is null. |
| Lasso (NOTE) | 2 | Apply Alignment | 202 | 0 | `resizeLassoRect` to align lasso to anchor per `alignmentType`. Visible iff `anchorBox` is set. |

The 201/202 pair is mutually exclusive — `setButtonState` toggles which is enabled. This is the **fallback path** because `pluginManager.modifyButtonRes` (which would let one id flip its name/icon at runtime) is empirically unavailable on the device's firmware.

## Repo layout

```
src/
  core/
    anchor.ts             types + computeAnchorShift
    reentrancyGuard.ts    module-level busy flag (release SYNC-FIRST before any await)
  storage/
    anchorStorage.ts      v2 envelope, setAlignmentType / setAnchorBox helpers
  handlers/
    onPageToolbar.ts      page popup handler — does NOT call setLassoBoxState
    onLassoMain.ts        dual-mode lasso handler (save bbox or apply)
  buttons/
    buttonCommon.ts       resolveIconUri(filename), shared types
    registerPageButton.ts BUTTON_TYPE_TOOLBAR=1, id 200
    registerLassoButton.ts BUTTON_TYPE_LASSO_TOOLBAR=2, ids 201+202 (file is singular by name)
    lassoButtonToggle.ts  setLassoMode('set-anchor' | 'apply-alignment')
  ui/
    AnchorPanel.tsx       3×3 picker; arrows are composed <View> rects (head + stem), not Unicode
    PopupRoot.tsx         backdrop + card + AnchorPanel; safe-renders even when callbacks null
    popupController.ts    state bus with replay-on-subscribe (mount race fix)
    styles.ts
  i18n/i18n.ts            string table + JSON-encoded {locale: name} for the firmware
  sdk/                    APIResponse / Logger / closeView / unwrap helpers
__tests__/                Jest, ~60 tests
assets/
  icon.png                lasso "Set Anchor" + page-toolbar
  icon-anchored.png       lasso "Apply Alignment" — frame + center dot
index.js                  AppRegistry, deps wiring, button registration
PluginConfig.json         pluginID `snplgalignv1`, pluginKey `SnAlign`, iconPath
buildPlugin.sh            patched to copy sibling PNGs adjacent to iconPath
.github/workflows/
  ci.yml                  lint + test + build-check on PRs
  release.yml             manual workflow_dispatch — bumps tag, builds, publishes Release with .snplg
```

## Commands

```sh
npm test                  # Jest
npx tsc --noEmit          # typecheck
npm run build             # rm -rf build && bash buildPlugin.sh → build/outputs/SnAlign.snplg
gh workflow run release.yml --ref main                 # auto-bump patch from latest v* tag
gh workflow run release.yml --ref main -f version=X.Y.Z
```

## Conventions

- **Sync-first reentrancy release.** `release()` MUST run before any `await` in teardown. The firmware's `state:stop` can suspend the JS context mid-await and leave the busy flag stuck.
- **PopupRoot never returns null.** Returning null caused the firmware to dismiss the overlay before our state update could re-render. Render a safe header + close button when `state.callbacks` is null.
- **Subscribe replays state.** `popupController.subscribe(listener)` calls `listener(currentState)` immediately so a `show()` that fired before React mount isn't lost.
- **One global button listener** in `index.js`, route by `event.id`. Don't add per-button listeners.
- **`closePluginView` lives on `PluginManager`**, not `PluginCommAPI`.
- **Logging**: firmware suppresses `console.warn`/`console.error`; route through `console.log` with explicit `[WARN]`/`[ERROR]` prefix. Every line we emit is `[align:<subsystem>] …` — grep `ReactNativeJS.*\[align:` in logcat.
- **Storage is in-memory only.** AsyncStorage native module isn't bundled in the host. State survives within a session, lost on plugin reinstall / device restart. Don't rely on persistence across reinstalls.
- **Icons.** `PluginConfig.json.iconPath` is the only icon copied by default; `buildPlugin.sh` was patched to also copy sibling PNGs from the icon directory so `assets/icon-anchored.png` ships in the .snplg. At runtime, resolve via `file://${getPluginDirPath()}/<filename>`.
- **No emoji in code/comments unless user requests.** No backwards-compatibility shims for the deleted `MarkPoint` model — it's gone.

## Firmware quirks (one-line each, see `~/.claude/projects/.../memory/supernote_sdk_quirks.md` for context)

- `modifyButtonRes` declared in SDK but not exposed by firmware — use `setButtonState` toggle.
- `showType:0` lasso buttons grey when registered `enable:true`; register `enable:false` then `setButtonState(true)`.
- Register all buttons before any `setButtonState` calls.
- Mixed `editDataTypes` across families is accepted (`[0,1,2,3,4]` works).
- `resizeLassoRect` translation commits on `setLassoBoxState(2)`; supports native undo.
- Plugin name + button names are JSON-encoded `{locale: string}` maps.
- Sibling plugin repos for reference: `~/repo/SN/sn-shapes`, `sn-mindmap`, `sn-dictionary`, `sn-plugin-demo-sticker`.

## Release flow

`release.yml` is `workflow_dispatch` only:

1. lint + test gate
2. resolve version (input or auto-bump latest `v*` tag's patch; first release `v0.1.0`)
3. bump `package.json` on the runner
4. build `.snplg`
5. only if build passed: commit bump → push → push annotated `vX.Y.Z` tag
6. generate notes (commits in range minus `chore(release):*`, contributors with @-handles, excluding Copilot + bot itself)
7. publish GitHub Release with notes + `.snplg`

## Verified on

- Supernote A5X2 (1920×2560 Android, 21632×16224 EMR coords)
- React Native 0.79.2, sn-plugin-lib ^0.1.19
- node 20 in CI; tested locally with the device-bundled JSC/Hermes runtime
