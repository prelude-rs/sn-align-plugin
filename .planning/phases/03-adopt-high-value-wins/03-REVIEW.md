---
phase: 03-adopt-high-value-wins
reviewed: 2026-05-17T00:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - src/storage/anchorStorage.ts
  - __tests__/anchorStorage.test.ts
findings:
  critical: 0
  warning: 1
  info: 3
  total: 4
status: issues_found
---

# Phase 3: Code Review Report

**Reviewed:** 2026-05-17
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

Phase 3-01 is a YAGNI cleanup of `src/storage/anchorStorage.ts` and `__tests__/anchorStorage.test.ts`. The diff removes `KvBackend`, `createKvBackedAnchorStorage`, `ANCHOR_STORAGE_KEY`, the private helpers `parseEnvelope` / `serialiseEnvelope` / `SCHEMA_VERSION`, and the 10-test `describe('KV-backed storage', ...)` block. The in-memory backend is the only remaining implementation.

The cleanup is mechanically sound:

- All four required test coverage anchors survive (`load defaults`, `save round-trip`, `setConfig` orthogonality, `setAnchorBox` orthogonality, `getDefaultAnchorStorage` singleton + reset).
- No stale imports — `isAlignmentConfig`, `isAnchorBox`, and `Logger` were correctly dropped when their last consumer (`parseEnvelope` / `createKvBackedAnchorStorage`) was removed.
- TS strict (`noUnusedLocals`, `noUnusedParameters`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`) holds — no array index access, no optional-property gymnastics, all spreads preserve required fields.
- The orthogonality invariant (`config` ⟂ `anchorBox`) is intact: `setConfig` spreads `{...current, config}`, `setAnchorBox` spreads `{...current, anchorBox: box}`, and the two surviving tests assert each direction.
- Comment citations `Phase 3 D-04` and `audit §6.1` cross-check against `03-CONTEXT.md` line 42, `03-01-SUMMARY.md` lines 33/49/68, and `03-01-PLAN.md` line 19.
- No surviving file references the deleted symbols (verified by grep over `src/`, `index.js`, and `__tests__/`).

One latent correctness issue carries over from before this phase but becomes more salient now that the in-memory backend is the only path: `buildStorage.setConfig` / `setAnchorBox` do an `await read()` then `await write()` with no serialization, so two concurrently-pending callbacks can interleave their read-modify-write and clobber the orthogonal slot. See WR-01. The remaining findings are minor.

## Warnings

### WR-01: `setConfig` / `setAnchorBox` read-modify-write is not serialized

**File:** `src/storage/anchorStorage.ts:55-62`
**Issue:** Both helpers do an `await read()` followed by `await write({...current, ...})`. The two `await`s yield to the microtask queue. For the in-memory backend `read`/`write` are trivial, but they are still declared `async`, so even with a single backend two overlapping callers can interleave:

1. Call A (`setConfig`) `await read()` → sees `{config: cfg0, anchorBox: box0}`.
2. Call B (`setAnchorBox`) `await read()` → also sees `{config: cfg0, anchorBox: box0}` (A has not yet written).
3. Call A `await write({...current, config: cfgA})` → state is now `{config: cfgA, anchorBox: box0}`.
4. Call B `await write({...current, anchorBox: boxB})` → state is now `{config: cfg0, anchorBox: boxB}`.

A's `cfgA` is silently lost and the "orthogonal slot" guarantee is violated even though each call only touched one slot.

In the current handler design this collision is unlikely (settings callbacks fire one at a time from React events, `setAnchorBox` is only invoked from Apply & Re-anchor which tears down the popup, and the `.catch(onPatchError)` adapter awaits each call). But the top-of-file comment claims orthogonality is "load-bearing," and Phase 3 has now removed the KV backend that would have justified the `async` interface — the in-memory race surface is the only remaining race surface, and it should match the documented guarantee.

**Fix:** Serialize the read-modify-write through a per-storage promise chain so concurrent settings callbacks queue rather than interleave. Minimal patch:

```ts
const buildStorage = (
  read: () => Promise<AnchorState>,
  write: (state: AnchorState) => Promise<void>,
): AnchorStorage => {
  let chain: Promise<void> = Promise.resolve();
  const enqueue = <T>(task: () => Promise<T>): Promise<T> => {
    const next = chain.then(task);
    chain = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  };
  return {
    load: read,
    save: state => enqueue(() => write(state)),
    setConfig: config =>
      enqueue(async () => {
        const current = await read();
        await write({...current, config});
      }),
    setAnchorBox: box =>
      enqueue(async () => {
        const current = await read();
        await write({...current, anchorBox: box});
      }),
  };
};
```

Alternatively, accept the race explicitly and document it in the top-of-file comment so future readers do not over-rely on the "orthogonal" framing.

## Info

### IN-01: `AnchorEnvelope` is exported but has no current consumer

**File:** `src/storage/anchorStorage.ts:31-35`
**Issue:** The v3 envelope type is exported but no source file or test imports it after this phase. The block comment on lines 27-30 documents the deliberate intent ("preserved as the future-migration anchor"), so this is not accidental dead code — but TypeScript's `noUnusedLocals` does not flag unused *exports*, so the trip-wire that would normally catch a future drift is absent.
**Fix:** Either (a) accept the documented forward-compat hook as-is — the comment is sufficient and the type is one line; or (b) add a one-line type-only round-trip in the test file to keep the symbol exercised, e.g.:

```ts
// Keep AnchorEnvelope v3 importable: future migrations parse this envelope.
const _env: AnchorEnvelope = {version: 3, config: DEFAULT_ALIGNMENT_CONFIG, anchorBox: null};
void _env;
```

Optional — the current state is intentional.

### IN-02: `DEFAULT_ANCHOR_STATE` is not frozen at runtime

**File:** `src/storage/anchorStorage.ts:37-40`
**Issue:** `AnchorState` / `AlignmentConfig` are `readonly` at the type level only; the value at runtime is a plain mutable object. `createMemoryAnchorStorage()` (no-arg call site in `getDefaultAnchorStorage`) does `let state = initial`, so the singleton's initial `state` is `DEFAULT_ANCHOR_STATE` by reference until the first `save` / `setConfig` / `setAnchorBox` replaces it with a fresh object. Any caller that bypasses the type system (e.g., a future test using `as any`) and mutates `state.config.offsetX` in place would corrupt the module-level constant and bleed into every subsequent `__resetDefaultAnchorStorageForTest` cycle.
**Fix:** Defensive freeze on the export:

```ts
export const DEFAULT_ANCHOR_STATE: AnchorState = Object.freeze({
  config: DEFAULT_ALIGNMENT_CONFIG,
  anchorBox: null,
});
```

Pre-existing — not introduced by this phase. Low priority.

### IN-03: No test covers `setConfig` / `setAnchorBox` starting from `DEFAULT_ANCHOR_STATE`

**File:** `__tests__/anchorStorage.test.ts:43-54`
**Issue:** Both orthogonality tests pre-seed via `createMemoryAnchorStorage(sampleState)`, so the read-modify-write path is only exercised against a non-default state. A regression that broke `{...current, config}` when `current.anchorBox === null` (the default) would not be caught. Pre-cleanup the equivalent KV test also pre-seeded with `s.save(sampleState)`, so this is a carry-over coverage gap, not a regression introduced by Phase 3.
**Fix:** Add one test exercising the empty-state path:

```ts
it('setConfig from DEFAULT_ANCHOR_STATE preserves null anchorBox', async () => {
  const s = createMemoryAnchorStorage();
  await s.setConfig(sampleConfig);
  expect(await s.load()).toEqual({config: sampleConfig, anchorBox: null});
});
```

Cheap and rounds out the orthogonality matrix.

---

_Reviewed: 2026-05-17_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
