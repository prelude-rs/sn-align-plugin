import React, {useEffect, useState} from 'react';
import {Pressable, Text, View} from 'react-native';
import {PluginManager} from 'sn-plugin-lib';
import {AlignmentPopup} from './AlignmentPopup';
import {styles} from './styles';
import {t} from '../i18n/i18n';
import {getCurrentState, subscribe, type PopupState} from './popupController';

// Always renders visible UI. Returning `null` from the first render
// caused the firmware to dismiss the overlay before our state update
// could re-render — see sn-dictionary's DefinitionPopup for the
// precedent (renders a zero-size <View> instead of null).

export const PopupRoot: React.FC = () => {
  const [state, setState] = useState<PopupState>(getCurrentState);
  useEffect(() => subscribe(setState), []);

  if (!state.active || !state.callbacks) {
    return (
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{t('dialog.title')}</Text>
            <Pressable
              style={styles.closeButton}
              onPress={() => {
                PluginManager.closePluginView().catch(() => {
                  /* overlay going away regardless */
                });
              }}>
              <Text style={styles.closeText}>{t('popup.close')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <AlignmentPopup
      config={state.config}
      hasAnchor={state.hasAnchor}
      outOfBounds={state.outOfBounds}
      noLasso={state.noLasso}
      callbacks={state.callbacks}
    />
  );
};

export default PopupRoot;
