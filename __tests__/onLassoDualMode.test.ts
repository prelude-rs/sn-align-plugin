import {onLassoMain, type LassoDeps} from '../src/handlers/onLassoMain';
import {createMemoryAnchorStorage, DEFAULT_ANCHOR_STATE, type AnchorState} from '../src/storage/anchorStorage';
import type {Rect} from '../src/core/anchor';
import {release} from '../src/core/reentrancyGuard';

afterEach(() => release());

const ok = <T>(result: T) => ({success: true, result});

const stubLogger = () => {
  const logs: string[] = [];
  return {
    logs,
    logger: {
      log: (m: string) => logs.push(`[log] ${m}`),
      warn: (m: string) => logs.push(`[warn] ${m}`),
      error: (m: string) => logs.push(`[err] ${m}`),
    },
  };
};

const buildDeps = (initial: AnchorState, lassoRect: Rect = {left: 500, top: 600, right: 600, bottom: 650}) => {
  const getLassoRect = jest.fn(async () => ok(lassoRect));
  const resizeLassoRect = jest.fn(async () => ok(true));
  const setLassoBoxState = jest.fn(async () => ok(true));
  const closePluginView = jest.fn(async () => true);
  const onAnchorSaved = jest.fn();
  const {logger} = stubLogger();
  const storage = createMemoryAnchorStorage(initial);
  const deps: LassoDeps = {
    comm: {getLassoRect, resizeLassoRect, setLassoBoxState, closePluginView},
    storage,
    logger,
    onAnchorSaved,
  };
  return {
    deps,
    storage,
    getLassoRect,
    resizeLassoRect,
    setLassoBoxState,
    closePluginView,
    onAnchorSaved,
  };
};

describe('onLassoMain (dual-mode)', () => {
  describe('Set Anchor branch (no anchor saved)', () => {
    it('saves the lasso bbox as the new anchorBox', async () => {
      const lassoRect: Rect = {left: 10, top: 20, right: 30, bottom: 40};
      const {deps, storage, onAnchorSaved} = buildDeps(DEFAULT_ANCHOR_STATE, lassoRect);
      expect(await onLassoMain(deps)).toBe('ok-saved');
      expect(await storage.load()).toEqual({
        alignmentType: DEFAULT_ANCHOR_STATE.alignmentType,
        anchorBox: lassoRect,
      });
      expect(onAnchorSaved).toHaveBeenCalledTimes(1);
    });

    it('does NOT call resizeLassoRect when saving an anchor', async () => {
      const {deps, resizeLassoRect} = buildDeps(DEFAULT_ANCHOR_STATE);
      await onLassoMain(deps);
      expect(resizeLassoRect).not.toHaveBeenCalled();
    });

    it('always calls setLassoBoxState(2) and closePluginView in finally', async () => {
      const {deps, setLassoBoxState, closePluginView} = buildDeps(DEFAULT_ANCHOR_STATE);
      await onLassoMain(deps);
      expect(setLassoBoxState).toHaveBeenCalledWith(2);
      expect(closePluginView).toHaveBeenCalled();
    });
  });

  describe('Apply Alignment branch (anchor saved)', () => {
    const anchored: AnchorState = {
      alignmentType: 'top-left',
      anchorBox: {left: 100, top: 200, right: 300, bottom: 400},
    };

    it('translates the lasso so its corner lands on the anchor', async () => {
      const lassoRect: Rect = {left: 500, top: 600, right: 600, bottom: 650};
      const {deps, resizeLassoRect} = buildDeps(anchored, lassoRect);
      expect(await onLassoMain(deps)).toBe('ok-applied');
      // top-left: dx = 100-500 = -400, dy = 200-600 = -400
      expect(resizeLassoRect).toHaveBeenCalledWith({
        left: 100,
        top: 200,
        right: 200,
        bottom: 250,
      });
    });

    it('returns noop when the lasso already aligns to the anchor', async () => {
      const aligned: Rect = {left: 100, top: 200, right: 999, bottom: 999};
      const {deps, resizeLassoRect} = buildDeps(anchored, aligned);
      expect(await onLassoMain(deps)).toBe('noop');
      expect(resizeLassoRect).not.toHaveBeenCalled();
    });

    it('does NOT mutate storage on apply', async () => {
      const {deps, storage} = buildDeps(anchored);
      await onLassoMain(deps);
      expect(await storage.load()).toEqual(anchored);
    });

    it('returns failed when resizeLassoRect rejects', async () => {
      const {deps} = buildDeps(anchored);
      deps.comm.resizeLassoRect = jest.fn(async () => ({
        success: false,
        error: {code: 1, message: 'rejected'},
      }));
      expect(await onLassoMain(deps)).toBe('failed');
    });

    it('does NOT call onAnchorSaved on apply', async () => {
      const {deps, onAnchorSaved} = buildDeps(anchored);
      await onLassoMain(deps);
      expect(onAnchorSaved).not.toHaveBeenCalled();
    });
  });

  it('rejects re-entry while busy', async () => {
    const {deps, closePluginView} = buildDeps(DEFAULT_ANCHOR_STATE);
    // Hold the guard by stalling getLassoRect.
    let resolve!: () => void;
    deps.comm.getLassoRect = jest.fn(
      () =>
        new Promise(r => {
          resolve = () => r(ok({left: 0, top: 0, right: 1, bottom: 1}));
        }),
    );
    const first = onLassoMain(deps);
    // While the first is still mid-flight, fire a second.
    const second = await onLassoMain(deps);
    expect(second).toBe('busy');
    expect(closePluginView).toHaveBeenCalled();
    resolve();
    await first;
  });
});
