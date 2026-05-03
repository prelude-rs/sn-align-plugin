# SnAlign

A Supernote plugin that aligns one lasso selection to another. Pick a reference point on a saved **anchor** rectangle and a reference point on the current **target** selection — SnAlign translates the target so the two points land on each other. Optional X/Y offsets nudge the result along each axis (positive or negative pixels), so you can place selections **next to** an anchor with precise spacing.

Use it to:

- Snap two paragraphs to the same left edge.
- Stack a new sticker directly under an existing one with 20px of breathing room.
- Center a small note inside a larger box.
- Line up a row of icons to share a common vertical center.

## Demo

<video src="https://github.com/user-attachments/assets/aa04f657-f133-4e54-a6e3-5e26ea0066e6" controls></video>

## Install

1. Download the latest `SnAlign.snplg` from the [Releases](../../releases) page.
2. Copy it to your Supernote (over USB or your usual sideload route).
3. On the device, open the plugin manager and install the file.

A single **Alignment** button appears on the lasso toolbar (the one that pops up after you draw a lasso). Tapping it opens a popup with all the controls.

## How to use

### 1. Save an anchor

1. Lasso the rectangle you want to use as the reference (strokes, text, images, shapes, or a mix).
2. Tap **Alignment** → **Set Anchor**. The popup closes.

The bounding box of that lasso is now your anchor.

### 2. Apply alignment to a new selection

1. Lasso another piece of content.
2. Tap **Alignment**. The popup opens.
3. In the popup:
   - **Anchor** picker (left) — pick which point on the anchor to use (any corner, any edge mid-point, or the center).
   - **Target** picker (right) — pick which point on the _current_ lasso to align to that anchor point.
   - **Align X / Align Y** toggles — turn one off to keep that axis untouched. With both on, the target snaps to both axes.
   - **Offset X / Offset Y** steppers — shift the target along each axis after the snap. Positive values move the target right / down; negative values move it left / up. ±10 per tap.
4. Tap **Apply Alignment**. The lasso slides into place. The move is undoable with the device's standard undo.

### Replace the anchor

When an anchor is set, the popup also shows **Set New Anchor** — tap it to overwrite the current anchor with the bounding box of your live lasso.

## Examples

| Effect                                            | Anchor / Target           | Toggles      |
| ------------------------------------------------- | ------------------------- | ------------ |
| Match left edges (vertical position untouched)    | Left / Left               | Align X only |
| Match top edges (horizontal position untouched)   | Top / Top                 | Align Y only |
| Stack target directly below anchor, both centered | Bottom / Top              | Align X + Y  |
| Place target to the right of anchor with a gap    | Right / Left + Offset X = 20 | Align X + Y  |
| Center target inside anchor                       | Center / Center           | Align X + Y  |

## What works

- Strokes (handwriting)
- Text boxes
- Images
- Geometric shapes (lines, curves, circles, ellipses, polygons)
- Any mix of the above

The plugin won't apply a move that would push your selection past the page edge — the **Apply Alignment** button is disabled in that state with an inline warning, and you can adjust offsets or pick a different anchor/target combination to fit.

## Limits

- The anchor is in-memory only. It's preserved while you swap between notes within a session, but lost when the plugin host restarts (device reboot or plugin reinstall).
- Verified on the Supernote A5X2. Other models likely work but aren't tested.
- The plugin does pure visual translation — it doesn't resize, rotate, or modify the content itself.

## License

MIT — see [LICENSE](LICENSE).
