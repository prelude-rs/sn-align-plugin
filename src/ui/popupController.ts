// Bridge between the lasso button handler and the popup component.
// State carries the full AlignmentConfig + flags driving the popup's
// affordances (whether an anchor exists, whether the would-be result
// goes off-page, whether there's no lasso to act on).
//
// `subscribe()` replays current state immediately so a `show()` that
// fired before the React mount cycle catches up isn't lost.

import {DEFAULT_ALIGNMENT_CONFIG, type AlignmentConfig} from '../core/anchor';
import type {AlignmentPopupCallbacks} from './AlignmentPopup';

export type PopupState = {
  active: boolean;
  config: AlignmentConfig;
  hasAnchor: boolean;
  outOfBounds: boolean;
  noLasso: boolean;
  callbacks: AlignmentPopupCallbacks | null;
};

type Listener = (state: PopupState) => void;

const initialState: PopupState = {
  active: false,
  config: DEFAULT_ALIGNMENT_CONFIG,
  hasAnchor: false,
  outOfBounds: false,
  noLasso: false,
  callbacks: null,
};

let currentState: PopupState = initialState;
const listeners = new Set<Listener>();

const emit = (next: PopupState): void => {
  currentState = next;
  listeners.forEach(l => l(next));
};

export const showPopup = (args: Omit<PopupState, 'active' | 'callbacks'>, callbacks: AlignmentPopupCallbacks): void => {
  emit({active: true, ...args, callbacks});
};

export const updatePopup = (patch: Partial<Omit<PopupState, 'active' | 'callbacks'>>): void => {
  if (!currentState.active) {
    return;
  }
  emit({...currentState, ...patch});
};

export const hidePopup = (): void => {
  emit(initialState);
};

export const getCurrentState = (): PopupState => currentState;

export const subscribe = (listener: Listener): (() => void) => {
  listeners.add(listener);
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
