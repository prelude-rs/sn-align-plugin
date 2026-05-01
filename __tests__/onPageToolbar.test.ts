import {onPageToolbar, type PageDeps} from '../src/handlers/onPageToolbar';
import {createMemoryAnchorStorage, DEFAULT_ANCHOR_STATE, type AnchorState} from '../src/storage/anchorStorage';
import {__testing__ as popupTesting, getCurrentState} from '../src/ui/popupController';
import {release} from '../src/core/reentrancyGuard';

afterEach(() => {
  popupTesting.reset();
  release();
});

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

const buildDeps = (initial: AnchorState = DEFAULT_ANCHOR_STATE) => {
  const close = jest.fn(async () => true);
  const onAnchorCleared = jest.fn();
  const {logger} = stubLogger();
  const storage = createMemoryAnchorStorage(initial);
  const deps: PageDeps = {
    comm: {closePluginView: close},
    storage,
    logger,
    onAnchorCleared,
  };
  return {deps, close, storage, onAnchorCleared};
};

describe('onPageToolbar', () => {
  it('shows popup with the loaded alignmentType + hasAnchor', async () => {
    const {deps} = buildDeps({
      alignmentType: 'right',
      anchorBox: {left: 1, top: 2, right: 3, bottom: 4},
    });
    expect(await onPageToolbar(deps)).toBe('ok');
    const popup = getCurrentState();
    expect(popup.active).toBe(true);
    expect(popup.alignmentType).toBe('right');
    expect(popup.hasAnchor).toBe(true);
  });

  it('starts with hasAnchor=false when no anchor saved', async () => {
    const {deps} = buildDeps();
    await onPageToolbar(deps);
    expect(getCurrentState().hasAnchor).toBe(false);
    expect(getCurrentState().alignmentType).toBe(DEFAULT_ANCHOR_STATE.alignmentType);
  });

  it('onSetAlignmentType updates storage but leaves anchorBox alone', async () => {
    const initial: AnchorState = {
      alignmentType: 'left',
      anchorBox: {left: 10, top: 20, right: 30, bottom: 40},
    };
    const {deps, storage, close} = buildDeps(initial);
    await onPageToolbar(deps);
    const cb = getCurrentState().callbacks!;
    await cb.onSetAlignmentType('bottom-right');
    expect(await storage.load()).toEqual({
      alignmentType: 'bottom-right',
      anchorBox: initial.anchorBox,
    });
    expect(close).toHaveBeenCalled();
    expect(getCurrentState().active).toBe(false);
  });

  it('onClearAnchor clears box, leaves alignmentType, calls onAnchorCleared hook', async () => {
    const initial: AnchorState = {
      alignmentType: 'top',
      anchorBox: {left: 1, top: 2, right: 3, bottom: 4},
    };
    const {deps, storage, close, onAnchorCleared} = buildDeps(initial);
    await onPageToolbar(deps);
    const cb = getCurrentState().callbacks!;
    await cb.onClearAnchor();
    expect(await storage.load()).toEqual({
      alignmentType: 'top',
      anchorBox: null,
    });
    expect(onAnchorCleared).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalled();
  });

  it('onClose tears down without mutating storage', async () => {
    const initial: AnchorState = {
      alignmentType: 'top',
      anchorBox: {left: 1, top: 2, right: 3, bottom: 4},
    };
    const {deps, storage, close} = buildDeps(initial);
    await onPageToolbar(deps);
    await getCurrentState().callbacks!.onClose();
    expect(await storage.load()).toEqual(initial);
    expect(close).toHaveBeenCalled();
  });

  it('rejects re-entry while pipeline is busy', async () => {
    const {deps, close} = buildDeps();
    expect(await onPageToolbar(deps)).toBe('ok');
    // first invocation acquired the guard; second sees busy.
    expect(await onPageToolbar(deps)).toBe('busy');
    // close should have been called for the busy path's safe-close.
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('does NOT call setLassoBoxState (page handler is not lasso-bound)', async () => {
    // PageDeps's comm only exposes closePluginView, so the type
    // system already prevents calling setLassoBoxState here. This
    // test pins that contract.
    const {deps} = buildDeps();
    await onPageToolbar(deps);
    expect(deps.comm).not.toHaveProperty('setLassoBoxState');
  });
});
