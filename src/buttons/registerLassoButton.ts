// Single lasso-toolbar button. showType:1 mounts the React popup as
// a centered dialog; the popup hosts both reference pickers, axis
// toggles, gap steppers, and the contextual action button.
//
// editDataTypes [0..5] = stroke, title, image, text-box, link,
// geometry. resizeLassoRect is a pure visual translation, so the
// button is meaningful for every lasso content type. (The geometry
// type 5 is required for selections containing lines/curves/circles
// /ellipses/polygons — without it the firmware greys the button.)

import {resolveIconUri, type ButtonEvent, type ButtonListener, type PluginManagerLike} from './buttonCommon';
import {localizedLassoButtonName} from '../i18n/i18n';
import type {Logger} from '../sdk/types';

const BUTTON_TYPE_LASSO_TOOLBAR = 2;
const APP_TYPE_NOTE = 'NOTE';
const EDIT_DATA_TYPES_ALL = [0, 1, 2, 3, 4, 5];

export const LASSO_ALIGNMENT_BUTTON_ID = 201;

export type RegisterLassoDeps = {
  pluginManager: PluginManagerLike;
  onPress: (event: ButtonEvent) => void;
  logger: Pick<Logger, 'log' | 'warn'>;
};

const TAG = 'align:button';

export const registerLassoButton = async (deps: RegisterLassoDeps): Promise<void> => {
  const iconUri = await resolveIconUri(deps.pluginManager, deps.logger, TAG);

  await deps.pluginManager.registerButton(BUTTON_TYPE_LASSO_TOOLBAR, [APP_TYPE_NOTE], {
    id: LASSO_ALIGNMENT_BUTTON_ID,
    name: localizedLassoButtonName(),
    icon: iconUri,
    enable: true,
    editDataTypes: EDIT_DATA_TYPES_ALL,
    showType: 1,
    regionType: 1,
    regionWidth: 880,
    regionHeight: 880,
  });

  deps.logger.log(`[${TAG}] registered LASSO Alignment button (id=${LASSO_ALIGNMENT_BUTTON_ID})`);

  const listener: ButtonListener = {
    onButtonPress: event => {
      if (event.id === LASSO_ALIGNMENT_BUTTON_ID) {
        deps.onPress(event);
      }
    },
  };
  deps.pluginManager.registerButtonListener(listener);
};
