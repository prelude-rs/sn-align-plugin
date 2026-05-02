// Page-toolbar button: "Set Alignment". Always visible on a Note.
// Tapping opens the popup picker (3×3 cell grid + Clear Anchor).
// showType:1 mounts the React popup as a centered dialog.
//
// Page-toolbar buttons don't filter by editDataTypes (that's a
// lasso-only filter). regionType:1 + regionWidth/Height match the
// dialog dimensions.

import {resolveIconUri, type ButtonEvent, type ButtonListener, type PluginManagerLike} from './buttonCommon';
import {localizedSetAlignmentName} from '../i18n/i18n';
import type {Logger} from '../sdk/types';

const BUTTON_TYPE_TOOLBAR = 1;
const APP_TYPE_NOTE = 'NOTE';

export const PAGE_SET_ALIGNMENT_BUTTON_ID = 200;

export type RegisterPageDeps = {
  pluginManager: PluginManagerLike;
  onPress: (event: ButtonEvent) => void;
  logger: Pick<Logger, 'log' | 'warn'>;
};

export const registerPageButton = async (deps: RegisterPageDeps): Promise<void> => {
  const iconUri = await resolveIconUri(deps.pluginManager, deps.logger, 'page');

  await deps.pluginManager.registerButton(BUTTON_TYPE_TOOLBAR, [APP_TYPE_NOTE], {
    id: PAGE_SET_ALIGNMENT_BUTTON_ID,
    name: localizedSetAlignmentName(),
    icon: iconUri,
    enable: true,
    showType: 1,
    regionType: 1,
    regionWidth: 720,
    regionHeight: 540,
  });
  deps.logger.log(`[align:button] registered PAGE_SET_ALIGNMENT (id=${PAGE_SET_ALIGNMENT_BUTTON_ID})`);

  const listener: ButtonListener = {
    onButtonPress: event => {
      if (event.id === PAGE_SET_ALIGNMENT_BUTTON_ID) {
        deps.onPress(event);
      }
    },
  };
  deps.pluginManager.registerButtonListener(listener);
};
