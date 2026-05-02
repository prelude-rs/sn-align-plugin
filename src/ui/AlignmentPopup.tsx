import React from 'react';
import {Pressable, Text, View} from 'react-native';
import type {AlignmentConfig, ReferencePoint} from '../core/anchor';
import {ReferencePicker} from './ReferencePicker';
import {styles} from './styles';
import {t} from '../i18n/i18n';

export type AlignmentPopupCallbacks = {
  onSetAnchorRef: (ref: ReferencePoint) => void;
  onSetTargetRef: (ref: ReferencePoint) => void;
  onToggleConstrainX: () => void;
  onToggleConstrainY: () => void;
  onSetGapX: (value: number) => void;
  onSetGapY: (value: number) => void;
  onSaveAnchor: () => void;
  onApply: () => void;
  onClearAnchor: () => void;
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
    <Text style={styles.gapLabel}>{label}</Text>
    <View style={styles.gapStepper}>
      <Pressable style={styles.stepperButton} onPress={() => onChange(value - GAP_STEP)}>
        <Text style={styles.stepperButtonText}>−</Text>
      </Pressable>
      <Text style={styles.stepperValue}>{value}</Text>
      <Pressable style={styles.stepperButton} onPress={() => onChange(value + GAP_STEP)}>
        <Text style={styles.stepperButtonText}>+</Text>
      </Pressable>
    </View>
  </View>
);

export const AlignmentPopup: React.FC<AlignmentPopupProps> = ({config, hasAnchor, outOfBounds, noLasso, callbacks}) => {
  const applyDisabled = !hasAnchor || outOfBounds || noLasso;
  const saveDisabled = noLasso;

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
          <Toggle label={t('axis.constrainX')} on={config.constrainX} onPress={callbacks.onToggleConstrainX} />
          <Toggle label={t('axis.constrainY')} on={config.constrainY} onPress={callbacks.onToggleConstrainY} />
        </View>

        <GapStepper label={t('gap.x')} value={config.gapX} onChange={callbacks.onSetGapX} />
        <GapStepper label={t('gap.y')} value={config.gapY} onChange={callbacks.onSetGapY} />

        <Text style={[styles.status, !hasAnchor && styles.statusEmpty]}>
          {hasAnchor ? t('status.savedAt') : t('status.noAnchor')}
        </Text>

        {outOfBounds ? <Text style={styles.warning}>{t('warning.outOfBounds')}</Text> : null}
        {noLasso ? <Text style={styles.warning}>{t('warning.noLasso')}</Text> : null}

        <View style={styles.actionRow}>
          {hasAnchor ? (
            <>
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
              <Pressable style={styles.actionButton} onPress={callbacks.onClearAnchor}>
                <Text style={styles.actionButtonText}>{t('action.clear')}</Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              style={[styles.actionButton, styles.actionButtonPrimary, saveDisabled && styles.actionButtonDisabled]}
              onPress={saveDisabled ? undefined : callbacks.onSaveAnchor}>
              <Text
                style={[
                  styles.actionButtonText,
                  !saveDisabled && styles.actionButtonTextPrimary,
                  saveDisabled && styles.actionButtonTextDisabled,
                ]}>
                {t('action.save')}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
};
