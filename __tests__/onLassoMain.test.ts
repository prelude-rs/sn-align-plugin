import {onLassoMain, type LassoDeps} from '../src/handlers/onLassoMain';
import {createMemoryAnchorStorage, DEFAULT_ANCHOR_STATE, type AnchorState} from '../src/storage/anchorStorage';
import {DEFAULT_ALIGNMENT_CONFIG, type Rect} from '../src/core/anchor';
import {release} from '../src/core/reentrancyGuard';
import {__testing__ as popupTesting, getCurrentState} from '../src/ui/popupController';

afterEach(() => {
  release();
  popupTesting.reset();
});

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

const buildDeps = (initial: AnchorState, lassoRect: Rect | null = {left: 500, top: 600, right: 600, bottom: 650}) => {
  const getLassoRect = jest.fn(async () =>
    lassoRect ? ok(lassoRect) : {success: false, error: {code: 1, message: 'no lasso'}},
  );
  const resizeLassoRect = jest.fn(async () => ok(true));
  const setLassoBoxState = jest.fn(async () => ok(true));
  const closePluginView = jest.fn(async () => true);
  const getCurrentFilePath = jest.fn(async () => ok('/notes/foo.note'));
  const getCurrentPageNum = jest.fn(async () => ok(0));
  const getPageSize = jest.fn(async () => ok({width: 1920, height: 2560}));
  const {logger, logs} = stubLogger();
  const storage = createMemoryAnchorStorage(initial);
  const deps: LassoDeps = {
    comm: {
      getCurrentFilePath,
      getCurrentPageNum,
      getLassoRect,
      resizeLassoRect,
      setLassoBoxState,
      closePluginView,
    },
    fileApi: {getPageSize},
    storage,
    logger,
  };
  return {deps, storage, getLassoRect, resizeLassoRect, setLassoBoxState, closePluginView, getPageSize, logs};
};

describe('onLassoMain — popup-driven entry', () => {
  it('opens the popup with current state and returns "opened"', async () => {
    const {deps} = buildDeps(DEFAULT_ANCHOR_STATE);
    expect(await onLassoMain(deps)).toBe('opened');
    expect(getCurrentState().active).toBe(true);
    expect(getCurrentState().hasAnchor).toBe(false);
    expect(getCurrentState().noLasso).toBe(false);
  });

  it('hides the lasso menu (state 1) on entry, keeping the lasso alive for resize', async () => {
    const {deps, setLassoBoxState} = buildDeps(DEFAULT_ANCHOR_STATE);
    await onLassoMain(deps);
    expect(setLassoBoxState).toHaveBeenCalledWith(1);
    // Should NOT call state 2 yet — that happens on teardown.
    expect(setLassoBoxState).not.toHaveBeenCalledWith(2);
  });

  it('reflects existing anchorBox via hasAnchor=true', async () => {
    const anchored: AnchorState = {
      config: DEFAULT_ALIGNMENT_CONFIG,
      anchorBox: {left: 100, top: 200, right: 300, bottom: 400},
    };
    const {deps} = buildDeps(anchored);
    await onLassoMain(deps);
    expect(getCurrentState().hasAnchor).toBe(true);
  });

  it('sets noLasso=true when getLassoRect fails', async () => {
    const {deps} = buildDeps(DEFAULT_ANCHOR_STATE, null);
    await onLassoMain(deps);
    expect(getCurrentState().noLasso).toBe(true);
  });

  it('flags outOfBounds=true when current pick combo would push past page', async () => {
    const anchored: AnchorState = {
      config: {...DEFAULT_ALIGNMENT_CONFIG, anchorRef: 'right', targetRef: 'left'},
      anchorBox: {left: 1900, top: 100, right: 1910, bottom: 200},
    };
    // Lasso 100x50 at far left; computed shift would push the right edge to ~2010 > 1920.
    const lasso: Rect = {left: 0, top: 0, right: 100, bottom: 50};
    const {deps} = buildDeps(anchored, lasso);
    await onLassoMain(deps);
    expect(getCurrentState().outOfBounds).toBe(true);
  });

  it('rejects re-entry with "busy"', async () => {
    const {deps, closePluginView} = buildDeps(DEFAULT_ANCHOR_STATE);
    await onLassoMain(deps);
    const second = await onLassoMain(deps);
    expect(second).toBe('busy');
    expect(closePluginView).toHaveBeenCalled();
  });
});

describe('onLassoMain — popup callbacks', () => {
  it('onSetAnchor saves the lasso bbox as the anchor (whether one existed or not)', async () => {
    const lasso: Rect = {left: 10, top: 20, right: 30, bottom: 40};
    const {deps, storage, closePluginView, setLassoBoxState} = buildDeps(DEFAULT_ANCHOR_STATE, lasso);
    await onLassoMain(deps);
    const cbs = getCurrentState().callbacks!;
    cbs.onSetAnchor();
    await new Promise(r => setTimeout(r, 0));
    expect((await storage.load()).anchorBox).toEqual(lasso);
    expect(closePluginView).toHaveBeenCalled();
    // Teardown releases the lasso state.
    expect(setLassoBoxState).toHaveBeenCalledWith(2);
  });

  it('onSetAnchor overwrites an existing anchor with the current lasso bbox', async () => {
    const oldAnchor: AnchorState = {
      config: DEFAULT_ALIGNMENT_CONFIG,
      anchorBox: {left: 1, top: 1, right: 2, bottom: 2},
    };
    const newLasso: Rect = {left: 100, top: 200, right: 300, bottom: 400};
    const {deps, storage} = buildDeps(oldAnchor, newLasso);
    await onLassoMain(deps);
    const cbs = getCurrentState().callbacks!;
    cbs.onSetAnchor();
    await new Promise(r => setTimeout(r, 0));
    expect((await storage.load()).anchorBox).toEqual(newLasso);
  });

  it('onApply translates the lasso and calls setLassoBoxState(2)', async () => {
    const anchored: AnchorState = {
      config: {...DEFAULT_ALIGNMENT_CONFIG, anchorRef: 'top-left', targetRef: 'top-left'},
      anchorBox: {left: 100, top: 200, right: 300, bottom: 400},
    };
    const lasso: Rect = {left: 500, top: 600, right: 600, bottom: 650};
    const {deps, resizeLassoRect, setLassoBoxState} = buildDeps(anchored, lasso);
    await onLassoMain(deps);
    const cbs = getCurrentState().callbacks!;
    cbs.onApply();
    await new Promise(r => setTimeout(r, 0));
    expect(resizeLassoRect).toHaveBeenCalledWith({left: 100, top: 200, right: 200, bottom: 250});
    expect(setLassoBoxState).toHaveBeenCalledWith(2);
  });

  it('onApply skips resize when target would exit page (still releases on teardown)', async () => {
    const anchored: AnchorState = {
      config: {...DEFAULT_ALIGNMENT_CONFIG, anchorRef: 'right', targetRef: 'left'},
      anchorBox: {left: 1900, top: 100, right: 1910, bottom: 200},
    };
    const lasso: Rect = {left: 0, top: 0, right: 100, bottom: 50};
    const {deps, resizeLassoRect, setLassoBoxState, logs} = buildDeps(anchored, lasso);
    await onLassoMain(deps);
    const cbs = getCurrentState().callbacks!;
    cbs.onApply();
    await new Promise(r => setTimeout(r, 0));
    expect(resizeLassoRect).not.toHaveBeenCalled();
    // Teardown still releases the lasso state.
    expect(setLassoBoxState).toHaveBeenCalledWith(2);
    expect(logs.some(l => l.includes('apply rejected'))).toBe(true);
  });

  it('onSetAnchorRef persists the new ref and updates popup state', async () => {
    const {deps, storage} = buildDeps(DEFAULT_ANCHOR_STATE);
    await onLassoMain(deps);
    const cbs = getCurrentState().callbacks!;
    cbs.onSetAnchorRef('top-right');
    await new Promise(r => setTimeout(r, 0));
    expect((await storage.load()).config.anchorRef).toBe('top-right');
    expect(getCurrentState().config.anchorRef).toBe('top-right');
  });

  it('onSetGapX persists the new gap', async () => {
    const {deps, storage} = buildDeps(DEFAULT_ANCHOR_STATE);
    await onLassoMain(deps);
    const cbs = getCurrentState().callbacks!;
    cbs.onSetGapX(50);
    await new Promise(r => setTimeout(r, 0));
    expect((await storage.load()).config.gapX).toBe(50);
  });

  it('onToggleAlignY flips the toggle', async () => {
    const {deps, storage} = buildDeps(DEFAULT_ANCHOR_STATE);
    await onLassoMain(deps);
    const cbs = getCurrentState().callbacks!;
    cbs.onToggleAlignY();
    await new Promise(r => setTimeout(r, 0));
    expect((await storage.load()).config.alignY).toBe(false);
  });

  it('onClose tears down without mutating state', async () => {
    const {deps, storage, closePluginView} = buildDeps(DEFAULT_ANCHOR_STATE);
    await onLassoMain(deps);
    const before = await storage.load();
    const cbs = getCurrentState().callbacks!;
    cbs.onClose();
    await new Promise(r => setTimeout(r, 0));
    expect(await storage.load()).toEqual(before);
    expect(closePluginView).toHaveBeenCalled();
  });
});
