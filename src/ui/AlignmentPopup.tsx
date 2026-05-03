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
  onSetOffsetX: (value: number) => void;
  onSetOffsetY: (value: number) => void;
  onSetAnchor: () => void;
  onApply: () => void;
  onApplyAndReAnchor: () => void;
  onClose: () => void;
};

export type AlignmentPopupProps = {
  config: AlignmentConfig;
  hasAnchor: boolean;
  outOfBounds: boolean;
  noLasso: boolean;
  callbacks: AlignmentPopupCallbacks;
};

const OFFSET_STEP = 10;

const Toggle: React.FC<{label: string; on: boolean; onPress: () => void}> = ({label, on, onPress}) => (
  <Pressable style={styles.toggle} onPress={onPress}>
    <View style={[styles.toggleBox, on && styles.toggleBoxOn]} />
    <Text style={styles.toggleLabel}>{label}</Text>
  </Pressable>
);

const OffsetStepper: React.FC<{label: string; value: number; disabled?: boolean; onChange: (v: number) => void}> = ({
  label,
  value,
  disabled = false,
  onChange,
}) => (
  <View style={styles.offsetRow}>
    <View style={styles.offsetLabelCell}>
      <Text style={[styles.offsetLabel, disabled && styles.offsetLabelDisabled]}>{label}</Text>
    </View>
    <View style={styles.offsetStepper}>
      <Pressable
        style={[styles.stepperButton, disabled && styles.stepperButtonDisabled]}
        onPress={disabled ? undefined : () => onChange(value - OFFSET_STEP)}>
        <Text style={[styles.stepperButtonText, disabled && styles.stepperTextDisabled]}>−</Text>
      </Pressable>
      <Text style={[styles.stepperValue, disabled && styles.stepperTextDisabled]}>{value}</Text>
      <Pressable
        style={[styles.stepperButton, disabled && styles.stepperButtonDisabled]}
        onPress={disabled ? undefined : () => onChange(value + OFFSET_STEP)}>
        <Text style={[styles.stepperButtonText, disabled && styles.stepperTextDisabled]}>+</Text>
      </Pressable>
    </View>
    <View style={styles.offsetSpacerCell} />
  </View>
);

const Header: React.FC<{onClose: () => void}> = ({onClose}) => (
  <View style={styles.header}>
    <Text style={styles.headerTitle}>{t('dialog.title')}</Text>
    <Pressable style={styles.closeButton} onPress={onClose}>
      <Text style={styles.closeText}>{t('popup.close')}</Text>
    </Pressable>
  </View>
);

const AnchorTopRow: React.FC<{noLasso: boolean; onSetNewAnchor: () => void}> = ({noLasso, onSetNewAnchor}) => (
  <View style={styles.anchorRow}>
    <Text style={styles.anchorRowStatus}>{t('anchor.saved')} ✓</Text>
    <Pressable
      style={[styles.anchorInlineButton, noLasso && styles.anchorInlineButtonDisabled]}
      onPress={noLasso ? undefined : onSetNewAnchor}>
      <Text style={[styles.anchorInlineButtonText, noLasso && styles.anchorInlineButtonTextDisabled]}>
        {t('action.setNewAnchor')}
      </Text>
    </Pressable>
  </View>
);

const MinimalBody: React.FC<{noLasso: boolean; onSetAnchor: () => void}> = ({noLasso, onSetAnchor}) => (
  <View style={styles.minimalBody}>
    <Text style={styles.minimalStatus}>{t('anchor.notSet')}</Text>
    <Pressable
      style={[styles.actionButton, styles.actionButtonPrimary, noLasso && styles.actionButtonDisabled]}
      onPress={noLasso ? undefined : onSetAnchor}>
      <Text
        style={[
          styles.actionButtonText,
          !noLasso && styles.actionButtonTextPrimary,
          noLasso && styles.actionButtonTextDisabled,
        ]}>
        {t('action.setAnchor')}
      </Text>
    </Pressable>
    {noLasso ? <Text style={[styles.warning, styles.minimalWarning]}>{t('warning.noLasso')}</Text> : null}
  </View>
);

export const AlignmentPopup: React.FC<AlignmentPopupProps> = ({config, hasAnchor, outOfBounds, noLasso, callbacks}) => {
  const noAxis = !config.alignX && !config.alignY;
  const applyDisabled = !hasAnchor || outOfBounds || noLasso || noAxis;

  if (!hasAnchor) {
    return (
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Header onClose={callbacks.onClose} />
          <MinimalBody noLasso={noLasso} onSetAnchor={callbacks.onSetAnchor} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.backdrop}>
      <View style={styles.card}>
        <Header onClose={callbacks.onClose} />
        <AnchorTopRow noLasso={noLasso} onSetNewAnchor={callbacks.onSetAnchor} />

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

        <OffsetStepper
          label={t('offset.x')}
          value={config.offsetX}
          disabled={!config.alignX}
          onChange={callbacks.onSetOffsetX}
        />
        <OffsetStepper
          label={t('offset.y')}
          value={config.offsetY}
          disabled={!config.alignY}
          onChange={callbacks.onSetOffsetY}
        />

        {/* Always rendered so the popup doesn't shift when a warning toggles
            on/off. Non-breaking space holds the line height when empty. */}
        <Text style={styles.warning}>
          {noLasso ? t('warning.noLasso') : noAxis ? t('warning.noAxis') : outOfBounds ? t('warning.outOfBounds') : ' '}
        </Text>

        <View style={styles.actionRow}>
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
          <Pressable
            style={[styles.actionButton, applyDisabled && styles.actionButtonDisabled]}
            onPress={applyDisabled ? undefined : callbacks.onApplyAndReAnchor}>
            <Text style={[styles.actionButtonText, applyDisabled && styles.actionButtonTextDisabled]}>
              {t('action.applyAndReAnchor')}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};
