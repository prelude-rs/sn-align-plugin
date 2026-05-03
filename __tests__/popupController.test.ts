import {__testing__, getCurrentState, hidePopup, showPopup, subscribe, updatePopup} from '../src/ui/popupController';
import {DEFAULT_ALIGNMENT_CONFIG} from '../src/core/anchor';
import type {AlignmentPopupCallbacks} from '../src/ui/AlignmentPopup';

afterEach(() => __testing__.reset());

const noop = () => {};
const stubCallbacks = (): AlignmentPopupCallbacks => ({
  onSetAnchorRef: noop,
  onSetTargetRef: noop,
  onToggleAlignX: noop,
  onToggleAlignY: noop,
  onSetOffsetX: noop,
  onSetOffsetY: noop,
  onSetAnchor: noop,
  onApply: noop,
  onClose: noop,
});

describe('popupController', () => {
  it('starts inactive with default config and no anchor', () => {
    expect(getCurrentState()).toEqual({
      active: false,
      config: DEFAULT_ALIGNMENT_CONFIG,
      hasAnchor: false,
      outOfBounds: false,
      noLasso: false,
      callbacks: null,
    });
  });

  it('emits state on show with full popup args + callbacks', () => {
    const events: unknown[] = [];
    const unsub = subscribe(s => events.push(s));
    expect(events[0]).toMatchObject({active: false});

    const cbs = stubCallbacks();
    showPopup({config: DEFAULT_ALIGNMENT_CONFIG, hasAnchor: true, outOfBounds: false, noLasso: false}, cbs);
    expect(getCurrentState()).toMatchObject({
      active: true,
      config: DEFAULT_ALIGNMENT_CONFIG,
      hasAnchor: true,
      outOfBounds: false,
      noLasso: false,
      callbacks: cbs,
    });

    hidePopup();
    expect(getCurrentState().active).toBe(false);
    unsub();
  });

  it('subscribe replays current state immediately (race-safe)', () => {
    const cbs = stubCallbacks();
    showPopup({config: DEFAULT_ALIGNMENT_CONFIG, hasAnchor: false, outOfBounds: false, noLasso: false}, cbs);

    let received: unknown = null;
    const unsub = subscribe(s => {
      received = s;
    });
    expect(received).toMatchObject({active: true, hasAnchor: false, callbacks: cbs});
    unsub();
  });

  it('subscribe returns an unsubscribe that stops further notifications', () => {
    let count = 0;
    const unsub = subscribe(() => count++);
    showPopup(
      {config: DEFAULT_ALIGNMENT_CONFIG, hasAnchor: false, outOfBounds: false, noLasso: false},
      stubCallbacks(),
    );
    unsub();
    hidePopup();
    showPopup({config: DEFAULT_ALIGNMENT_CONFIG, hasAnchor: true, outOfBounds: false, noLasso: false}, stubCallbacks());
    expect(count).toBe(2);
  });

  it('updatePopup patches without changing callbacks or active', () => {
    const cbs = stubCallbacks();
    showPopup({config: DEFAULT_ALIGNMENT_CONFIG, hasAnchor: false, outOfBounds: false, noLasso: false}, cbs);
    updatePopup({hasAnchor: true, outOfBounds: true});
    expect(getCurrentState()).toMatchObject({
      active: true,
      hasAnchor: true,
      outOfBounds: true,
      callbacks: cbs,
    });
  });

  it('updatePopup is a no-op when popup is inactive', () => {
    updatePopup({hasAnchor: true});
    expect(getCurrentState().active).toBe(false);
    expect(getCurrentState().hasAnchor).toBe(false);
  });

  it('hide clears callbacks and resets to default state', () => {
    showPopup({config: DEFAULT_ALIGNMENT_CONFIG, hasAnchor: true, outOfBounds: false, noLasso: false}, stubCallbacks());
    expect(getCurrentState().callbacks).not.toBeNull();
    hidePopup();
    expect(getCurrentState()).toEqual({
      active: false,
      config: DEFAULT_ALIGNMENT_CONFIG,
      hasAnchor: false,
      outOfBounds: false,
      noLasso: false,
      callbacks: null,
    });
  });
});
