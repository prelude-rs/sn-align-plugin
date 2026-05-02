// Toggle which of the two lasso buttons is enabled, reflecting the
// current anchor state. `modifyButtonRes` would let us swap a single
// button's name/icon at runtime, but the firmware on this device
// doesn't expose that API (verified empirically). The pair-toggle
// approach is the proven fallback: both buttons register up-front,
// `setButtonState` picks which one is currently visible+tappable.

import type {PluginManagerLike} from './buttonCommon';
import {
  LASSO_APPLY_ALIGNMENT_BUTTON_ID,
  LASSO_SET_ANCHOR_BUTTON_ID,
} from './registerLassoButton';

export type LassoMode = 'set-anchor' | 'apply-alignment';

export type LassoToggleDeps = {
  pluginManager: PluginManagerLike;
  logger: {log: (msg: string) => void; warn: (msg: string) => void};
};

const safeSetButtonState = async (
  deps: LassoToggleDeps,
  id: number,
  enable: boolean,
): Promise<void> => {
  try {
    await deps.pluginManager.setButtonState(id, enable);
  } catch (e) {
    deps.logger.warn(
      `[align:toggle] setButtonState(${id},${enable}) threw: ${(e as Error).message}`,
    );
  }
};

export const setLassoMode = async (
  deps: LassoToggleDeps,
  mode: LassoMode,
): Promise<void> => {
  const setAnchorEnabled = mode === 'set-anchor';
  // Disable the outgoing button before enabling the incoming one so
  // the user never sees both visible at once during the transition.
  if (setAnchorEnabled) {
    await safeSetButtonState(deps, LASSO_APPLY_ALIGNMENT_BUTTON_ID, false);
    await safeSetButtonState(deps, LASSO_SET_ANCHOR_BUTTON_ID, true);
  } else {
    await safeSetButtonState(deps, LASSO_SET_ANCHOR_BUTTON_ID, false);
    await safeSetButtonState(deps, LASSO_APPLY_ALIGNMENT_BUTTON_ID, true);
  }
  deps.logger.log(`[align:toggle] mode=${mode}`);
};
