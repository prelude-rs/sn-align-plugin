# Phase 2: Compatibility Upgrade - Context

**Gathered:** 2026-05-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Land `sn-plugin-lib` at `^0.1.43` on `dev` with all CI gates green (lint, prettier, tsc, jest, build). No `src/` code changes. No adoption of new APIs (deferred to Phase 3). No on-device sideload (deferred to Phase 4). No `~/.claude/skills/sn-plugin/` edits (deferred to Phase 4 SKILL-01..05).

**In scope:** `package.json` bump from `^0.1.19` to `^0.1.43`. `package-lock.json` refresh (including incidental sync of the cosmetic `name`/`version: 0.2.1 → 0.3.0` drift). `@babel/preset-env` patch bump `7.29.3 → 7.29.5` as a within-caret freebie. Single line edit to `.planning/codebase/STACK.md:41` (and §"Key Dependencies" line 60 if it carries the same string) to reflect the new version. CI-gate verification on the feature branch before PR.

**Out of scope:** Any `src/` modification. Test mock changes (Phase 1's ghost-upgrade evidence already showed 87/87 jest pass; no mocks need updating). React / React Native bumps (locked at 19.0.0 / 0.79.2 by the Supernote PluginHost runtime). TypeScript / Jest / ESLint / RN community CLI major bumps — captured as deferred backlog item. Phase 3 `lassoElements` / `generateLassoPreview` / `showPluginView` spike work. Phase 4 SKILL-01..05 skill-file updates.

</domain>

<decisions>
## Implementation Decisions

### Dependency Pin Strategy
- **D-01:** **`sn-plugin-lib` pinned at `^0.1.43`** (caret) per ROADMAP success criterion #1. Production code uses the standard caret semver — exact pinning (Phase 1 D-04) was for audit-fidelity only, not the production target.
- **D-02:** **Include `@babel/preset-env` 7.29.3 → 7.29.5 as a within-caret freebie.** Already inside the `^7.25.3` range; the upgrade's `npm install` picks it up transparently. Same Phase 2 CI gates validate it.
- **D-03:** **React / React Native / `@react-native/*` stay locked.** RN 0.79.2 is the Supernote PluginHost runtime per `CLAUDE.md`; React tracks RN. No bump even though `npm outdated` lists newer versions.

### Verification Strategy
- **D-04:** **Trust the green Phase 1 evidence — skip a defensive structural-type-stub audit.** Phase 1's ghost-upgrade run produced `tsc` exit 0 + `jest` 87/87 pass under 0.1.43 with our strict TS flags. The structural stubs (`LassoCommAPILike`, `PageSizeFileAPI`, `PageSizeCommAPI`, `PluginManagerLike`, `ClosablePluginView`) compile clean — if anything had drifted in a way our current usage didn't exercise but still violated the contract, the test suite's mocks (which conform to those stubs) would have surfaced it.
- **D-05:** **Re-run all 5 local CI gates on the upgrade branch before PR** per `.claude/skills/git/SKILL.md` (eslint, prettier, tsc, jest, npm run build). Phase 1's evidence was on the ghost-scratch branch; Phase 2 confirms the same on the real branch with the real lockfile.
- **D-06:** **No on-device sideload in Phase 2** — explicitly Phase 4's UPGRADE-04 territory.

### Lockfile and Brownfield-doc Housekeeping
- **D-07:** **Sync the cosmetic lockfile drift in the same `npm install`.** Local `package-lock.json` has a stale `name`/`version: 0.2.1` (`package.json` is at `0.3.0`); `npm install` fixes this transparently as part of the upgrade. Final lockfile = clean.
- **D-08:** **Update `.planning/codebase/STACK.md` line 41 inside Phase 2** (and the matching string in §"Key Dependencies"): `sn-plugin-lib ^0.1.19 (resolved 0.1.34 in node_modules)` → `sn-plugin-lib ^0.1.43 (resolved 0.1.43 in node_modules)`. The upgrade is the trigger for the doc to drift; fix it in the same PR rather than waiting for Phase 4's SKILL-04 sweep.

### Branch / Commit / PR Shape
- **D-09:** **Feature branch off `dev`: `chore/ricardo/02-sn-plugin-lib-upgrade`** (matches `.claude/skills/git/SKILL.md` `<type>/<user>/<short-desc>` convention; `chore:` prefix because it's a dependency bump). PR targets `dev`.
- **D-10:** **Single commit for the dependency bump + lockfile sync** (`chore(02): bump sn-plugin-lib to ^0.1.43 and refresh lockfile`). The `STACK.md` line change is a separate commit (`docs(02): update STACK.md to reflect sn-plugin-lib ^0.1.43`) to keep dependency churn separate from docs churn. Keeps the PR's commit graph readable.

### Claude's Discretion
- Exact PR title and body wording (use Phase 1's pattern: `chore(02): sn-plugin-lib compatibility upgrade — ^0.1.19 → ^0.1.43`).
- Whether the per-CI-gate command output is included as PR comments or just as a passing checklist in the PR body.
- Whether `node_modules/sn-plugin-lib` content needs any pre-cleanup before `npm install` (current working tree may have 0.1.34 from the earlier sync; `npm install` reconciles it either way).
- Exact phrasing of the major-bump backlog item (see Deferred Ideas).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/ROADMAP.md` §"Phase 2: Compatibility Upgrade" — Goal, dependencies (Phase 1), requirements UPGRADE-01..03, the 4 success criteria.
- `.planning/REQUIREMENTS.md` §UPGRADE-01..03 — full requirement text; UPGRADE-04 (sideload) and UPGRADE-05 (audit) explicitly belong to other phases.
- `.planning/PROJECT.md` §"Active" + §"Key Decisions" — milestone framing and the "Code-ready milestone (no v0.4.0 tag)" decision.

### Phase 1 deliverables (Phase 2's source of truth)
- `.planning/research/lib-0.1.19-to-0.1.43-audit.md` — The audit. Phase 2 must NOT re-derive any classification; cite the audit's §2 (call-site sweep, all `unchanged` except B-01) and §3 (B-01 SnAlign-impact: None — already migrated).
- `.planning/research/lib-0.1.43-ghost-tsc.log` — Evidence of clean tsc.
- `.planning/research/lib-0.1.43-ghost-jest.log` — Evidence of 87/87 jest pass.
- `.planning/phases/01-api-diff-audit/01-VERIFICATION.md` — Phase 1 verifier's confirmation that all 4 ROADMAP criteria observed.

### Project conventions
- `CLAUDE.md` §"Commands" + §"Conventions" + §"Branch / PR workflow" — locked tech-stack invariants (RN 0.79.2, strict TS flags, build-check CI gate on `dev`).
- `.claude/skills/git/SKILL.md` — `<type>/<user>/<short-desc>` branch naming, target `dev` not `main`, "Run CI checks locally before opening PR" rule.

### Codebase brownfield maps (Phase 2 edits one of these)
- `.planning/codebase/STACK.md` §"Frameworks" line 41 + §"Key Dependencies" line 60 — strings to update per D-08.
- `.planning/codebase/INTEGRATIONS.md` §"Supernote Firmware SDK (`sn-plugin-lib`)" — Phase 1 audit confirms every call site `unchanged`; INTEGRATIONS.md needs no edit.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`__tests__/` suite** (87 tests, 7 suites): Already proven to pass under 0.1.43 by Phase 1's ghost-jest evidence. Phase 2 just re-runs them on the real branch as confirmation.
- **Structural type stubs in `src/`** (`LassoCommAPILike` at `src/handlers/onLassoMain.ts:43-46`, `PageSizeFileAPI`/`PageSizeCommAPI` at `src/sdk/pageSize.ts:26`, `PluginManagerLike` at `src/buttons/buttonCommon.ts:23`, `ClosablePluginView` at `src/sdk/closeView.ts`): Per Phase 1's audit §2, every method these stubs depend on is `unchanged` between 0.1.19 and 0.1.43. They keep matching by structural typing — no edits needed.

### Established Patterns
- **Caret semver in `package.json`**: every existing dep is caret-pinned (`^x.y.z`); `sn-plugin-lib` follows the same convention.
- **`commit_docs: true` in `.planning/config.json`**: orchestrator-owned planning files (STATE.md, ROADMAP.md, plan/summary docs) get committed automatically by GSD execution. Phase 2's plan-level commits land on the upgrade feature branch.

### Integration Points
- **`package.json` `dependencies.sn-plugin-lib`** — the single line being changed. Cascades into `package-lock.json` (via `npm install`) and into the resolved `node_modules/sn-plugin-lib/` tree.
- **`.planning/codebase/STACK.md`** lines 41 and 60 — the one brownfield-doc string drift Phase 2 fixes.

</code_context>

<specifics>
## Specific Ideas

- User explicitly raised "any other dependency we can upgrade?" — investigation showed `@babel/preset-env: 7.29.3 → 7.29.5` is a within-caret freebie (included per D-02). All other outdated entries are either locked by external constraint (RN family) or major bumps deserving their own audit (captured under Deferred Ideas).
- User picked the recommended option on every gray-area question — green-light to keep Phase 2 minimal.

</specifics>

<deferred>
## Deferred Ideas

- **Dev toolchain refresh milestone** — captured as a future REQUIREMENTS.md v2 item per D-05. Major bumps that each deserve their own phase:
  - `typescript`: 5.9.3 → 6.0.3 (TS 6 has language-level changes; needs its own audit similar to Phase 1)
  - `jest`: 29.7.0 → 30.4.2 + `@types/jest`: 29.5.14 → 30.0.0 (Jest 30 has config/migration changes)
  - `eslint`: 8.57.1 → 10.4.0 (flat config + rule renames)
  - `@react-native-community/cli`: 18.0.0 → 20.1.3 (RN tooling; dev only)
  These bumps are NOT in Phase 2 scope. The user signed off on capturing them in REQUIREMENTS.md backlog as a future milestone.

- **`react` minor/patch bump** (19.0.0 → 19.2.6) — within React 19, technically safe, but RN 0.79.2 ships React 19.0.0 by convention; bumping React in isolation can mismatch. Locked with the RN locked-version constraint until RN itself moves.

- **`@react-native/*` 0.79.2 → 0.84.1** — explicitly blocked by the Supernote PluginHost runtime version constraint (per `CLAUDE.md`). Would require coordinating with the firmware team.

- **Defensive structural-type-stub audit** (per the gray-area question) — declined per D-04 in favor of trusting Phase 1's green ghost-evidence. If a future regression surfaces, the audit becomes a follow-up phase.

</deferred>

---

*Phase: 2-Compatibility Upgrade*
*Context gathered: 2026-05-17*
