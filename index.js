/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import {PluginCommAPI, PluginFileAPI, PluginManager} from 'sn-plugin-lib';

import {registerLassoButton, LASSO_ALIGNMENT_BUTTON_ID} from './src/buttons/registerLassoButton';
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
  getCurrentFilePath: () => PluginCommAPI.getCurrentFilePath(),
  getCurrentPageNum: () => PluginCommAPI.getCurrentPageNum(),
  getLassoRect: () => PluginCommAPI.getLassoRect(),
  resizeLassoRect: rect => PluginCommAPI.resizeLassoRect(rect),
  setLassoBoxState: state => PluginCommAPI.setLassoBoxState(state),
  closePluginView: () => PluginManager.closePluginView(),
};

const fileApi = {
  getPageSize: (notePath, page) => PluginFileAPI.getPageSize(notePath, page),
};

const lassoDeps = {
  comm: lassoComm,
  fileApi,
  storage,
  logger,
};

const onButtonPress = event => {
  if (event.id === LASSO_ALIGNMENT_BUTTON_ID) {
    onLassoMain(lassoDeps).catch(e => {
      logger.error(`[align:lasso] dispatch crashed: ${e.message}`);
    });
  }
};

registerLassoButton({
  pluginManager: PluginManager,
  onPress: onButtonPress,
  logger,
}).catch(e => {
  logger.error(`[align:init] button registration failed: ${e.message}`);
});
