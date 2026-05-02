import React from 'react';
import {Pressable, Text, View, type ViewStyle} from 'react-native';
import {ALL_ALIGNMENT_TYPES, type AlignmentType} from '../core/anchor';
import {t, type StringId} from '../i18n/i18n';
import {dimensions, styles} from './styles';

const ALIGNMENT_LABEL_ID: Record<AlignmentType, StringId> = {
  'top-left': 'mark.topLeft',
  top: 'mark.top',
  'top-right': 'mark.topRight',
  right: 'mark.right',
  'bottom-right': 'mark.bottomRight',
  bottom: 'mark.bottom',
  'bottom-left': 'mark.bottomLeft',
  left: 'mark.left',
};

export type AnchorPanelProps = {
  alignmentType: AlignmentType;
  hasAnchor: boolean;
  onPick: (alignmentType: AlignmentType) => void;
  onClear: () => void;
};

// 3×3 grid wrapped in a single outer rim. Each cell is a button
// showing a chevron (just the V of an arrow head — no stem, no
// fill) pointing toward its position relative to the rim.
//
// Each chevron is composed of two rotated rectangles with their
// arms meeting at a 90° apex and the bounding box centered on the
// cell. Cardinal chevrons (up/down/left/right) draw a wider/shallow
// V; diagonal chevrons draw two perpendicular arms forming an L
// with the apex pointing into the cell's outer corner.

type Cell = {type: AlignmentType};
const CENTER = {center: true} as const;
type CenterCell = typeof CENTER;

const GRID: ReadonlyArray<ReadonlyArray<Cell | CenterCell>> = [
  [{type: 'top-left'}, {type: 'top'}, {type: 'top-right'}],
  [{type: 'left'}, CENTER, {type: 'right'}],
  [{type: 'bottom-left'}, {type: 'bottom'}, {type: 'bottom-right'}],
];

const isCenter = (c: Cell | CenterCell): c is CenterCell => 'center' in c;

const ARM_LENGTH = 21; // 30% smaller than the prior chevron
const ARM_THICKNESS = 5;
const STEM_LENGTH = 26;
const HEAD_DEPTH = ARM_LENGTH * Math.SQRT1_2; // L * cos(45°)

const SQRT_HALF = Math.SQRT1_2;

type Pt = {x: number; y: number};

// Per cell type: the unit vector pointing toward the rim (the
// direction the arrow points), and the unit vectors of the two
// chevron arms going BACK from the apex. Arms are at 45° from the
// arrow direction so the apex angle is 90° on every cell.
type Spec = {direction: Pt; armA: Pt; armB: Pt};

const SPECS: Record<AlignmentType, Spec> = {
  top: {
    direction: {x: 0, y: -1},
    armA: {x: -SQRT_HALF, y: SQRT_HALF},
    armB: {x: SQRT_HALF, y: SQRT_HALF},
  },
  bottom: {
    direction: {x: 0, y: 1},
    armA: {x: -SQRT_HALF, y: -SQRT_HALF},
    armB: {x: SQRT_HALF, y: -SQRT_HALF},
  },
  left: {
    direction: {x: -1, y: 0},
    armA: {x: SQRT_HALF, y: -SQRT_HALF},
    armB: {x: SQRT_HALF, y: SQRT_HALF},
  },
  right: {
    direction: {x: 1, y: 0},
    armA: {x: -SQRT_HALF, y: -SQRT_HALF},
    armB: {x: -SQRT_HALF, y: SQRT_HALF},
  },
  'top-left': {
    direction: {x: -SQRT_HALF, y: -SQRT_HALF},
    armA: {x: 0, y: 1},
    armB: {x: 1, y: 0},
  },
  'top-right': {
    direction: {x: SQRT_HALF, y: -SQRT_HALF},
    armA: {x: 0, y: 1},
    armB: {x: -1, y: 0},
  },
  'bottom-left': {
    direction: {x: -SQRT_HALF, y: SQRT_HALF},
    armA: {x: 0, y: -1},
    armB: {x: 1, y: 0},
  },
  'bottom-right': {
    direction: {x: SQRT_HALF, y: SQRT_HALF},
    armA: {x: 0, y: -1},
    armB: {x: -1, y: 0},
  },
};

// Per-segment layout in cell-local coords. Computed once at module
// load — geometry is purely a function of constants (cellSize, arm
// length, stem length, spec). Color and `position: 'absolute'` are
// applied at render time alongside the static fields.
type SegmentLayout = {
  left: number;
  top: number;
  width: number;
  height: number;
  transform: [{rotate: string}];
};

const segmentLayoutsFor = (type: AlignmentType, cellSize: number): SegmentLayout[] => {
  const c = cellSize / 2;
  const spec = SPECS[type];
  const halfTotal = (HEAD_DEPTH + STEM_LENGTH) / 2;
  const apex: Pt = {x: c + halfTotal * spec.direction.x, y: c + halfTotal * spec.direction.y};
  const tail: Pt = {x: c - halfTotal * spec.direction.x, y: c - halfTotal * spec.direction.y};
  const stemHead: Pt = {x: apex.x - HEAD_DEPTH * spec.direction.x, y: apex.y - HEAD_DEPTH * spec.direction.y};
  const armAEnd: Pt = {x: apex.x + ARM_LENGTH * spec.armA.x, y: apex.y + ARM_LENGTH * spec.armA.y};
  const armBEnd: Pt = {x: apex.x + ARM_LENGTH * spec.armB.x, y: apex.y + ARM_LENGTH * spec.armB.y};
  const segments: Array<readonly [Pt, Pt]> = [
    [apex, armAEnd],
    [apex, armBEnd],
    [stemHead, tail],
  ];
  return segments.map(([p1, p2]) => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
    const cx = (p1.x + p2.x) / 2;
    const cy = (p1.y + p2.y) / 2;
    return {
      left: cx - length / 2,
      top: cy - ARM_THICKNESS / 2,
      width: length,
      height: ARM_THICKNESS,
      transform: [{rotate: `${angleDeg}deg`}],
    };
  });
};

const SEGMENTS_BY_TYPE: Record<AlignmentType, readonly SegmentLayout[]> = ALL_ALIGNMENT_TYPES.reduce((acc, type) => {
  acc[type] = segmentLayoutsFor(type, dimensions.cellSize);
  return acc;
}, {} as Record<AlignmentType, readonly SegmentLayout[]>);

// Static style objects so JSX doesn't allocate per render.
const ARROW_BASE_STYLE: ViewStyle = {position: 'absolute'};
const CELL_FILL_WHITE: ViewStyle = {backgroundColor: '#ffffff'};
const CELL_FILL_BLACK: ViewStyle = {backgroundColor: '#000000'};
const CELL_STYLE_UNSELECTED: ViewStyle[] = [styles.markCellBase, CELL_FILL_WHITE];
const CELL_STYLE_SELECTED: ViewStyle[] = [styles.markCellBase, CELL_FILL_BLACK];

const Arrow: React.FC<{type: AlignmentType; selected: boolean}> = React.memo(({type, selected}) => {
  const backgroundColor = selected ? '#ffffff' : '#000000';
  return (
    <>
      {SEGMENTS_BY_TYPE[type].map((seg, i) => (
        <View key={i} style={[ARROW_BASE_STYLE, seg, {backgroundColor}]} />
      ))}
    </>
  );
});
Arrow.displayName = 'Arrow';

export const AnchorPanel: React.FC<AnchorPanelProps> = ({alignmentType, hasAnchor, onPick, onClear}) => (
  <View>
    <View style={styles.markGridWrap}>
      <View style={styles.markGrid}>
        {GRID.map((row, ri) => (
          <View key={ri} style={styles.markRow}>
            {row.map(cell => {
              if (isCenter(cell)) {
                return <View key="center" style={CELL_STYLE_UNSELECTED} />;
              }
              const selected = alignmentType === cell.type;
              return (
                <Pressable
                  key={cell.type}
                  style={selected ? CELL_STYLE_SELECTED : CELL_STYLE_UNSELECTED}
                  onPress={() => onPick(cell.type)}>
                  <Arrow type={cell.type} selected={selected} />
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>

    <Text style={[styles.status, !hasAnchor && styles.statusEmpty]}>
      {hasAnchor ? `${t('mark.savedAt')}: ${t(ALIGNMENT_LABEL_ID[alignmentType])}` : t('mark.noneYet')}
    </Text>

    {hasAnchor ? (
      <Pressable style={styles.clearButton} onPress={onClear}>
        <Text style={styles.clearButtonText}>{t('mark.clear')}</Text>
      </Pressable>
    ) : null}
  </View>
);
