---
phase: 01-api-diff-audit
plan: 01
status: complete
date: 2026-05-17
---

# Plan 01-01 Summary — .d.ts machine diff

## Outcome

Audit-branch evidence artifact captured per **D-02** (.d.ts machine diff) and **D-04** (strict 0.1.19 baseline).

| Item | Value |
|------|-------|
| Audit branch | `docs/ricardo/01-api-diff-audit` (off `dev`) |
| Diff file | `.planning/research/lib-0.1.19-to-0.1.43-dts.diff` |
| Line count | 3843 |
| Modified `.d.ts` files | 20 (excluding `.d.ts.map` siblings) |
| Net-new files | `model/lasso/LassoPreview.d.ts`, `model/PenInfo.d.ts` (both didn't exist in 0.1.19) |
| Versions verified | `/tmp/sn-019` = 0.1.19 exact; `/tmp/sn-043` = 0.1.43 exact (no caret resolution) |
| Commit | `f5ce19b docs(01): capture .d.ts machine diff for sn-plugin-lib 0.1.19→0.1.43` |

## SDK Domain Coverage Map (for Plans 03 / 04 to navigate)

### Mandatory call-site domains (every SnAlign integration point)
- `PluginManager.d.ts` — top-level lifecycle (init, registerButton, registerButtonListener, closePluginView, getPluginDirPath)
- `sdk/PluginCommAPI.d.ts` — lasso surface (getLassoRect, resizeLassoRect, setLassoBoxState, getCurrentFilePath, getCurrentPageNum)
- `sdk/PluginFileAPI.d.ts` — page metadata (getPageSize) + storage candidates per D-07
- `module/NativePluginManager.d.ts` — native bridge for PluginManager
- `module/NativePluginAPI.d.ts` — native bridge surface

### Adjacent-domain net-new (per D-06)
- `sdk/PluginDocAPI.d.ts` — document-level operations (changed; relevance to lasso flow unknown until §5)
- `sdk/PluginNoteAPI.d.ts` — note-level operations (changed)
- `sdk/utils/VerifyUtils.d.ts` — verification helpers (changed)
- `utils/PointUtils.d.ts` — coordinate utilities (changed; relevant to EMR/page-bounds)

### Models & events (changed shape — feeds the Behavioral / Net-new buckets)
- `model/Element.d.ts` — element model (shape change)
- `model/KeyWord.d.ts` — keyword model
- `model/LassoData.d.ts` — lasso payload (relevant to alignment math)
- `model/Layer.d.ts` — layer model
- `model/PenInfo.d.ts` — **net-new** in 0.1.43
- `model/lasso/LassoElementTypeNum.d.ts` — enum changes
- `model/lasso/LassoPreview.d.ts` — **net-new** in 0.1.43
- `model/lasso/ModifyLassoTitle.d.ts` — title modification surface
- `event/PluginEvent.d.ts` — event payload shape
- `error/APIError.d.ts` — error envelope shape (relevant to `APIResponse<T>` per D-11)
- `index.d.ts` — barrel re-exports

## Plan 03/04 Reading Order Recommendation

When classifying changes by bucket, read the diff hunks in this order:
1. `PluginCommAPI.d.ts` + `PluginFileAPI.d.ts` + `PluginManager.d.ts` — direct call-site impact for §2 sweep
2. `module/NativePluginAPI.d.ts` + `module/NativePluginManager.d.ts` — native bridge changes that surface via the public SDK above
3. `error/APIError.d.ts` + `model/Element.d.ts` + `model/LassoData.d.ts` — envelope/shape changes that ripple into every call site
4. The two net-new files (`LassoPreview`, `PenInfo`) — pure §5 Net-new entries
5. `sdk/PluginDocAPI` / `sdk/PluginNoteAPI` / `utils/PointUtils` / `sdk/utils/VerifyUtils` — adjacent-domain net-new per D-06

## Acceptance gates (all passed)

- `git branch --show-current` → `docs/ricardo/01-api-diff-audit` ✓
- `.planning/research/lib-0.1.19-to-0.1.43-dts.diff` exists, non-empty (3843 lines) ✓
- `grep -c '^+++ '` → 34 (≥ 1); `grep -c '^--- '` → 34 (≥ 1) ✓
- Diff mentions `PluginCommAPI|PluginManager|PluginFileAPI|getLassoRect|setLassoBoxState|Element` (222 hits) ✓
- `/tmp/sn-019` package.json version == `0.1.19` exact ✓
- `/tmp/sn-043` package.json version == `0.1.43` exact ✓
- Working-tree `node_modules/sn-plugin-lib` untouched ✓

## Downstream consumers

- **Plan 03** — Call-site sweep + Breaking/Behavioral/Net-new buckets uses this diff as the type-surface backstop.
- **Plan 04** — Four targeted answers (§6.3 page-bounds, §6.4 new lasso APIs) cites specific hunks from this diff for the per-subsection citation gate.
