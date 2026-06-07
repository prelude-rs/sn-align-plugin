---
phase: 01-api-diff-audit
plan: 03
status: complete
date: 2026-05-17
---

# Plan 01-03 Summary — Call-site sweep + Breaking/Behavioral/Net-new buckets

## Outcome

Audit doc scaffolded and populated through §5. Headline finding from the ghost-upgrade evidence (Plan 01-02): **the 0.1.19 → 0.1.43 upgrade is safe against the current SnAlign codebase** — `tsc` clean and `jest` 87/87.

| Item | Value |
|------|-------|
| Audit doc | `.planning/research/lib-0.1.19-to-0.1.43-audit.md` (178 lines) |
| §3 Breaking entries | 1 (`B-01: updateLassoRect → resizeLassoRect`) — SnAlign-impact: None (already migrated) |
| §4 Behavioral entries | 2 (`Beh-01`, `Beh-02`) — both `paper-only` doc-string expansions |
| §5 Net-new entries | 11 (`N-01..N-11`) |
| Phase 2 actions surfaced | 1 (informational changelog note for B-01); the other 2 Behavioral entries explicitly say "no action" |
| Phase 3 candidate verdicts | 3 `needs-eval` (N-01 `lassoElements`, N-03 `generateLassoPreview`, N-04 `showPluginView`); 8 `no` |
| Stub sections | §6/§7/§8 left in place for Plans 04+05 |
| Commit | `57d1550 docs(01): audit doc — call-site sweep + Breaking/Behavioral/Net-new buckets` |

## Per-API verdict table (§2 summary)

| # | API | Verdict | SnAlign impact |
|---|-----|---------|----------------|
| 1 | `PluginManager.init` | unchanged | — |
| 2 | `PluginManager.registerButton` | unchanged | — |
| 3 | `PluginManager.registerButtonListener` | unchanged | — |
| 4 | `PluginManager.getPluginDirPath` | unchanged | — |
| 5 | `PluginManager.closePluginView` | unchanged | — |
| 6 | `PluginCommAPI.getLassoRect` | unchanged | — |
| 7 | `PluginCommAPI.resizeLassoRect` | breaking (audit window) | None — already migrated (`updateLassoRect` rename happened pre-0.1.34) |
| 8 | `PluginCommAPI.setLassoBoxState` | unchanged | — (state=2 auto-commit semantics flagged for Phase 4 sideload in §8) |
| 9 | `PluginCommAPI.getCurrentFilePath` | unchanged | — |
| 10 | `PluginCommAPI.getCurrentPageNum` | unchanged | — |
| 11 | `PluginFileAPI.getPageSize` | unchanged | — |

## Items flagged for Plan 05 (Unknowns §8)

These claims cannot be verified without on-device sideload (deferred per D-07, D-08, D-14):

1. `setLassoBoxState(2)` auto-commit semantics — types unchanged, but on-wire behavior is paper-only.
2. `modifyButtonRes` reliability on A5X2 firmware (per existing `sn-plugin` skill gotcha; the type is still declared in 0.1.43 — see Plan 04 §6.2).
3. Per-firmware variance of any net-new method (`lassoElements`, `generateLassoPreview`, `showPluginView`) — all `needs-eval` because runtime behavior on A5X2 isn't proven by source/types.

## Items flagged as `needs-eval` for Plan 04 / Phase 3 follow-up

The `needs-eval` Phase 3 candidates from §5 give Phase 3's adoption planning concrete targets:

- **N-01 `PluginCommAPI.lassoElements(rect)`** — could simplify Apply by replacing the lasso instead of resizing. Eval gate: does element selection survive the replace?
- **N-03 `PluginCommAPI.generateLassoPreview(imagePath)`** — could power a preview thumbnail in the popup. Eval gate: latency on disk I/O before the popup renders.
- **N-04 `PluginManager.showPluginView()`** — would enable "Apply without closing" UX. Tied to a still-undecided UX question.

## Acceptance gates (all passed)

- `.planning/research/lib-0.1.19-to-0.1.43-audit.md` exists, 178 lines (≥ 80) ✓
- Exactly one `# ` H1 ✓
- Each of `## 2..## 8` H2s present exactly once ✓
- All 7 SnAlign call-site API names appear in §2 ≥ 1 time ✓ (resizeLassoRect: 9, closePluginView: 3, all others ≥ 2)
- `Phase 2 action:` count (3) ≥ Breaking + Behavioral count (1+2=3) ✓
- `Phase 3 candidate:` count (11) ≥ Net-new count (11) ✓
- At least one entry references an evidence file (6 hits) ✓
- At least one entry cites `node_modules/sn-plugin-lib/(src|lib/typescript)` (33 hits) ✓

## Downstream consumers

- **Plan 04** — Fills §6 (Four Targeted Answers: AsyncStorage / modifyButtonRes / page-bounds / lasso/page APIs). The 8 `no` Net-new entries already established by §5 mean §6.4 has less to cover.
- **Plan 05** — Fills §7 (skill gotcha cross-ref) and §8 (Unknowns numbered list — must include the 3 items flagged above).
- **Plan 06** — Consistency pass + scratch branch deletion. Will verify every Breaking has a `Phase 2 action:` line (already does, all 3 of them).
