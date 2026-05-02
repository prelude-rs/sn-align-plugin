// Lasso-toolbar buttons. Two registrations because the firmware
// doesn't expose `modifyButtonRes` for runtime name/icon swap on
// this device (verified empirically: the Phase 5 swap silently no-
// ops). Instead we register both states up-front and toggle which
// one is enabled via `setButtonState`. Exactly one is visible at any
// time, so from the user's POV it's a single button that flips
// between "Set Anchor" and "Apply Alignment" with anchor presence.
//
// Both buttons route to the same dual-mode handler (onLassoMain) —
// the handler reads persisted anchor state and dispatches by it,
// not by which id fired. The two ids exist solely to give us two
// distinct firmware-visible identities to toggle between.
//
// showType:0 = no UI overlay; firmware fires onButtonPress directly.
// editDataTypes:[0] = stroke selections only (resizeLassoRect is
// validated for strokes; non-stroke selections like text boxes are
// out of scope).

import {
  ICON_ANCHORED_FILENAME,
  ICON_FILENAME,
  resolveIconUri,
  safeSetButtonState,
  type ButtonEvent,
  type ButtonListener,
  type PluginManagerLike,
} from './buttonCommon';
import {localizedApplyAlignmentName, localizedSetAnchorName} from '../i18n/i18n';
import type {Logger} from '../sdk/types';

const BUTTON_TYPE_LASSO_TOOLBAR = 2;
const APP_TYPE_NOTE = 'NOTE';
// 0=stroke, 1=title, 2=image, 3=text-box, 4=link. resizeLassoRect
// is a pure visual translation of the lasso selection — it doesn't
// care what's inside — so the button is meaningful for every lasso
// content type.
const EDIT_DATA_TYPES_ALL = [0, 1, 2, 3, 4];

export const LASSO_SET_ANCHOR_BUTTON_ID = 201;
export const LASSO_APPLY_ALIGNMENT_BUTTON_ID = 202;

export type RegisterLassoDeps = {
  pluginManager: PluginManagerLike;
  onPress: (event: ButtonEvent) => void;
  initialAnchored: boolean;
  logger: Pick<Logger, 'log' | 'warn'>;
};

const TAG = 'align:button';

const registerOne = async (
  pluginManager: PluginManagerLike,
  cfg: {id: number; name: string; icon: string},
): Promise<void> => {
  await pluginManager.registerButton(BUTTON_TYPE_LASSO_TOOLBAR, [APP_TYPE_NOTE], {
    id: cfg.id,
    name: cfg.name,
    icon: cfg.icon,
    enable: false,
    editDataTypes: EDIT_DATA_TYPES_ALL,
    showType: 0,
  });
};

export const registerLassoButtons = async (deps: RegisterLassoDeps): Promise<void> => {
  const [iconUri, iconAnchoredUri] = await Promise.all([
    resolveIconUri(deps.pluginManager, deps.logger, 'lasso', ICON_FILENAME),
    resolveIconUri(deps.pluginManager, deps.logger, 'lasso', ICON_ANCHORED_FILENAME),
  ]);

  // Register both buttons first (both disabled), THEN toggle the
  // matching one on. Interleaving register+setButtonState appeared to
  // leave the second-registered button stuck disabled on this
  // firmware — completing all registrations before any state toggle
  // sidesteps it.
  await registerOne(deps.pluginManager, {
    id: LASSO_SET_ANCHOR_BUTTON_ID,
    name: localizedSetAnchorName(),
    icon: iconUri,
  });
  await registerOne(deps.pluginManager, {
    id: LASSO_APPLY_ALIGNMENT_BUTTON_ID,
    name: localizedApplyAlignmentName(),
    icon: iconAnchoredUri,
  });

  await safeSetButtonState(deps.pluginManager, deps.logger, TAG, LASSO_SET_ANCHOR_BUTTON_ID, !deps.initialAnchored);
  await safeSetButtonState(deps.pluginManager, deps.logger, TAG, LASSO_APPLY_ALIGNMENT_BUTTON_ID, deps.initialAnchored);

  deps.logger.log(
    `[${TAG}] registered LASSO buttons (set=${LASSO_SET_ANCHOR_BUTTON_ID} enabled=${!deps.initialAnchored}, apply=${LASSO_APPLY_ALIGNMENT_BUTTON_ID} enabled=${
      deps.initialAnchored
    })`,
  );

  const listener: ButtonListener = {
    onButtonPress: event => {
      if (event.id === LASSO_SET_ANCHOR_BUTTON_ID || event.id === LASSO_APPLY_ALIGNMENT_BUTTON_ID) {
        deps.onPress(event);
      }
    },
  };
  deps.pluginManager.registerButtonListener(listener);
};
