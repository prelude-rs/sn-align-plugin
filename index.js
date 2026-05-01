/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import {PluginCommAPI, PluginManager} from 'sn-plugin-lib';

import {
  registerPageButton,
  PAGE_SET_ALIGNMENT_BUTTON_ID,
} from './src/buttons/registerPageButton';
import {
  registerLassoButtons,
  LASSO_SET_ANCHOR_BUTTON_ID,
  LASSO_APPLY_ALIGNMENT_BUTTON_ID,
} from './src/buttons/registerLassoButton';
import {setLassoMode} from './src/buttons/lassoButtonToggle';
import {onPageToolbar} from './src/handlers/onPageToolbar';
import {onLassoMain} from './src/handlers/onLassoMain';
import {getDefaultAnchorStorage} from './src/storage/anchorStorage';

AppRegistry.registerComponent(appName, () => App);

PluginManager.init();

// The firmware filters console.warn / console.error from logcat
// (every ReactNativeJS line is at info level). Route everything
// through console.log with an explicit prefix.
const logger = {
  log: msg => console.log(msg),
  warn: msg => console.log(`[WARN] ${msg}`),
  error: msg => console.log(`[ERROR] ${msg}`),
};

const storage = getDefaultAnchorStorage();

const lassoComm = {
  getLassoRect: () => PluginCommAPI.getLassoRect(),
  resizeLassoRect: rect => PluginCommAPI.resizeLassoRect(rect),
  setLassoBoxState: state => PluginCommAPI.setLassoBoxState(state),
  closePluginView: () => PluginManager.closePluginView(),
};

const pageComm = {
  closePluginView: () => PluginManager.closePluginView(),
};

const toggleDeps = {pluginManager: PluginManager, logger};

const pageDeps = {
  comm: pageComm,
  storage,
  logger,
  onAnchorCleared: () => {
    setLassoMode(toggleDeps, 'set-anchor').catch(() => {
      // already logged inside the wrapper
    });
  },
};

const lassoDeps = {
  comm: lassoComm,
  storage,
  logger,
  onAnchorSaved: () => {
    setLassoMode(toggleDeps, 'apply-alignment').catch(() => {
      // already logged inside the wrapper
    });
  },
};

// Single button-press dispatcher. The firmware delivers all button
// events to every registered listener; route by id.
const onButtonPress = event => {
  if (event.id === PAGE_SET_ALIGNMENT_BUTTON_ID) {
    onPageToolbar(pageDeps).catch(e => {
      logger.error(`[align:page] dispatch crashed: ${e.message}`);
    });
  } else if (
    event.id === LASSO_SET_ANCHOR_BUTTON_ID ||
    event.id === LASSO_APPLY_ALIGNMENT_BUTTON_ID
  ) {
    onLassoMain(lassoDeps).catch(e => {
      logger.error(`[align:lasso] dispatch crashed: ${e.message}`);
    });
  }
};

// Read the persisted state before registering buttons so the right
// lasso button is enabled out of the gate.
storage
  .load()
  .then(state =>
    Promise.all([
      registerPageButton({
        pluginManager: PluginManager,
        onPress: onButtonPress,
        logger,
      }),
      registerLassoButtons({
        pluginManager: PluginManager,
        onPress: onButtonPress,
        initialAnchored: state.anchorBox != null,
        logger,
      }),
    ]),
  )
  .catch(e => {
    logger.error(`[align:init] button registration failed: ${e.message}`);
  });
