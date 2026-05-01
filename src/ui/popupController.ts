// Bridge between the popup-driven handler and the popup component.
// State carries the minimum the picker needs: the current
// alignmentType (drives the inverted "selected" cell) and whether
// any anchorBox is set (drives Clear button visibility). Storing the
// full anchorBox here would couple the picker to lasso bbox shape
// for no UI gain — the value isn't shown in the dialog.
//
// Callbacks instead of a Promise: an awaited promise would block the
// handler's `finally` and risk leaving the firmware overlay open.
// `subscribe()` replays current state immediately so we don't lose
// `show()` events that fire before the React mount cycle catches up.

import type {AlignmentType} from '../core/anchor';
import {DEFAULT_ANCHOR_STATE} from '../storage/anchorStorage';

export type PopupCallbacks = {
  onSetAlignmentType: (alignmentType: AlignmentType) => void;
  onClearAnchor: () => void;
  onClose: () => void;
};

export type PopupState = {
  active: boolean;
  alignmentType: AlignmentType;
  hasAnchor: boolean;
  callbacks: PopupCallbacks | null;
};

type Listener = (state: PopupState) => void;

const initialState: PopupState = {
  active: false,
  alignmentType: DEFAULT_ANCHOR_STATE.alignmentType,
  hasAnchor: false,
  callbacks: null,
};

let currentState: PopupState = initialState;
const listeners = new Set<Listener>();

const emit = (next: PopupState): void => {
  currentState = next;
  listeners.forEach(l => l(next));
};

export const showPopup = (
  alignmentType: AlignmentType,
  hasAnchor: boolean,
  callbacks: PopupCallbacks,
): void => {
  emit({active: true, alignmentType, hasAnchor, callbacks});
};

export const hidePopup = (): void => {
  emit(initialState);
};

export const getCurrentState = (): PopupState => currentState;

export const subscribe = (listener: Listener): (() => void) => {
  listeners.add(listener);
  // Replay current state so we don't race the React mount cycle.
  listener(currentState);
  return () => {
    listeners.delete(listener);
  };
};

export const __testing__ = {
  reset: () => {
    listeners.clear();
    currentState = initialState;
  },
};
