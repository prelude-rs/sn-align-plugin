import React, {useEffect, useState} from 'react';
import {Pressable, Text, View} from 'react-native';
import {PluginManager} from 'sn-plugin-lib';
import {AnchorPanel} from './AnchorPanel';
import {styles} from './styles';
import {t} from '../i18n/i18n';
import {
  getCurrentState,
  subscribe,
  type PopupState,
} from './popupController';

// Single-purpose dialog: pick or clear the alignment mark. Apply
// happens via the separate toolbar button (showType:0, no popup).
//
// Always renders visible UI. Returning `null` from the first render
// caused the firmware to dismiss the overlay before our state update
// could re-render — see sn-dictionary's DefinitionPopup for the
// precedent (renders a zero-size <View> instead of null).

export const PopupRoot: React.FC = () => {
  const [state, setState] = useState<PopupState>(getCurrentState);
  useEffect(() => subscribe(setState), []);

  if (!state.active || !state.callbacks) {
    // Safety surface — shouldn't normally render, but guarantees the
    // user always has a way out if the handler hasn't wired callbacks
    // yet. Direct call to PluginManager.closePluginView() rather than
    // a callback, since we don't have one.
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

  const cb = state.callbacks;

  return (
    <View style={styles.backdrop}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('dialog.title')}</Text>
          <Pressable style={styles.closeButton} onPress={cb.onClose}>
            <Text style={styles.closeText}>{t('popup.close')}</Text>
          </Pressable>
        </View>

        <AnchorPanel
          alignmentType={state.alignmentType}
          hasAnchor={state.hasAnchor}
          onPick={cb.onSetAlignmentType}
          onClear={cb.onClearAnchor}
        />
      </View>
    </View>
  );
};

export default PopupRoot;
