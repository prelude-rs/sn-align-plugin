---
phase: 01-api-diff-audit
plan: 02
status: complete
date: 2026-05-17
---

# Plan 01-02 Summary — Ghost-upgrade tsc + jest evidence

## Headline Findings

**The 0.1.19 → 0.1.43 upgrade is CLEAN against the current SnAlign codebase.**

| Signal | Result |
|--------|--------|
| `npx tsc --noEmit` (strict TS: noUncheckedIndexedAccess + exactOptionalPropertyTypes + strict) | **CLEAN** — exit 0, 0 errors |
| `npx jest` | **CLEAN** — 7/7 suites passed, 87/87 tests passed |
| Failed test suites | None |
| Resolved version on scratch | `0.1.43` exact (verified `node -p "require('sn-plugin-lib/package.json').version"`) |
| Scratch branch | `scratch/ricardo/ghost-0.1.43` (preserved — deleted by Plan 06 per D-15) |
| Audit branch commit | `ca635c5 docs(01): capture ghost-upgrade tsc + jest evidence for sn-plugin-lib@0.1.43` |

## Evidence files (committed on audit branch)

- `.planning/research/lib-0.1.43-ghost-tsc.log` (9 lines — wrapped clean-run sentinel; tsc produced no diagnostic output)
- `.planning/research/lib-0.1.43-ghost-jest.log` (21 lines — includes per-suite PASS lines and the `Tests: 87 passed, 87 total` summary)

## Implication for Plans 03 + 04

The audit's Breaking bucket (§3) is expected to be **empty** based on this evidence. Plans 03 and 04 should:

1. **§3 Breaking Changes** — Document as "No Breaking changes observed via ghost-tsc or ghost-jest. The SnAlign codebase compiles under strict TS flags and all 87 tests pass against sn-plugin-lib@0.1.43." Include a note that any type-surface drift surfaced by the `.d.ts` diff that does NOT translate to a tsc error counts as Behavioral (paper-only) per D-10 / D-11 — not Breaking.
2. **§4 Behavioral Changes** — Drive almost entirely from `.d.ts` diff hunks (Plan 01) where the type-surface changed but the code still compiles. Each entry tagged `paper-only` per D-14 unless there's a code-comment signal in `node_modules/sn-plugin-lib/src/**` proving runtime behavior change.
3. **§5 Net-new APIs** — The two net-new `.d.ts` files (`LassoPreview`, `PenInfo`) flagged in Plan 01-01 SUMMARY are baseline net-new entries. Walk the dts.diff for additional exported symbols added to existing files.

## Side effects to be aware of

- The working-tree `node_modules/sn-plugin-lib` remains at `0.1.43` content (gitignored, survives the `git checkout` back to audit branch). Plans 03/04 can safely cite `node_modules/sn-plugin-lib/src/**` paths and they will resolve to 0.1.43 source — the citation contract per D-03 holds.
- The audit branch's `package.json` and `package-lock.json` remain at dev's baseline (`^0.1.19` resolved to `0.1.34` per the original lockfile). The upgrade does NOT cross from scratch back to audit — only the evidence logs do.
- The scratch branch has `package.json: "sn-plugin-lib": "0.1.43"` + a refreshed `package-lock.json`. Both are local-only; never pushed.

## Acceptance gates (all passed)

- `git branch --show-current` after Task 3 → `docs/ricardo/01-api-diff-audit` ✓
- Both `.planning/research/lib-0.1.43-ghost-*.log` files exist, non-empty ✓
- `grep -qE '^Tests:|SyntaxError|Cannot find module' /tmp/lib-0.1.43-ghost-jest.log` matches `Tests:` ✓
- `package.json` on the scratch branch reads exactly `"sn-plugin-lib": "0.1.43"` (no caret) ✓
- `node -p "require('sn-plugin-lib/package.json').version"` printed `0.1.43` exactly on scratch ✓
- Scratch branch `scratch/ricardo/ghost-0.1.43` exists locally and is not pushed ✓

## Downstream consumers

- **Plan 03** — Uses both logs as evidence for §3/§4 entries (or to justify "no Breaking entries" headline).
- **Plan 06** — Will delete the scratch branch (`git branch -D scratch/ricardo/ghost-0.1.43`) per D-15 once the audit doc is finalised.
