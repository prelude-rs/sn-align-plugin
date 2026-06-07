# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v0.4-prep — sn-plugin-lib 0.1.43 Upgrade

**Shipped:** 2026-06-07
**Phases:** 4 | **Plans:** 10 | **Sessions:** ~6 across 2026-05-17 → 2026-06-07

### What Was Built

- **Phase 1: API Diff Audit** (6 plans, PR #33) — written audit at `.planning/research/lib-0.1.19-to-0.1.43-audit.md` covering Breaking / Behavioral / Net-new buckets + §6 four targeted answers (AsyncStorage, modifyButtonRes, page-bounds, lasso/page APIs) + §7 cross-reference table + §8 unknowns. The load-bearing artifact every downstream phase consumed.
- **Phase 2: Compatibility Upgrade** (1 plan, PR #34) — `sn-plugin-lib ^0.1.19` → `^0.1.43` bump; all 87 Jest tests + tsc + lint green on the new lib.
- **Phase 3: Adopt High-Value Wins** (1 plan, PR #35) — ADOPT-01 (persistent storage) + ADOPT-02 (5 simplification candidates) both Declined paper-dispositive per audit. Dead `KvBackend` scaffolding removed (87 → 77 tests).
- **Phase 4: Sideload Verify and Skill Propagation** (2 plans, PR #36 + #37 follow-up) — on-device verification on A5X2 (14-row checklist: 13 PASS + 1 PAPER-ONLY + 0 FAIL); shared `~/.claude/skills/sn-plugin/` skill propagated to reflect 0.1.43 reality.

### What Worked

- **The audit-first sequencing.** Phase 1 producing a written audit before any code change meant every later phase's decision was already justified before the work started. The audit's §6 targeted answers ("Is AsyncStorage now bundled? Is `modifyButtonRes` bridged? …") preempted the ADOPT-01/02 work — Phase 3 reached "Declined" in one short session because the audit had already done the heavy investigation.
- **Paper-dispositive decline.** Phase 3 declined 7 candidate adoptions (ADOPT-01 + 5 ADOPT-02 candidates + 1 derived) without a single code experiment, because the audit's evidence base was strong enough on its own. Saved the whole "scratch branch + ghost integration + revert" cycle.
- **Two-plan split in Phase 4 (D-05).** Plan 04-01 (sideload empirics) and Plan 04-02 (skill propagation) running as sequential waves meant 04-02 consumed the device verdicts as concrete inputs ("audit §8.1 PASS → stamp api-gotchas rows 10 + 12") rather than as paper assumptions.
- **CONTEXT D-06 direct writes.** Phase 4 Plan 04-02 wrote directly to the shared `~/.claude/skills/sn-plugin/` files (outside the repo) without diff capture or mirror copying. The live skill file IS the audit record; the SUMMARY one-line-per-change is enough provenance. Cleaner than mirroring.
- **Audit §7 cross-reference table as the source-of-truth checklist.** Plan 04-02's edits map 1:1 against §7.1/§7.2/§7.3/§7.4 — each subsection drove an explicit skill-file change list. No invented edits.

### What Was Inefficient

- **Local node_modules drift went unnoticed for 3 weeks.** Phase 2 bumped `package.json` + `package-lock.json` to ^0.1.43 (2026-05-17, PR #34) but the local `node_modules/sn-plugin-lib/` was never refreshed via `npm ci`. The Phase 4 sideload artifact built locally on 2026-06-06 was actually linked against 0.1.34 bytes, not 0.1.43. Fixed via the PR #37 follow-up (re-link + re-sideload PASS, 266,513 B → 266,749 B size delta confirmed different lib bytes). The audit-transitivity argument saved the verdict, but the original SUMMARY claim was literally inaccurate for ~24 hours.
- **GSD-executor agent froze twice.** During Phase 4 execution, the executor's continuation agent (writing 04-01-SUMMARY) and the gsd-verifier dispatch both froze on what should have been straightforward writes. Resolved by re-spawning the continuation and by completing the verifier work inline. Worth investigating: is there a specific prompt-shape or context-length pattern that triggers the freeze?
- **Squash-merge / local-dev divergence cost a PR cycle.** Phase 4 was branched off STALE local `dev` (which still carried Phase 3's individual pre-squash commits). PR #36 opened with conflicts; required a targeted `git rebase --onto origin/dev` and four manual conflict resolutions in STATE/ROADMAP/REQUIREMENTS/PROJECT. Plan 04-01 Task 1 Step 1 had `git checkout dev && git pull origin dev` in the spec — the executor did the checkout but skipped the pull. Tightening the safe-resume gate to assert `git rev-list --count dev..origin/dev = 0` before branching would catch this.
- **ROADMAP Phase 1 status was stale for ~3 weeks.** Phase 1 shipped 2026-05-17 (PR #33) but ROADMAP.md kept showing "0/6 Not started" because the team-shareable ROADMAP wasn't kept in sync with the disk artifacts. Caught at milestone-close by `roadmap.analyze` (disk_status: complete vs roadmap_complete: false).
- **REQUIREMENTS.md body checkboxes drifted from the status table for 4 of 6 v1 requirements** (UPGRADE-01/02/03/05). The status table at the bottom got updated automatically as phases completed; the human-readable checkbox section did not. Both got fixed inline at milestone-close, but the convention "body + table both" wasn't auto-enforced.

### Patterns Established

- **Paper-dispositive Decline.** A requirement that says "If X is available, do Y" can be closed via written evidence ("X is not available, here's the proof") without a code experiment. ADOPT-01 + ADOPT-02 both used this pattern. Saves the cost of speculatively wiring code that gets reverted.
- **Hybrid verified-on stamping (CONTEXT D-14).** Per-row stamps on the artifacts that changed (api-gotchas rows 10 + 12), file-level header bump on the artifacts that didn't (SKILL.md line 147). Granular where the granularity matters, coarse where it doesn't. Used in Plan 04-02 for the sn-plugin skill propagation.
- **Audit-transitivity argument for sub-version verification.** Phase 4's 0.1.34-linked sideload was retroactively justified by Phase 1's audit covering the full 0.1.19 → 0.1.43 range with "no breaking changes for SnAlign's call surface". Empirical evidence on a sub-version is sufficient when the audit covers the superset.
- **Re-link follow-up PR.** When the literal version claim diverges from what was actually exercised, a small follow-up PR with an addendum section is cleaner than rewriting history on the closed milestone PR. Preserves PR continuity + creates a separate audit trail of the discrepancy.

### Key Lessons

1. **After any phase that bumps `package.json` / `package-lock.json`, `npm ci` (or `npm install`) must run before the next local build.** CI uses `npm ci` so the lockfile is the truth there; only the local-build-then-sideload path is exposed. Worth a one-line note in `.claude/skills/git/SKILL.md` or in the setup-and-build skill.
2. **Audit *before* you adopt.** A written audit changes the cost calculus for adoption work from "experiment → revert" to "evidence → decision". Phase 1's audit deflected 7 candidate adoptions; the alternative cost would have been ~5-10 scratch branches.
3. **Squash-merge plus untracked PLAN files = silent divergence.** When `origin/dev` uses squash-merge and PLAN files aren't committed (Phase 4 case), a new branch off stale local `dev` looks correct until the PR opens. A pre-execute gate `git rev-list --count dev..origin/dev = 0` would catch this in ~1 second.
4. **Worktree isolation conflicts with project-named branches in the plan body.** Plan 04-01 Task 1 Step 2 instructed creating `chore/ricardo/04-sideload-verify-skill` as the work branch, but worktree isolation requires `worktree-agent-*` namespace. The orchestrator correctly dropped worktree isolation for that plan, but only after noticing the conflict. Plans that prescribe their own branch name should declare `isolation: sequential` explicitly.
5. **Tracking-file drift is the gravity well.** ROADMAP.md Phase 1 status, REQUIREMENTS.md body checkboxes, STATE.md `milestone:` field — all drifted independently across phases. Catching this at milestone-close worked but felt late. A lightweight `gsd-tools query tracking.audit` that compares disk truth against tracking-file claims would be worth running between phases.

### Cost Observations

- Model mix: predominantly Opus (Claude Code default for this session)
- Sessions: ~6 across 3 weeks; the bulk of execution was in 2 high-density sessions (Phase 2 + Phase 3 on 2026-05-17 / 2026-05-18; Phase 4 on 2026-06-06 / 2026-06-07)
- Notable: Phase 4 took 2 calendar days (build + sideload + summary across 2026-06-06 → 2026-06-07) as a hands-on hardware session. The wall-clock cost was the device interaction, not the AI work.
- Subagent freezes (continuation agent during Plan 04-01 Task 3; gsd-verifier during phase verification) cost ~2 retries' worth of wall-clock but didn't compromise correctness — the inline fallback worked.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v0.4-prep | ~6 | 4 | First milestone using `/gsd-*` workflow end-to-end (project intake → roadmap → discuss → plan → execute → verify → archive). Audit-first sequencing established. |

### Cumulative Quality

| Milestone | Tests | CI Gates | Decline Rate |
|-----------|-------|----------|--------------|
| v0.4-prep | 77 (was 87 pre-Phase-3 KV-test deletion) | 5/5 green throughout | 7 / 7 adoption candidates declined paper-dispositive (100%) |

### Recurring Themes

- **Tracking drift** between disk artifacts and ROADMAP / REQUIREMENTS / STATE — caught at milestone-close in v0.4-prep, worth a pre-phase audit hook for future milestones.
- **Squash-merge / local-dev sync gap** — bit once in v0.4-prep, mitigated via targeted `git rebase --onto origin/dev`. Worth a pre-execute safe-resume gate.

---

*Retrospective last updated: 2026-06-07 — v0.4-prep close-out.*
