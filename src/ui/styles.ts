import {StyleSheet} from 'react-native';

// Single-purpose dialog: title + 3×3 anchor grid + status + clear.
// E-ink palette (black / white only), thick borders for legibility.

const CELL_SIZE = 90;
const CELL_BORDER = 6;
const RIM_WIDTH = 6;
const FRAME_GAP = 0; // cells abut so the rim renders as a clean rectangle

export const dimensions = {
  cellSize: CELL_SIZE,
  cellBorder: CELL_BORDER,
  rimWidth: RIM_WIDTH,
};

export const styles = StyleSheet.create({
  // Backdrop fills the firmware overlay (transparent) so the card
  // appears as a centered floating dialog rather than a full-screen
  // wash.
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    minWidth: 480,
    maxWidth: 640,
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
    marginBottom: 24,
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

  // The grid is centered inside the card body. Cells tile with no
  // gap so their outer borders form one continuous frame.
  markGridWrap: {
    alignItems: 'center',
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

  status: {
    marginTop: 24,
    fontSize: 16,
    color: '#000000',
    textAlign: 'center',
  },
  statusEmpty: {
    color: '#666666',
    fontStyle: 'italic',
  },

  clearButton: {
    marginTop: 20,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
});
