import {StyleSheet} from 'react-native';

// Single popup with both reference pickers, axis toggles, gap
// steppers, status, and contextual action buttons. E-ink palette:
// black ink, white background, thick borders.

const CELL_SIZE = 72;
const CELL_BORDER = 5;
const RIM_WIDTH = 5;
const FRAME_GAP = 0;

export const dimensions = {
  cellSize: CELL_SIZE,
  cellBorder: CELL_BORDER,
  rimWidth: RIM_WIDTH,
};

export const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    minWidth: 720,
    maxWidth: 880,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#000000',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
  },
  closeButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 6,
  },
  closeText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },

  // Two reference pickers side by side.
  pickersRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 14,
  },
  pickerColumn: {
    alignItems: 'center',
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },

  markGrid: {
    flexDirection: 'column',
    borderWidth: RIM_WIDTH,
    borderColor: '#000000',
  },
  markRow: {
    flexDirection: 'row',
    gap: FRAME_GAP,
  },
  markCellBase: {
    width: CELL_SIZE,
    height: CELL_SIZE,
  },

  // Axis toggle row (two side-by-side toggles).
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 14,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 6,
  },
  toggleBox: {
    width: 18,
    height: 18,
    borderWidth: 2,
    borderColor: '#000000',
    marginRight: 8,
  },
  toggleBoxOn: {
    backgroundColor: '#000000',
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },

  // Gap stepper row.
  gapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  gapLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    width: 90,
  },
  gapStepper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepperButton: {
    width: 44,
    height: 44,
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
  },
  stepperValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    width: 80,
    textAlign: 'center',
  },

  // Status / warning text.
  status: {
    marginTop: 12,
    fontSize: 16,
    color: '#000000',
    textAlign: 'center',
  },
  statusEmpty: {
    color: '#666666',
    fontStyle: 'italic',
  },
  warning: {
    marginTop: 8,
    fontSize: 15,
    color: '#000000',
    fontStyle: 'italic',
    textAlign: 'center',
  },

  // Action buttons row at the bottom.
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    minWidth: 180,
    alignItems: 'center',
  },
  actionButtonPrimary: {
    backgroundColor: '#000000',
  },
  actionButtonDisabled: {
    borderColor: '#999999',
    backgroundColor: '#eeeeee',
  },
  actionButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
  },
  actionButtonTextPrimary: {
    color: '#ffffff',
  },
  actionButtonTextDisabled: {
    color: '#999999',
  },
});
