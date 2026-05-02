// Toggle which of the two lasso buttons is enabled, reflecting the
// current anchor state. `modifyButtonRes` would let us swap a single
// button's name/icon at runtime, but the firmware on this device
// doesn't expose that API (verified empirically). The pair-toggle
// approach is the proven fallback: both buttons register up-front,
// `setButtonState` picks which one is currently visible+tappable.

import {safeSetButtonState, type PluginManagerLike} from './buttonCommon';
import {LASSO_APPLY_ALIGNMENT_BUTTON_ID, LASSO_SET_ANCHOR_BUTTON_ID} from './registerLassoButton';
import type {Logger} from '../sdk/types';

export type LassoMode = 'set-anchor' | 'apply-alignment';

export type LassoToggleDeps = {
  pluginManager: PluginManagerLike;
  logger: Pick<Logger, 'log' | 'warn'>;
};

const TAG = 'align:toggle';

export const setLassoMode = async (deps: LassoToggleDeps, mode: LassoMode): Promise<void> => {
  const disableId = mode === 'set-anchor' ? LASSO_APPLY_ALIGNMENT_BUTTON_ID : LASSO_SET_ANCHOR_BUTTON_ID;
  const enableId = mode === 'set-anchor' ? LASSO_SET_ANCHOR_BUTTON_ID : LASSO_APPLY_ALIGNMENT_BUTTON_ID;
  // Disable the outgoing button before enabling the incoming one so
  // the user never sees both visible at once during the transition.
  await safeSetButtonState(deps.pluginManager, deps.logger, TAG, disableId, false);
  await safeSetButtonState(deps.pluginManager, deps.logger, TAG, enableId, true);
  deps.logger.log(`[${TAG}] mode=${mode}`);
};
