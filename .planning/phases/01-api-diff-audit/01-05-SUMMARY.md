---
phase: 01-api-diff-audit
plan: 05
status: complete
date: 2026-05-17
---

# Plan 01-05 Summary — Skill Gotcha Cross-Reference (§7) + Unknowns (§8)

## Outcome

§7 and §8 of `.planning/research/lib-0.1.19-to-0.1.43-audit.md` populated. **No skill files edited** (D-09 honored). Audit doc now ends at §8 per D-16.

| Item | Value |
|------|-------|
| §7 subsections | 7.1 (SKILL.md, 7 rows) / 7.2 (api-gotchas.md, 33 rows) / 7.3 (storage.md, 6 rows) / 7.4 (other refs — bullets) |
| Total cross-referenced gotchas | 46 (7+33+6) plus 6 reference files in 7.4 |
| Verdict distribution | 41 `still valid in 0.1.43`, 0 `resolved by 0.1.43`, 5 `needs Phase 4 sideload-verify`, 0 `new` |
| §8 numbered Unknowns | 8 items |
| Commit | `43e54e3 docs(01): audit doc §7 + §8 — sn-plugin skill gotcha cross-reference + Unknowns / Paper-only Claims` |

## Skill gotchas tagged `needs Phase 4 sideload-verify`

These are the entries Plan 06 will pass through to Phase 4's SKILL-01..05 scope (skill files are NOT edited in Phase 1):

1. **api-gotchas.md row 10** — `setLassoBoxState(2)` auto-commit semantics; D-10/D-16 specifically called this out as paper-only.
2. **api-gotchas.md row 12** — `resizeLassoRect()` commits on `setLassoBoxState(2)`; downstream of row 10.
3. **api-gotchas.md row 13** — `recognizeElements` needs full page size (not lasso rect). Now testable since `recognizeElements` is net-new in 0.1.43 (§5 N-08).
4. **api-gotchas.md row 14** — `recognizeElements` only handles strokes/text-boxes. Same — net-new in 0.1.43.
5. **api-gotchas.md row 28** — `pluginManager.modifyButtonRes` "declared in `.d.ts` but NOT exposed". **Refinement needed**: per §6.2, the public `PluginManager.ts` wrapper doesn't bridge `modifyButtonRes`; the type is on `NativePluginManager.d.ts:112`; the Android native impl exists. Phase 4 should test a direct `NativePluginManager.modifyButtonRes(...)` call and update the skill claim accordingly.

## §8 Unknowns inventory (Phase 4 sideload test plan)

The full 8-item numbered list in §8:

1. `setLassoBoxState(2)` auto-commit semantics on A5X2.
2. AsyncStorage runtime presence on A5X2.
3. `modifyButtonRes` on-device reliability via direct `NativePluginManager` call.
4. `PluginCommAPI.lassoElements(rect)` runtime behavior (N-01).
5. `PluginCommAPI.generateLassoPreview(imagePath)` latency on E-Ink (N-03).
6. `PluginManager.showPluginView()` post-close behavior (N-04).
7. `PluginCommAPI.recognizeElements` semantics on net-new 0.1.43 surface (rows 13/14).
8. Comprehensive behavioral confirmation of "no Breaking" — sideload SnAlign code against an A5X2 running a 0.1.43-host build and run the lasso → Apply → Apply & Re-anchor flow.

## D-09 compliance

- No file under `~/.claude/skills/` was modified during Plan 05. Verification: `git status --porcelain $HOME/.claude/skills/` shows nothing (those paths live outside the repo).
- The cross-reference lives entirely in the audit doc.
- Phase 4 SKILL-01..05 has a concrete checklist: 5 gotchas tagged `needs Phase 4 sideload-verify` + a refinement note for row 28 about the public-wrapper-vs-native distinction.

## Acceptance gates (all passed)

- `## 7. sn-plugin Skill Gotcha Cross-Reference` heading appears exactly once ✓
- `### 7.1`, `### 7.2`, `### 7.3` (also `### 7.4`) each appear exactly once ✓
- Stub line `_Filled in Plan 05 (gsd-plan 01-05)._` no longer present ✓
- Tag literals (`still valid` / `resolved` / `needs Phase 4 sideload-verify` / `new`) appear in body (81 hits) ✓
- §7.3 contains `AsyncStorage` (2 hits) ✓
- `## 8. Unknowns / Paper-only Claims` heading appears exactly once ✓
- §8 numbered list items ≥ 3 (got 8) ✓
- §8 mentions `modifyButtonRes` ✓
- §8 mentions `AsyncStorage` ✓
- §8 mentions `scratch/ricardo/ghost-0.1.43` ✓
- §8 is the last `## ` H2 in the file ✓
- Commit landed (`43e54e3`) ✓

## Downstream consumers

- **Plan 06** — Final consistency pass + scratch branch deletion. Will verify all D-XX decisions are observable in the doc and run the §8 last-H2 check. Then `git branch -D scratch/ricardo/ghost-0.1.43`.
- **Phase 4** — SKILL-01..05 reads §7 to know what skill text to update; reads §8 to know what to test on A5X2.
- **Phase 2** — Reads §3, §4 for `Phase 2 action:` lines (only one informational item — no real code changes needed against the current SnAlign codebase).
- **Phase 3** — Reads §5, §6.4 for `Phase 3 candidate: needs-eval` items (N-01 `lassoElements`, N-03 `generateLassoPreview`, N-04 `showPluginView`).
