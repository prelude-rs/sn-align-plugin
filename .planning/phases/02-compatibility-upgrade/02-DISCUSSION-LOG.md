---
phase: 02-compatibility-upgrade
type: discussion-log
date: 2026-05-17
---

# Phase 2 — Discussion Log

## Pre-discussion stance

Phase 1's audit (`.planning/research/lib-0.1.19-to-0.1.43-audit.md`) had already proved the 0.1.19 → 0.1.43 upgrade is mechanically safe (tsc clean, jest 87/87 under strict TS flags). Phase 2's character shifted from the original ROADMAP framing ("absorb type-surface drift; update mocks") to "make the bump official + re-verify CI green on the real branch". So the discussion focused on real residual gray areas rather than re-litigating settled questions.

## Gray areas surfaced

Four real-decision gates were surfaced; two narrow follow-ups came out of the user's "any other dep we can upgrade?" reply.

### G1 — Test-mock pre-check approach

**Question:** Walk the structural type stubs defensively, or trust the green tests?

**Choice:** **Trust the green tests** (D-04).
**Rationale:** Phase 1's ghost-jest evidence is dispositive — 87/87 pass under 0.1.43 means structural stubs match where it counts. A defensive walk could surface paper-level shape drift the current usage doesn't exercise, but that's a "fix things that ain't broke" exercise.

### G2 — Lockfile cosmetic drift (`name`/`version: 0.2.1` vs `package.json: 0.3.0`)

**Question:** Sync alongside the upgrade, separate housekeeping commit, or don't touch?

**Choice:** **Sync alongside the upgrade** (D-07).
**Rationale:** `npm install` already touches the lockfile during the SDK bump; letting it sync the cosmetic drift in the same commit yields the cleanest final state with zero extra effort.

### G3 — `.planning/codebase/STACK.md` line 41 update timing

**Question:** Update inside Phase 2 (the trigger), or defer to Phase 4 SKILL-04 sweep?

**Choice:** **Update inside Phase 2** (D-08).
**Rationale:** The upgrade IS the drift trigger. One-line edit; including it in the upgrade PR keeps `.planning/codebase/` accurate without waiting for Phase 4.

### G4 — Scope add beyond the bump itself

**User reply:** "any other dependency we can upgrade?"

This triggered a `npm outdated` investigation. Breakdown:

- **Within-caret patch:** `@babel/preset-env: 7.29.3 → 7.29.5` — freebie.
- **Locked by external constraint:** `react`, `react-native`, `@react-native/*` (RN 0.79.2 locked by Supernote PluginHost; React tracks RN). Cannot bump.
- **Major bumps requiring their own audit:** `typescript` 5→6, `jest` 29→30, `eslint` 8→10, `@react-native-community/cli` 18→20.

#### G4a — Babel patch inclusion

**Choice:** **Include the freebie** (D-02). Same Phase 2 CI gates validate it.

#### G4b — Major-bump backlog capture

**Choice:** **Backlog as a future milestone** (D-05). Each major bump can break independently — they need their own audit pattern, just as `sn-plugin-lib` did in Phase 1. Capturing in REQUIREMENTS.md v2 / backlog rather than just CONTEXT.md `<deferred>` because it's project-scope work, not phase-scope.

## Areas NOT discussed (already locked)

- **Caret pin `^0.1.43`** — ROADMAP success criterion #1 verbatim.
- **No `src/` edits** — Phase 1 audit §2 confirmed every call site is `unchanged`; the only Breaking entry (B-01 `updateLassoRect → resizeLassoRect`) has SnAlign-impact: None.
- **Branch model** — `<type>/<user>/<short-desc>` per the project `git` skill, target `dev`. Same posture as Phase 1.
- **ADOPT-01/02, SKILL-01..05, UPGRADE-04 sideload** — explicitly belong to Phase 3/4 per ROADMAP / REQUIREMENTS.md.

## Result

Phase 2's CONTEXT.md captures 10 locked decisions (D-01..D-10). Scope: `package.json` bump + lockfile refresh (cosmetic-drift sync as a bonus) + `@babel/preset-env` patch freebie + `.planning/codebase/STACK.md` line edit + local CI gates + PR to `dev`. ~15 min phase given Phase 1's prep work.
