# Testing Patterns

**Analysis Date:** 2026-05-17

## Test Framework

**Runner:**
- **Jest 29.6.3** (`package.json` devDeps)
- Config: `jest.config.js`

```js
module.exports = {
  preset: 'react-native',
};
```

That single line wires up Babel (`babel.config.js` → `module:@react-native/babel-preset`) for both `.ts` and `.tsx`, plus the React Native test environment defaults. No custom transforms, mock dirs, or coverage thresholds.

**Assertion library:** Jest built-in `expect` (no `chai`, `assert`, or `@testing-library/jest-native` add-ons).

**Mocking library:** Jest built-in `jest.fn()` / `mockImplementationOnce`. No `jest.mock(...)` module factories anywhere — all dependencies are injected via constructor args / a `deps` bag.

**TypeScript types:** `@types/jest: ^29.5.13` — tests are written in `.ts` (no `.tsx` test files, no component-render tests).

**Run commands:**
```bash
npm test                     # equivalent to `jest`
npx jest                     # direct
npm run coverage             # `jest --coverage`
npx jest __tests__/anchor    # run a single suite by path substring
npx jest -t "out-of-bounds"  # run by test name pattern
```

CI runs the coverage form: `npx jest --coverage` (see `.github/workflows/ci.yml:54`). Coverage output lands in `coverage/` (already populated locally and gitignored).

## Test File Organization

**Location:** all tests live in `__tests__/` at the project root — **not co-located** with source. Source under `src/` stays test-free.

**Naming:** every test file is named after the module it covers and ends in `.test.ts`. The mapping is 1:1:

| Test file | Source module |
|---|---|
| `__tests__/anchor.test.ts` (202 lines, 24 cases) | `src/core/anchor.ts` |
| `__tests__/anchorStorage.test.ts` (190 lines, 17 cases) | `src/storage/anchorStorage.ts` |
| `__tests__/i18n.test.ts` (104 lines, 10 cases) | `src/i18n/i18n.ts` |
| `__tests__/onLassoMain.test.ts` (241 lines, 16 cases) | `src/handlers/onLassoMain.ts` |
| `__tests__/pageSize.test.ts` (87 lines, 10 cases) | `src/sdk/pageSize.ts` |
| `__tests__/popupController.test.ts` (110 lines, 7 cases) | `src/ui/popupController.ts` |
| `__tests__/reentrancyGuard.test.ts` (22 lines, 3 cases) | `src/core/reentrancyGuard.ts` |

**Total: 87 tests across 7 suites.** Verified via `npx jest`:

```
Test Suites: 7 passed, 7 total
Tests:       87 passed, 87 total
```

**What is NOT tested:**
- React components (`AlignmentPopup.tsx`, `PopupRoot.tsx`, `ReferencePicker.tsx`) — no `react-test-renderer` calls in `__tests__/` despite `react-test-renderer` being a `devDependency`. UI is exercised indirectly through `popupController` and `onLassoMain` state assertions.
- `src/buttons/registerLassoButton.ts` / `src/buttons/buttonCommon.ts` — registration is driven entirely by firmware, no test harness today.
- `src/sdk/closeView.ts` and `src/sdk/unwrap.ts` — thin enough that they are covered transitively through callers.
- `index.js` (the dependency wiring) is not unit-tested; the contract is enforced by `onLassoMain.test.ts` building an equivalent `LassoDeps` from stubs.

## Test Structure

**Suite organization:** one or more top-level `describe(...)` blocks per file, named after the function or behaviour under test. Larger suites split by concern — `onLassoMain.test.ts` has two:

```ts
describe('onLassoMain — popup-driven entry', () => { ... });
describe('onLassoMain — popup callbacks',   () => { ... });
```

`anchor.test.ts` has five (`pointOnBox`, `computeAnchorShift`, `translateRect`, `isAnchorBox`, `isReferencePoint`, `isAlignmentConfig`), each mirroring one exported function.

**Test naming:** `it('<plain-English behaviour>', ...)` — full sentences that read as specs. Examples:
- `'hides the lasso menu (state 1) on entry, keeping the lasso alive for resize'`
- `'onApplyAndReAnchor does NOT update the anchor when target would exit page'`
- `'subscribe replays current state immediately (race-safe)'`
- `'coerces an invalid anchorBox to null but keeps a valid config'`

**Setup / teardown:**
- No `beforeEach` / `beforeAll` blocks anywhere. Each test builds its own deps inline via factory helpers (see below).
- `afterEach` is used **only** for resetting module-level singleton state:
  - `__tests__/reentrancyGuard.test.ts:3` — `afterEach(() => release())` to reset the busy flag.
  - `__tests__/popupController.test.ts:5` — `afterEach(() => __testing__.reset())` to clear listeners + state.
  - `__tests__/anchorStorage.test.ts:12` — `afterEach(() => __resetDefaultAnchorStorageForTest())` to clear the memoised default storage.
  - `__tests__/onLassoMain.test.ts:7-10` — combined reset:
    ```ts
    afterEach(() => {
      release();
      popupTesting.reset();
    });
    ```

The `__testing__.reset()` and `__resetDefaultAnchorStorageForTest()` hooks are exported from the source modules specifically for tests — see `src/ui/popupController.ts:65-70` and `src/storage/anchorStorage.ts:150-152`.

## Mocking

**Strategy: dependency injection over module mocking.** No `jest.mock(...)` calls exist in the codebase. Every firmware API (`PluginCommAPI`, `PluginFileAPI`, `PluginManager`) is reached through a typed `Deps` object built at the entry-point (`index.js`), so tests substitute hand-written stubs instead of patching modules.

**Stub-deps pattern** — canonical example in `__tests__/onLassoMain.test.ts:12-52`:

```ts
const ok = <T>(result: T) => ({success: true, result});

const stubLogger = () => {
  const logs: string[] = [];
  return {
    logs,
    logger: {
      log:  (m: string) => logs.push(`[log] ${m}`),
      warn: (m: string) => logs.push(`[warn] ${m}`),
      error: (m: string) => logs.push(`[err] ${m}`),
    },
  };
};

const buildDeps = (initial: AnchorState, lassoRect: Rect | null = {...}) => {
  const getLassoRect       = jest.fn(async () => lassoRect ? ok(lassoRect) : {success: false, error: {...}});
  const resizeLassoRect    = jest.fn(async () => ok(true));
  const setLassoBoxState   = jest.fn(async () => ok(true));
  const closePluginView    = jest.fn(async () => true);
  const getCurrentFilePath = jest.fn(async () => ok('/notes/foo.note'));
  const getCurrentPageNum  = jest.fn(async () => ok(0));
  const getPageSize        = jest.fn(async () => ok({width: 1920, height: 2560}));
  const {logger, logs}     = stubLogger();
  const storage            = createMemoryAnchorStorage(initial);
  const deps: LassoDeps = {
    comm: {getCurrentFilePath, getCurrentPageNum, getLassoRect, resizeLassoRect, setLassoBoxState, closePluginView},
    fileApi: {getPageSize},
    storage,
    logger,
  };
  return {deps, storage, getLassoRect, resizeLassoRect, setLassoBoxState, closePluginView, getPageSize, logs};
};
```

Key idioms used across all suites:
- `const ok = <T>(result: T) => ({success: true, result})` — happy-path `APIResponse<T>` factory.
- `const fail = <T>(message = 'boom'): APIResponse<T> => ({success: false, error: {code: 1, message}})` — failure factory (see `__tests__/pageSize.test.ts:5`).
- `jest.fn(async () => ...)` for every firmware call — defaults to happy path; tests override per-case with `.mockImplementationOnce(...)`.
- `buildDeps` returns the deps object **plus** every stub function (`getLassoRect`, `resizeLassoRect`, etc.), so the test can both wire the SUT and assert on call args without `(deps.comm.getLassoRect as jest.Mock)` casts.
- The returned `logs: string[]` array enables assertions like `expect(logs.some(l => l.includes('apply rejected'))).toBe(true)` (`onLassoMain.test.ts:200`).

**KV backend stub** for storage tests (`__tests__/anchorStorage.test.ts:28-42`):

```ts
const fakeKv = () => {
  const map = new Map<string, string>();
  return {
    map,
    backend: {
      getItem: jest.fn(async (key: string) => map.get(key) ?? null),
      setItem: jest.fn(async (key: string, value: string) => { map.set(key, value); }),
      removeItem: jest.fn(async (key: string) => { map.delete(key); }),
    },
  };
};
```

The returned `map` lets tests inject pre-existing malformed data (`map.set(ANCHOR_STORAGE_KEY, 'not json{')` at line 103) to exercise schema-version / coercion paths.

**Callbacks stub** for `popupController.test.ts` (lines 7-19): a `noop` arrow filling every required field of `AlignmentPopupCallbacks` so the controller can `showPopup(...)` with a valid object without the test having to invoke the callbacks.

**What to mock:**
- Firmware boundary (`PluginCommAPI`, `PluginFileAPI`, `PluginManager`) — always via injected stubs typed as the `*Like` structural shims (`LassoCommAPILike`, `PageSizeCommAPI`, `PluginManagerLike`).
- Persistent state (memory storage, KV backend) — via the `createMemoryAnchorStorage` factory or the `fakeKv()` helper.
- Logger — via `stubLogger()` which both captures and exposes a `logs` array.

**What NOT to mock:**
- Pure functions under `src/core/` (`computeAnchorShift`, `pointOnBox`, `translateRect`, `fitsInPage`, type guards). They are tested directly with literal inputs and `expect(...).toEqual(...)`.
- React components — no `react-test-renderer` use anywhere in `__tests__/`. UI behaviour is asserted via `popupController.getCurrentState()`.

## Fixtures and Factories

**No `__fixtures__/` directory.** All test data is inline in the test file or built via small factory functions.

**Common factory patterns:**

```ts
// __tests__/anchor.test.ts:18
const cfg = (patch: Partial<AlignmentConfig> = {}): AlignmentConfig => ({...DEFAULT_ALIGNMENT_CONFIG, ...patch});

// __tests__/anchorStorage.test.ts:14-26
const sampleConfig: AlignmentConfig = { anchorRef: 'top-right', ... };
const sampleState: AnchorState     = { config: sampleConfig, anchorBox: {left: 1, top: 2, right: 3, bottom: 4} };
```

The `cfg(patch)` factory in particular is the dominant style for `computeAnchorShift` tests — each case mutates only the field under test against the `DEFAULT_ALIGNMENT_CONFIG` baseline (see `__tests__/anchor.test.ts:41-107`).

**Sample rects** are inline literals — `{left, top, right, bottom}` with round numbers chosen so that the expected `dx`/`dy` is hand-verifiable in the assertion (e.g. `{left: 500, top: 600, right: 600, bottom: 650}` for a 100×50 selection at (500, 600)).

## Coverage

**No enforced threshold.** `jest.config.js` does not set `coverageThreshold`. `package.json` exposes `npm run coverage` (`jest --coverage`) and CI runs `npx jest --coverage` on every PR (`.github/workflows/ci.yml:54`), but the result is informational — the `test` job passes as long as the suite is green.

**What is verified (happy path + edges):**
- **Happy paths:** every public function in `src/core/`, `src/storage/`, `src/sdk/pageSize.ts`, `src/i18n/i18n.ts`, `src/ui/popupController.ts`, `src/handlers/onLassoMain.ts`.
- **Edge cases the suites specifically pin down:**
  - **Out-of-bounds:** `onApply` skips `resizeLassoRect` when the translated rect would exit the page (`onLassoMain.test.ts:186-201`); `onApplyAndReAnchor` additionally leaves the saved anchor untouched on the rejected path (lines 168-184), which is the "re-anchor rejection on failure" invariant from `CLAUDE.md`.
  - **Noop:** `computeAnchorShift` returns `{dx: 0, dy: 0}` when target reference already lands on anchor reference (`anchor.test.ts:109-116`).
  - **Reentry rejection:** the busy guard returns `'busy'` on a second call (`onLassoMain.test.ts:99-105`), and the standalone guard itself round-trips through acquire/release (`reentrancyGuard.test.ts`).
  - **Schema fallback:** older envelope versions (v1/v2), malformed JSON, partial `anchorBox`, invalid `config` — all fall through to `DEFAULT_ANCHOR_STATE` (`anchorStorage.test.ts:101-141`).
  - **Locale fallback:** unknown locale → `en`; unknown `zh-*` variant → `zh_TW`; BCP-47 hyphen normalised to underscore (`i18n.test.ts:39-96`).
  - **No-lasso state:** `noLasso=true` propagates to popup state when `getLassoRect` fails (`onLassoMain.test.ts:81-85`).
  - **Subscribe race:** new subscriber receives current state immediately (`popupController.test.ts:54-64`) — the "replay-on-subscribe" invariant.
  - **Settings orthogonality:** `setConfig` leaves `anchorBox` alone and vice versa (`anchorStorage.test.ts:61-72`) — pins the "`config` and `anchorBox` are orthogonal" architectural rule from `CLAUDE.md`.

**View coverage locally:**
```bash
npm run coverage   # or: npx jest --coverage
open coverage/lcov-report/index.html
```

## Test Types

**Unit tests** — everything in `__tests__/` is unit-scope: each suite imports one source module and exercises it in isolation, with the firmware boundary stubbed via injected deps. Pure functions (`src/core/anchor.ts`) are tested with literal inputs; stateful modules (`reentrancyGuard`, `popupController`, `anchorStorage`) reset their state in `afterEach`.

**Integration tests** — `onLassoMain.test.ts` is the closest thing to an integration test in the suite: it wires `createMemoryAnchorStorage` (real implementation), `popupController` (real implementation), and stubbed firmware APIs together, then drives the system through popup callbacks (`cbs.onApply()`, `cbs.onSetAnchor()`, …) and asserts on the resulting persistent state and firmware call args. Async callbacks are flushed via `await new Promise(r => setTimeout(r, 0))` (lines 115, 132, 146, 161, …).

**E2E tests** — None. No on-device test harness; verification on the Supernote A5X2 device is manual.

## Common Patterns

**Async flushing** after fire-and-forget callbacks (`onLassoMain.test.ts:115`):

```ts
const cbs = getCurrentState().callbacks!;
cbs.onSetAnchor();                          // fires an async chain but does not return a promise
await new Promise(r => setTimeout(r, 0));   // flush the microtask queue so storage writes settle
expect((await storage.load()).anchorBox).toEqual(lasso);
```

This idiom appears at every place the test invokes a `void`-returning popup callback. There is no `jest.useFakeTimers()` usage — real timers + a single tick of `setTimeout(0)` is sufficient.

**Failure injection** with `.mockImplementationOnce`:

```ts
// __tests__/pageSize.test.ts:29-30
comm.getCurrentFilePath.mockImplementationOnce(async () => fail('no file'));
```

Used to exercise each individual fallback branch in `resolvePageSize` independently. The default-happy stubs from `buildDeps()` are left untouched, so each test overrides exactly the call it wants to fail.

**Throw injection:**

```ts
// __tests__/pageSize.test.ts:55-57
comm.getCurrentFilePath.mockImplementationOnce(async () => {
  throw new Error('crash');
});
```

Used to verify the outer try/catch in `resolvePageSize` (`src/sdk/pageSize.ts:49-51`) routes the error to `logger.warn(\`... threw: ...\`)` rather than propagating.

**State assertion via the public getter:**

```ts
// __tests__/popupController.test.ts:33-47
showPopup({...}, cbs);
expect(getCurrentState()).toMatchObject({active: true, callbacks: cbs});
```

`getCurrentState()` is exported precisely so tests can verify the bus state without subscribing.

**Log-content assertions** check that the right `[align:<subsystem>]` prefix appears:

```ts
expect(logs.some(l => l.includes('apply rejected'))).toBe(true);   // onLassoMain.test.ts:200
expect(warns.some(w => w.includes('threw'))).toBe(true);            // pageSize.test.ts:61
```

The `logs`/`warns` arrays are returned from the stub-logger factory rather than asserted via `expect(jest.fn).toHaveBeenCalledWith(...)` — the substring match is more robust against message-format tweaks.

**Type-asserting on non-null callbacks** uses the postfix `!` once per test:

```ts
const cbs = getCurrentState().callbacks!;
```

The non-null assertion is justified because the test has just called `await onLassoMain(deps)` which always sets `callbacks` non-null on the `'opened'` path.

## CI Gate Structure

`.github/workflows/ci.yml` runs **4 parallel jobs** plus a **no-op aggregator**, all triggered on `pull_request` targeting `main` or `dev`:

| Job | Command | Purpose |
|---|---|---|
| `lint` | `npx eslint src/ App.tsx index.js __tests__/` | ESLint over source, entry points, and tests |
| `format` | `npx prettier --check "src/**/*.{ts,tsx}" "App.tsx" "index.js" "__tests__/**/*.ts"` | Prettier check |
| `typecheck` | `npx tsc --noEmit` | Strict TypeScript with `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` |
| `test` | `npx jest --coverage` | Full Jest suite + coverage |
| `build-check` | `echo "All checks passed."` | `needs: [lint, format, typecheck, test]` — no-op gate that branch protection on `dev` requires green before merging |

All four checker jobs use `actions/setup-node@v6` with `node-version: 20` and `cache: npm`, then `npm ci`. They run in parallel; only `build-check` is sequential because it `needs` the others.

The release workflow (`.github/workflows/release.yml`) re-runs lint + typecheck + test before tagging — see `CLAUDE.md` "Release flow" section.

---

*Testing analysis: 2026-05-17*
