import React from 'react';
import {Pressable, Text, View} from 'react-native';
import type {AlignmentConfig, ReferencePoint} from '../core/anchor';
import {ReferencePicker} from './ReferencePicker';
import {styles} from './styles';
import {t} from '../i18n/i18n';

export type AlignmentPopupCallbacks = {
  onSetAnchorRef: (ref: ReferencePoint) => void;
  onSetTargetRef: (ref: ReferencePoint) => void;
  onToggleAlignX: () => void;
  onToggleAlignY: () => void;
  onSetGapX: (value: number) => void;
  onSetGapY: (value: number) => void;
  onSetAnchor: () => void;
  onApply: () => void;
  onClose: () => void;
};

export type AlignmentPopupProps = {
  config: AlignmentConfig;
  hasAnchor: boolean;
  outOfBounds: boolean;
  noLasso: boolean;
  callbacks: AlignmentPopupCallbacks;
};

const GAP_STEP = 10;

const Toggle: React.FC<{label: string; on: boolean; onPress: () => void}> = ({label, on, onPress}) => (
  <Pressable style={styles.toggle} onPress={onPress}>
    <View style={[styles.toggleBox, on && styles.toggleBoxOn]} />
    <Text style={styles.toggleLabel}>{label}</Text>
  </Pressable>
);

const GapStepper: React.FC<{label: string; value: number; onChange: (v: number) => void}> = ({
  label,
  value,
  onChange,
}) => (
  <View style={styles.gapRow}>
    <View style={styles.gapLabelCell}>
      <Text style={styles.gapLabel}>{label}</Text>
    </View>
    <View style={styles.gapStepper}>
      <Pressable style={styles.stepperButton} onPress={() => onChange(value - GAP_STEP)}>
        <Text style={styles.stepperButtonText}>−</Text>
      </Pressable>
      <Text style={styles.stepperValue}>{value}</Text>
      <Pressable style={styles.stepperButton} onPress={() => onChange(value + GAP_STEP)}>
        <Text style={styles.stepperButtonText}>+</Text>
      </Pressable>
    </View>
    <View style={styles.gapSpacerCell} />
  </View>
);

export const AlignmentPopup: React.FC<AlignmentPopupProps> = ({config, hasAnchor, outOfBounds, noLasso, callbacks}) => {
  const noAxis = !config.alignX && !config.alignY;
  const applyDisabled = !hasAnchor || outOfBounds || noLasso || noAxis;
  const setAnchorDisabled = noLasso;
  const setAnchorLabel = hasAnchor ? t('action.setNewAnchor') : t('action.setAnchor');

  return (
    <View style={styles.backdrop}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('dialog.title')}</Text>
          <Pressable style={styles.closeButton} onPress={callbacks.onClose}>
            <Text style={styles.closeText}>{t('popup.close')}</Text>
          </Pressable>
        </View>

        <View style={styles.pickersRow}>
          <View style={styles.pickerColumn}>
            <Text style={styles.pickerLabel}>{t('picker.anchorTitle')}</Text>
            <ReferencePicker value={config.anchorRef} onPick={callbacks.onSetAnchorRef} />
          </View>
          <View style={styles.pickerColumn}>
            <Text style={styles.pickerLabel}>{t('picker.targetTitle')}</Text>
            <ReferencePicker value={config.targetRef} onPick={callbacks.onSetTargetRef} />
          </View>
        </View>

        <View style={styles.toggleRow}>
          <Toggle label={t('axis.alignX')} on={config.alignX} onPress={callbacks.onToggleAlignX} />
          <Toggle label={t('axis.alignY')} on={config.alignY} onPress={callbacks.onToggleAlignY} />
        </View>

        <GapStepper label={t('gap.x')} value={config.gapX} onChange={callbacks.onSetGapX} />
        <GapStepper label={t('gap.y')} value={config.gapY} onChange={callbacks.onSetGapY} />

        {!hasAnchor ? <Text style={[styles.status, styles.statusEmpty]}>{t('status.noAnchor')}</Text> : null}

        {/* Always rendered so the popup doesn't shift when a warning toggles
            on/off. Non-breaking space holds the line height when empty. */}
        <Text style={styles.warning}>
          {noLasso ? t('warning.noLasso') : noAxis ? t('warning.noAxis') : outOfBounds ? t('warning.outOfBounds') : ' '}
        </Text>

        <View style={styles.actionRow}>
          {hasAnchor ? (
            <Pressable
              style={[styles.actionButton, styles.actionButtonPrimary, applyDisabled && styles.actionButtonDisabled]}
              onPress={applyDisabled ? undefined : callbacks.onApply}>
              <Text
                style={[
                  styles.actionButtonText,
                  !applyDisabled && styles.actionButtonTextPrimary,
                  applyDisabled && styles.actionButtonTextDisabled,
                ]}>
                {t('action.apply')}
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            style={[
              styles.actionButton,
              !hasAnchor && styles.actionButtonPrimary,
              setAnchorDisabled && styles.actionButtonDisabled,
            ]}
            onPress={setAnchorDisabled ? undefined : callbacks.onSetAnchor}>
            <Text
              style={[
                styles.actionButtonText,
                !hasAnchor && !setAnchorDisabled && styles.actionButtonTextPrimary,
                setAnchorDisabled && styles.actionButtonTextDisabled,
              ]}>
              {setAnchorLabel}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};
