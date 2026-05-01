import {
  __testing__,
  getCurrentState,
  hidePopup,
  showPopup,
  subscribe,
  type PopupCallbacks,
} from '../src/ui/popupController';
import {DEFAULT_ANCHOR_STATE} from '../src/storage/anchorStorage';

afterEach(() => __testing__.reset());

const noop = () => {};
const stubCallbacks = (): PopupCallbacks => ({
  onSetAlignmentType: noop,
  onClearAnchor: noop,
  onClose: noop,
});

describe('popupController', () => {
  it('starts inactive with default alignmentType and no anchor', () => {
    expect(getCurrentState()).toEqual({
      active: false,
      alignmentType: DEFAULT_ANCHOR_STATE.alignmentType,
      hasAnchor: false,
      callbacks: null,
    });
  });

  it('emits state on show with active alignmentType + hasAnchor + callbacks', () => {
    const events: unknown[] = [];
    const unsub = subscribe(s => events.push(s));
    expect(events[0]).toMatchObject({active: false});

    const cbs = stubCallbacks();
    showPopup('top-left', true, cbs);
    expect(getCurrentState()).toEqual({
      active: true,
      alignmentType: 'top-left',
      hasAnchor: true,
      callbacks: cbs,
    });

    hidePopup();
    expect(getCurrentState().active).toBe(false);
    unsub();
  });

  it('subscribe replays current state immediately (race-safe)', () => {
    const cbs = stubCallbacks();
    showPopup('right', false, cbs);

    let received: unknown = null;
    const unsub = subscribe(s => {
      received = s;
    });
    expect(received).toEqual({
      active: true,
      alignmentType: 'right',
      hasAnchor: false,
      callbacks: cbs,
    });
    unsub();
  });

  it('subscribe returns an unsubscribe that stops further notifications', () => {
    let count = 0;
    const unsub = subscribe(() => count++);
    showPopup('top', false, stubCallbacks());
    unsub();
    hidePopup();
    showPopup('left', true, stubCallbacks());
    expect(count).toBe(2);
  });

  it('hide clears callbacks and resets to default state', () => {
    showPopup('bottom-right', true, stubCallbacks());
    expect(getCurrentState().callbacks).not.toBeNull();
    hidePopup();
    expect(getCurrentState()).toEqual({
      active: false,
      alignmentType: DEFAULT_ANCHOR_STATE.alignmentType,
      hasAnchor: false,
      callbacks: null,
    });
  });
});
