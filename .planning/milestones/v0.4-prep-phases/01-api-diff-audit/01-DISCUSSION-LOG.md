# Phase 1: API Diff Audit - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-17
**Phase:** 1-API Diff Audit
**Areas discussed:** Audit methodology, Net-new API scope, Breaking classification rubric, Audit verification step

---

## Audit methodology

### Q1: What's the primary diff approach for the audit?

| Option | Description | Selected |
|--------|-------------|----------|
| Ghost-upgrade as primary signal | Scratch branch, bump to ^0.1.43, run `tsc --noEmit` + `jest`; augment with `.d.ts` diff for completeness on APIs we don't call. Highest signal, lowest effort, directly produces Phase 2's punch list. | ✓ |
| Side-by-side `.d.ts` machine diff | Install both versions into scratch dirs, diff their `lib/typescript/src/**/*.d.ts` trees. Methodical, exhaustive coverage, noisier. | |
| Manual API-surface inventory from source/docs | Read both versions by hand, build the audit from scratch. Risky to rely on alone. | |

**User's choice:** Ghost-upgrade as primary signal.

### Q2: When package types, package source, and supernote.com docs disagree, which wins?

| Option | Description | Selected |
|--------|-------------|----------|
| Source > types > docs | Treat `node_modules/sn-plugin-lib/src/**/*.ts` as ground truth; `.d.ts` is ergonomics signal; docs are a hint, not authority. Audit notes disagreements explicitly. | ✓ |
| Types > source > docs | TS declarations are what call sites consume; use `.d.ts` as the audit's spine. Cleaner audit but risks missing behavioral changes. | |
| Docs > types > source | Treat supernote.com docs as contract. Probably wrong here given the README is empty and no CHANGELOG ships. | |

**User's choice:** Source > types > docs.
**Notes:** No real public repo (`repository.url = git+http://null.git`), no CHANGELOG. The npm tarball + supernote.com docs are the only available sources.

### Q3: What's the audit baseline given package.json says ^0.1.19 but lockfile resolved 0.1.34?

| Option | Description | Selected |
|--------|-------------|----------|
| Strict 0.1.19 baseline | Lock baseline scratch install to `sn-plugin-lib@0.1.19` exactly. Matches UPGRADE-05 wording; 0.1.34→0.1.43 sub-diff falls out as sanity check. | ✓ |
| 0.1.34 baseline (what's installed) | Diff from 0.1.34. Smaller diff. Risks missing 0.1.19→0.1.34 changes the requirements expect us to document. | |
| Both, side-by-side | Document full 0.1.19→0.1.43 surface, call out which landed in 0.1.20–0.1.34 vs 0.1.35–0.1.43. Best fidelity, more work. | |

**User's choice:** Strict 0.1.19 baseline.

### Q4: Beyond the main audit doc, what evidence artifacts do we preserve?

| Option | Description | Selected |
|--------|-------------|----------|
| Audit doc + raw diff appendix in .planning/research/ | Single `lib-0.1.19-to-0.1.43-audit.md` as consumable; raw evidence committed alongside as `lib-0.1.19-to-0.1.43-dts.diff` and `lib-0.1.43-ghost-tsc.log`. | ✓ |
| Audit doc only, evidence inline | Quote tsc errors / diff snippets inline. Cleaner planning dir, harder to verify claims later. | |
| Audit doc + scratch branch preserved | Push ghost-upgrade branch (`audit/lib-0.1.43-scratch`) so anyone can re-run tsc. Reproducible, pollutes branches. | |

**User's choice:** Audit doc + raw diff appendix in .planning/research/.

---

## Net-new API scope

### Q1: How broad should net-new API coverage be?

| Option | Description | Selected |
|--------|-------------|----------|
| Call sites + 4 targeted answers + adjacent-domain net-new | Mandatory call-site sweep + 4 ROADMAP questions; plus enumerate net-new in domains we use (Manager/CommAPI/FileAPI). Skip unrelated domains with one-line note. | ✓ |
| Call sites + 4 targeted answers only | Tightest scope. Risk: misses net-new in unsurveyed domains that could unlock SnAlign value. | |
| Full exported-symbol inventory | Catalog every net-new export across all domains. High completeness, mostly irrelevant to SnAlign. | |

**User's choice:** Call sites + 4 targeted answers + adjacent-domain net-new.

### Q2: What counts as 'AsyncStorage available' for ADOPT-01?

| Option | Description | Selected |
|--------|-------------|----------|
| Empirically verify by sideload-importing AsyncStorage in the ghost branch | Add `import AsyncStorage` in ghost, no-op call; if it builds + would run per types, AsyncStorage is "available". Definitive paper-and-types answer. | |
| Static check only — grep for AsyncStorage refs + new KV APIs in types | Survey sn-plugin-lib's native side (android/, *.podspec, src/) for AsyncStorage bundling signals; survey types for new KV methods. Paper-only. | ✓ |
| Defer the verification to Phase 3 | Phase 1 only flags 'possibly available'. Phase 3 proves it. Risk: Phase 3 plan is shapeless until Phase 1 commits. | |

**User's choice:** Static check only.
**Notes:** Keeps Phase 1 as pure paper analysis. On-device runtime proof deferred to Phase 3/4 sideload.

### Q3: How does the audit treat modifyButtonRes?

| Option | Description | Selected |
|--------|-------------|----------|
| Type + source check, defer behavior to sideload | Audit answers: type signature still declared? source still implements it? any reliability commit/comment? Flag 'paper says present, on-device reliability deferred to Phase 4'. | ✓ |
| Same as call sites — try it in the ghost upgrade | Actually call modifyButtonRes() in the ghost branch. Yields behavioral answer in Phase 1 but overlaps Phase 4. | |
| Out of scope for Phase 1 | Skip entirely. Loses one of the 4 ROADMAP-mandated questions. | |

**User's choice:** Type + source check, defer behavior to sideload.

### Q4: Should the audit cross-reference the sn-plugin skill's gotchas?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — prefigure Phase 4 SKILL-01 audit with a checklist | Walk API surface, mark each existing gotcha 'still valid' / 'resolved' / 'needs sideload-verify'. No skill-file edits yet — produces Phase 4's source-of-truth list. | ✓ |
| No — keep Phase 1 audit focused | Cleaner phase boundary. Phase 4 redoes work. | |
| Only the gotchas SnAlign currently relies on | Limit to call-site-relevant gotchas. Middle ground. | |

**User's choice:** Yes — prefigure Phase 4 SKILL-01 audit.

---

## Breaking classification rubric

### Q1: How sharp should the 'Breaking' classification be?

| Option | Description | Selected |
|--------|-------------|----------|
| Three buckets: Breaking / Behavioral / Net-new — strict definitions | Breaking = compilation fails OR runtime contract changed for SnAlign call sites. Behavioral = same signature, different behavior. Net-new = additions only. Exactly one bucket per change. | ✓ |
| Two buckets: Affects-SnAlign / Doesn't-affect-SnAlign | Skip type-vs-behavior distinction. Simpler but loses info Phase 4 needs. | |
| Free-form per-API entry with tags | Free-form paragraphs with `[breaking]` / `[behavioral]` / `[new]` tags. Readable, harder to programmatically consume. | |

**User's choice:** Three buckets with strict definitions.

### Q2: How does the rubric handle type-only widening/narrowing under strict TS?

| Option | Description | Selected |
|--------|-------------|----------|
| Counts as Breaking when it fails our tsconfig | If 0.1.43 types compile stock-strict but fail our `noUncheckedIndexedAccess` / `exactOptionalPropertyTypes`, it's Breaking for SnAlign. Audit notes the exact flag. | ✓ |
| Counts as Behavioral, not Breaking | Reserve 'Breaking' for runtime/API contract; treat type-tightening separately. Cleaner separation. | |
| Counts as Breaking only if it's a genuine API surface change | Pure flag-driven tightening is 'config-only' fix. Risk: practical effect identical under our tsconfig. | |

**User's choice:** Counts as Breaking when it fails our tsconfig.

### Q3: How does the rubric handle removed/deprecated APIs SnAlign doesn't use?

| Option | Description | Selected |
|--------|-------------|----------|
| Document as 'Removed/Deprecated', flag SnAlign-impact = None | Each removal gets an entry with `SnAlign-impact: None - not currently called`. No Phase 2 action but stays useful for skill updates. | ✓ |
| Skip entirely if SnAlign doesn't use it | Tightest doc. Loses skill-update signal. | |
| List in a single 'Removed APIs' appendix paragraph | One-line each. Compromise. | |

**User's choice:** Document as 'Removed/Deprecated', flag SnAlign-impact = None.

### Q4: Does each audit entry need a Phase 2/3 action recommendation?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — every Breaking and Behavioral entry gets a `Phase 2 action` line | Concrete file+line+change. Net-new entries get a `Phase 3 candidate` flag (yes/no/needs-eval). Makes audit directly executable. | ✓ |
| Pure description — no recommendations | Phase 2 planner reads audit and decides actions. Loses author's context. | |
| Recommendations only for Breaking entries | Breaking gets actions; Behavioral and Net-new are description-only. Risk: Behavioral entries deferred indefinitely. | |

**User's choice:** Yes — every Breaking and Behavioral entry gets a `Phase 2 action` line.

---

## Audit verification step

### Q1: What's the verification bar for Phase 1's audit?

| Option | Description | Selected |
|--------|-------------|----------|
| Audit + ghost-tsc + ghost-jest evidence | Audit doc + ghost-upgrade `tsc --noEmit` and `jest` outputs committed as appendix. Every Breaking entry traces to a tsc/test failure or is tagged `paper-only`. | ✓ |
| Audit doc only — reviewer sanity-check | Done = audit doc passes goal-backward review. No required ghost-tsc artifact. Faster, relies on reviewer. | |
| Audit + ghost-build evidence (tsc + jest + npm run build) | Adds `npm run build`. Strongest evidence but creeps into Phase 2 UPGRADE-04 territory. | |

**User's choice:** Audit + ghost-tsc + ghost-jest evidence.

### Q2: What happens to the ghost-upgrade scratch branch after Phase 1 completes?

| Option | Description | Selected |
|--------|-------------|----------|
| Delete after audit committed | Audit's evidence files are reproducible from any 0.1.43 install. Keeps branch list clean. | ✓ |
| Keep until Phase 2 lands | Hold scratch as a reference Phase 2 can diff against. Risk: branch drifts and becomes stale. | |
| Promote scratch to Phase 2 starting point | Scratch becomes Phase 2's branch. Saves re-doing the bump. Couples phase boundaries. | |

**User's choice:** Delete after audit committed.

### Q3: Does the audit need an explicit 'Unknowns / Paper-only claims' section?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — explicit Unknowns section | Numbered list of paper-only claims (e.g. `modifyButtonRes` reliability, AsyncStorage runtime presence, `setLassoBoxState(2)` commit semantics). Phase 4 sideload's test plan. | ✓ |
| No — unknowns inline per entry | Each affected entry tags `[needs sideload-verify]`. Unified doc, harder to enumerate. | |
| No — trust the audit is complete | If audit can't answer definitively, it doesn't go in. Risk: silent gaps surface in Phase 4. | |

**User's choice:** Yes — explicit Unknowns section.

### Q4: Does the audit's Phase 2 action lines need cross-validation?

| Option | Description | Selected |
|--------|-------------|----------|
| Audit stands alone; Phase 2's gsd-plan-phase consumes it | Phase 1 verifier just confirms ROADMAP coverage. Phase 2 planner reads the audit during its own research. Audit IS the contract. | ✓ |
| Phase 1 verifier confirms each Phase 2 action is concrete | Verifier walks each `Phase 2 action` line. Adds planning-rehearsal pass. | |
| Audit + a one-page Phase 2 punch list | Audit doc + derived `phase-2-punch-list.md`. Duplication. | |

**User's choice:** Audit stands alone.

---

## Claude's Discretion

- Audit doc structure / heading hierarchy / table column ordering — standard markdown table conventions.
- Citation density — every claim cites a source (file path + line for source/types, URL for docs), free to pick concise notation.
- Whether to cite git refs — moot; `sn-plugin-lib` has no public repo, so citations are to npm tarball paths only.

## Deferred Ideas

- Empirical AsyncStorage verification in the ghost branch — deferred to Phase 3/4 sideload (D-07).
- Empirical `modifyButtonRes` call in the ghost branch — deferred to Phase 4 sideload (D-08).
- Promoting the ghost-upgrade scratch to Phase 2's starting branch — rejected (D-15); Phase 2 starts fresh off `dev`.
- Phase 1 verifier cross-validating each `Phase 2 action:` line — rejected (D-17); Phase 2's planner handles it.
- Full exported-symbol inventory across all SDK domains — rejected (D-06); only adjacent-domain net-new makes the cut.
