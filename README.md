# SnAlign

A Supernote plugin to align lasso selections to a saved reference. Pick where on a selection you'd like to anchor (any of the 8 edges/corners), save the anchor, then apply that alignment to other selections — text, strokes, images, or any mix.

## Install

1. Download the latest `SnAlign.snplg` from the [Releases](../../releases) page.
2. Copy it to your Supernote (over USB or your usual sideload route).
3. On the device, open the plugin manager and install the file.

Two new buttons appear on a Note:

- **Set Alignment** — on the page side toolbar (always visible).
- **Set Anchor** / **Apply Alignment** — on the lasso toolbar (the one that pops up after you draw a lasso). Only one of these shows at a time.

## How to use

Two settings combine to translate a selection: a **direction** (which edge or corner to align) and an **anchor** (the reference rectangle to align to). They're independent — change one without disturbing the other.

### Set the alignment direction

1. Tap **Set Alignment** on the page toolbar.
2. Pick a cell in the 3×3 grid:
   - corners → align that corner of your selection to the same corner of the anchor
   - sides → align that edge only (the other axis is unchanged)
3. The selected direction is highlighted; close the dialog.

### Save an anchor

1. Lasso anything on the page (strokes, text boxes, images, or a mix).
2. Tap **Set Anchor** on the lasso toolbar.

The bounding box of that lasso is saved as the anchor.

### Apply

1. Lasso another piece of content.
2. Tap **Apply Alignment**.

The selection slides so its chosen edge or corner lands on the same edge or corner of the saved anchor. The move is undoable with the device's standard undo.

### Clear the anchor

Open the **Set Alignment** dialog and tap **Clear Anchor**. The direction stays; only the anchor is removed. The lasso button flips back to **Set Anchor**.

## What works

- Strokes
- Text boxes
- Images
- Mixed selections

## Limits

- The anchor is in-memory only — it's lost when the plugin host restarts (e.g. after a device reboot or a plugin reinstall). Survives navigating between notes.
- Verified on the Supernote A5X2; other models likely work but aren't tested.

## License

MIT — see [LICENSE](LICENSE) if present in the repo.
