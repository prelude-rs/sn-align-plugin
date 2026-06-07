---
phase: 02-compatibility-upgrade
plan: 01
subsystem: dependencies, brownfield-docs
tags: [chore, dependency-bump, lockfile-refresh, ci-gates]
requires:
  - "Phase 1: API diff audit (lib-0.1.19-to-0.1.43-audit.md, ghost-tsc, ghost-jest)"
provides:
  - "sn-plugin-lib at ^0.1.43 on the upgrade branch with green CI gates"
  - "Synced package-lock.json (cosmetic name/version drift fixed, @babel/preset-env 7.29.3 → 7.29.5)"
  - "STACK.md lines 41 and 60 reflecting the new resolved version"
affects:
  - package.json
  - package-lock.json
  - node_modules/sn-plugin-lib/
  - .planning/codebase/STACK.md
tech-stack:
  added: []
  patterns: [npm-pkg-set, npm-install-ignore-scripts, atomic-staging, two-commit-shape-D10]
key-files:
  created:
    - .planning/phases/02-compatibility-upgrade/02-01-SUMMARY.md
  modified:
    - package.json
    - package-lock.json
    - .planning/codebase/STACK.md
decisions:
  - "D-01 applied: caret pin ^0.1.43 via npm pkg set"
  - "D-02 applied: @babel/preset-env upgraded 7.29.3 → 7.29.5 via explicit npm update (npm install alone retained 7.29.3 because the existing lockfile entry was still in-caret; the explicit npm update produced the within-caret freebie D-02 expected)"
  - "D-07 applied: cosmetic lockfile root name/version drift (snalign 0.2.1 → SnAlign 0.3.0) synced by the same npm install"
  - "D-08 applied: STACK.md lines 41 and 60 updated, version-substring-only edits"
  - "D-10 applied: chore(02) commit (b10eae6) parent of docs(02) commit (c832f3e)"
metrics:
  commits: 2
  files_changed_vs_dev: 3
  jest_tests_passed: 87
  jest_tests_total: 87
  build_artifact_bytes: 267016
  completed_date: 2026-05-17
---

# Phase 2 Plan 1: sn-plugin-lib Compatibility Upgrade Summary

Landed `sn-plugin-lib` at `^0.1.43` on the upgrade branch, refreshed the lockfile (cosmetic root name/version drift fixed plus `@babel/preset-env` 7.29.3 → 7.29.5 within-caret freebie), updated `.planning/codebase/STACK.md` lines 41 and 60, and re-confirmed all 5 local CI gates green per D-05 — reproducing Phase 1's ghost-evidence on the real branch.

## What Was Built

### Commit 1 — `chore(02): bump sn-plugin-lib to ^0.1.43 and refresh lockfile` (`b10eae6`)

- **`package.json`**: Line 17 `"sn-plugin-lib": "^0.1.19"` → `"sn-plugin-lib": "^0.1.43"` via `npm pkg set dependencies.sn-plugin-lib='^0.1.43'` (no key reordering).
- **`package-lock.json`**: Refreshed by `npm install --ignore-scripts` followed by `npm update @babel/preset-env --ignore-scripts` (see Deviations §1 for why the second invocation was necessary).
  - `sn-plugin-lib` resolves to exactly `0.1.43` (per `lock.packages['node_modules/sn-plugin-lib'].version`).
  - `@babel/preset-env` resolves to `7.29.5` per D-02.
  - Cosmetic root drift fixed: lockfile now reads `name: "SnAlign", version: "0.3.0"` (was `snalign 0.2.1`).
- **`node_modules/sn-plugin-lib/`**: Materialised at 0.1.43 (gitignored; not in the commit).
- Files in commit: exactly two — `package.json` and `package-lock.json`. No `.claude/` scaffolding, no `src/` files, no STACK.md.

### Commit 2 — `docs(02): update STACK.md to reflect sn-plugin-lib ^0.1.43` (`c832f3e`)

- **`.planning/codebase/STACK.md` line 41** (§Frameworks bullet): `^0.1.19` → `^0.1.43` and `resolved 0.1.34 in` → `resolved 0.1.43 in`. All other markup byte-identical.
- **`.planning/codebase/STACK.md` line 60** (§Key Dependencies bullet): `^0.1.19` → `^0.1.43`. Surrounding prose byte-identical, line 60 stays annotation-free (matches pre-edit asymmetry).
- Files in commit: exactly one — `.planning/codebase/STACK.md`.

## CI Gate Evidence (D-05 — real branch)

Captured at HEAD `c832f3e` (after both commits), reproducing Phase 1's ghost-evidence on the real branch:

| Gate | Command | Exit | Notes |
|------|---------|------|-------|
| 1. ESLint | `npx eslint src/ App.tsx index.js __tests__/` | `0` | No output (clean) |
| 2. Prettier | `npx prettier --check "src/**/*.{ts,tsx}" "App.tsx" "index.js" "__tests__/**/*.ts"` | `0` | `All matched files use Prettier code style!` |
| 3. TypeScript | `npx tsc --noEmit` | `0` | Strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes — reproduces `.planning/research/lib-0.1.43-ghost-tsc.log` |
| 4. Jest | `npx jest` | `0` | `Tests: 87 passed, 87 total` across 7 suites — reproduces `.planning/research/lib-0.1.43-ghost-jest.log` |
| 5. Build | `npm run build` | `0` | `build/outputs/SnAlign.snplg` produced at `267016` bytes |

## Lockfile / Resolution Invariants

```
sn-plugin-lib in package.json:  ^0.1.43
sn-plugin-lib in node_modules:  0.1.43
lockfile root name+version:     SnAlign 0.3.0   (was: snalign 0.2.1 — D-07 fixed)
lockfile sn-plugin-lib version: 0.1.43
lockfile @babel/preset-env:     7.29.5          (was: 7.29.3 — D-02 picked up)
```

All four sn-plugin-lib invariants asserted in Task 2's automated `<verify>` block hold; the D-02 freebie asserted `>= 7.29.5` and now resolves to exactly `7.29.5`.

## Branch / Commit Graph (D-09, D-10)

```
* c832f3e (HEAD) docs(02): update STACK.md to reflect sn-plugin-lib ^0.1.43
* b10eae6        chore(02): bump sn-plugin-lib to ^0.1.43 and refresh lockfile
| (dev tip)
```

- `git rev-list --count dev..HEAD` → `2`.
- `git diff --name-only dev HEAD` → exactly three paths: `.planning/codebase/STACK.md`, `package-lock.json`, `package.json`.
- No `src/`, `App.tsx`, `index.js`, `__tests__/` modifications — phase boundary holds (G-2, ROADMAP §"Phase 2: Compatibility Upgrade" goal #2).

## Deviations from Plan

### 1. [Rule 3 — Blocking] @babel/preset-env did not pick up 7.29.5 on first `npm install`

- **Found during:** Task 2, after the first `npm install --ignore-scripts`.
- **Issue:** D-02 expected `@babel/preset-env` to land at `7.29.5` as a within-caret freebie of the single `npm install`. However, the existing lockfile entry was already at `7.29.3` (still within the `^7.25.3` declared range), so npm respected the lockfile pin rather than refreshing it. Lockfile `@babel/preset-env` resolved to `7.29.3`, below the plan's `x >= 5` acceptance bar.
- **Fix:** Ran `npm update @babel/preset-env --ignore-scripts` to force the within-caret update. `@babel/preset-env` now resolves to `7.29.5` as D-02 mandated.
- **Why auto-applied:** D-02 is encoded in the plan's `must_haves.truths` (truth #12) and as a strict acceptance criterion (`x >= 5`). Without this fix, Task 2's automated `<verify>` block and acceptance criterion #5 would have failed on the chore commit's premise.
- **Commit:** Both invocations land in the same `chore(02): bump sn-plugin-lib to ^0.1.43 and refresh lockfile` commit (`b10eae6`) — the chore commit's intent is a single dependency-bump unit per D-10, and the explicit `npm update` is part of producing the lockfile state D-02 describes.
- **Files modified:** `package-lock.json` only (no `package.json` change — declared range stays `^7.25.3`).

### 2. [Rule 3 — Worktree setup] Worktree branch was forked from main, not dev

- **Found during:** Task 1 readiness check.
- **Issue:** The worktree `worktree-agent-a8f4422b0214a76bc` was forked from `main` (commit `451a8b9`), not `dev` (commit `0a3b1df`). The `.planning/` tree did not exist in the working directory because the planning commits live on `dev` and have not yet propagated to `main`. The plan_context's required acceptance criterion ("`merge-base HEAD origin/dev` should equal current `origin/dev`") could not have been met.
- **Fix:** Rebased the worktree branch onto local `dev` (`git rebase dev`). Rebase was clean (no conflicts, no commits to replay because the worktree branch had no commits on top of main yet). The `.planning/` tree is now present at HEAD.
- **Why auto-applied:** This is a worktree-setup blocker (Rule 3), not an architectural decision. The orchestrator's intent (per plan_context) was clearly to base off `dev`; the fix restores the expected state without changing any plan-derived content. No destructive operations were used (no `git reset --hard`, no `git clean`, no `git update-ref`).
- **No commit:** This was a pre-task fixup of the worktree's base ref; the resulting commit graph is the same as if the worktree had been spawned from `dev` directly.

### Documented non-deviations (audit trail)

- **Task 1 branch creation skipped, per plan_context guidance.** The plan_context explicitly noted that worktree mode reinterprets Task 1 — the worktree branch (`worktree-agent-*`) becomes the work branch and the orchestrator handles the rename to `chore/ricardo/02-sn-plugin-lib-upgrade` at merge time. No `git checkout dev && git pull` was executed (the main worktree owns `dev` and a checkout would fail). No `prune-merged-locals` snippet ran (worktree's local-branch namespace is per-worktree, not the main repo's). `git branch --show-current = chore/ricardo/02-sn-plugin-lib-upgrade` is verified post-merge by the orchestrator, not inside the worktree.
- **No on-device sideload performed** per D-06 — explicit Phase 4 territory (UPGRADE-04).
- **No `src/` edits** per D-04 (trust Phase 1 ghost evidence) and the phase boundary. The 87/87 jest pass on the real branch corroborates Phase 1's classification of every call site as `unchanged`.

## Authentication Gates

None — this plan does not touch any network resource requiring auth. `npm install` ran against the public npm registry over the existing HTTPS trust chain (lockfile SRI hashes are the integrity anchor per T-02-02).

## Requirements Coverage

| Requirement | Status | Evidence |
|---|---|---|
| UPGRADE-01 | Done on branch | `package.json` declares `^0.1.43`; `npm install` resolved cleanly; lockfile and `node_modules` invariants all green; jest's 87/87 pass implies the resolution is consistent. |
| UPGRADE-02 | Done on branch | Gate 3 (`npx tsc --noEmit`) exit 0 under strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`. No `@ts-expect-error` added, no `any` suppressions added (no `src/` files modified). |
| UPGRADE-03 | Done on branch | Gate 4 (`npx jest`) exit 0; `Tests: 87 passed, 87 total`. No mocks updated (Phase 1 audit §2 confirmed every call site `unchanged`, so existing structural-type stubs still match). |

ROADMAP Phase 2 success criteria #1-#4 are observably TRUE on this branch (the same checks GitHub Actions will re-run on the PR).

## Known Stubs

None — this is a dependency-bump-only plan; no UI changes, no new data flows, no placeholder text introduced.

## Threat Flags

None — no new endpoints, no auth surfaces, no file-access patterns, no schema changes at trust boundaries. The plan's `<threat_model>` already enumerated T-02-01..T-02-04, all of which are `mitigate` and were applied as written (T-02-01: `--ignore-scripts` on both npm invocations; T-02-02: lockfile carries SRI hashes and the resolved-version invariants assert byte-correct landings; T-02-03: executor does not push or open the PR — handed to the user at Task 5; T-02-04: no secrets touched).

## Hand-off (Task 5 — Checkpoint)

This is the `checkpoint:human-verify` hand-off. The executor stops here. The orchestrator surfaces the checkpoint to the user; the user pushes the branch and opens the PR per D-09 and `.claude/skills/git/SKILL.md` "Never push directly to dev or main".

**What the user needs to do (after orchestrator merges the worktree branch into `chore/ricardo/02-sn-plugin-lib-upgrade` on the main checkout):**

1. Confirm the branch state on the main checkout:
   - `git branch --show-current` → `chore/ricardo/02-sn-plugin-lib-upgrade`
   - `git log --oneline dev..HEAD` → 2 commits top-down: `docs(02): update STACK.md to reflect sn-plugin-lib ^0.1.43`, `chore(02): bump sn-plugin-lib to ^0.1.43 and refresh lockfile`
   - `git diff --name-only dev HEAD` → 3 paths (`.planning/codebase/STACK.md`, `package-lock.json`, `package.json`)
2. Spot-check `node -p "require('sn-plugin-lib/package.json').version"` → `0.1.43`.
3. (Optional, ~2-3 min) Re-run the 5 CI gates from `.claude/skills/git/SKILL.md` lines 73-77 to satisfy yourself before pushing — they passed at Task 3 plus the post-rewrite recap captured above.
4. Push and open the PR to `dev`:
   - `git push -u origin chore/ricardo/02-sn-plugin-lib-upgrade`
   - `gh pr create --base dev --title "chore(02): sn-plugin-lib compatibility upgrade — ^0.1.19 → ^0.1.43" --body "<body — Phase 2 context, CI-gate checklist, link to .planning/research/lib-0.1.19-to-0.1.43-audit.md>"`
5. Reply with one of: `approved` / `re-run gates` / free-form notes.

**Resume signal** (per the plan): `approved` (PR opened on dev), `re-run gates`, or describe an issue that requires plan revision.

## Self-Check: PASSED

- **Created file** `.planning/phases/02-compatibility-upgrade/02-01-SUMMARY.md` — verified by the file being written successfully (this section is appended after the write).
- **Modified files match Frontmatter:**
  - `package.json` — FOUND in HEAD~1 stat, `"sn-plugin-lib": "^0.1.43"` on line 17.
  - `package-lock.json` — FOUND in HEAD~1 stat, root reads `SnAlign 0.3.0`, `sn-plugin-lib@0.1.43`, `@babel/preset-env@7.29.5`.
  - `.planning/codebase/STACK.md` — FOUND in HEAD stat, lines 41 and 60 carry `^0.1.43`.
- **Commits:**
  - `b10eae6 chore(02): bump sn-plugin-lib to ^0.1.43 and refresh lockfile` — FOUND in `git log`.
  - `c832f3e docs(02): update STACK.md to reflect sn-plugin-lib ^0.1.43` — FOUND in `git log`.
- **No phase-boundary breach:** `git diff --name-only dev HEAD -- src/ App.tsx index.js __tests__/` is empty.
- **Checkpoint Task 5 not auto-completed:** No `git push`, no `gh pr create` ran. The worktree HEAD remains on `worktree-agent-a8f4422b0214a76bc` for the orchestrator to merge into `chore/ricardo/02-sn-plugin-lib-upgrade`.
