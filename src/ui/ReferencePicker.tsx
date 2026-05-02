import React from 'react';
import {Pressable, View, type ViewStyle} from 'react-native';
import {ALL_REFERENCE_POINTS, type ReferencePoint} from '../core/anchor';
import {dimensions, styles} from './styles';

export type ReferencePickerProps = {
  value: ReferencePoint;
  onPick: (ref: ReferencePoint) => void;
};

// 3×3 grid wrapped in a single outer rim. Eight cells render an
// outward-pointing arrow (head + stem) toward the rim; the ninth
// (center) renders a small filled dot — it has no direction.

const GRID: ReadonlyArray<ReadonlyArray<ReferencePoint>> = [
  ['top-left', 'top', 'top-right'],
  ['left', 'center', 'right'],
  ['bottom-left', 'bottom', 'bottom-right'],
];

const ARM_LENGTH = 21;
const ARM_THICKNESS = 5;
const STEM_LENGTH = 26;
const HEAD_DEPTH = ARM_LENGTH * Math.SQRT1_2;
const SQRT_HALF = Math.SQRT1_2;
const CENTER_DOT_SIZE = 14;

type Pt = {x: number; y: number};
type Spec = {direction: Pt; armA: Pt; armB: Pt};

// Direction unit vectors and chevron arm vectors per cell. armA/armB
// go BACK from the apex at 45° to the direction so the apex angle is
// always 90°.
const SPECS: Record<Exclude<ReferencePoint, 'center'>, Spec> = {
  top: {direction: {x: 0, y: -1}, armA: {x: -SQRT_HALF, y: SQRT_HALF}, armB: {x: SQRT_HALF, y: SQRT_HALF}},
  bottom: {direction: {x: 0, y: 1}, armA: {x: -SQRT_HALF, y: -SQRT_HALF}, armB: {x: SQRT_HALF, y: -SQRT_HALF}},
  left: {direction: {x: -1, y: 0}, armA: {x: SQRT_HALF, y: -SQRT_HALF}, armB: {x: SQRT_HALF, y: SQRT_HALF}},
  right: {direction: {x: 1, y: 0}, armA: {x: -SQRT_HALF, y: -SQRT_HALF}, armB: {x: -SQRT_HALF, y: SQRT_HALF}},
  'top-left': {direction: {x: -SQRT_HALF, y: -SQRT_HALF}, armA: {x: 0, y: 1}, armB: {x: 1, y: 0}},
  'top-right': {direction: {x: SQRT_HALF, y: -SQRT_HALF}, armA: {x: 0, y: 1}, armB: {x: -1, y: 0}},
  'bottom-left': {direction: {x: -SQRT_HALF, y: SQRT_HALF}, armA: {x: 0, y: -1}, armB: {x: 1, y: 0}},
  'bottom-right': {direction: {x: SQRT_HALF, y: SQRT_HALF}, armA: {x: 0, y: -1}, armB: {x: -1, y: 0}},
};

type SegmentLayout = {
  left: number;
  top: number;
  width: number;
  height: number;
  transform: [{rotate: string}];
};

const segmentLayoutsFor = (ref: Exclude<ReferencePoint, 'center'>, cellSize: number): SegmentLayout[] => {
  const c = cellSize / 2;
  const spec = SPECS[ref];
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

const SEGMENTS_BY_REF: Record<
  Exclude<ReferencePoint, 'center'>,
  readonly SegmentLayout[]
> = ALL_REFERENCE_POINTS.reduce((acc, ref) => {
  if (ref !== 'center') {
    acc[ref] = segmentLayoutsFor(ref, dimensions.cellSize);
  }
  return acc;
}, {} as Record<Exclude<ReferencePoint, 'center'>, readonly SegmentLayout[]>);

const CENTER_DOT_LAYOUT: ViewStyle = {
  position: 'absolute',
  left: (dimensions.cellSize - CENTER_DOT_SIZE) / 2,
  top: (dimensions.cellSize - CENTER_DOT_SIZE) / 2,
  width: CENTER_DOT_SIZE,
  height: CENTER_DOT_SIZE,
  borderRadius: CENTER_DOT_SIZE / 2,
};

const ARROW_BASE_STYLE: ViewStyle = {position: 'absolute'};
const CELL_FILL_WHITE: ViewStyle = {backgroundColor: '#ffffff'};
const CELL_FILL_BLACK: ViewStyle = {backgroundColor: '#000000'};
const CELL_STYLE_UNSELECTED: ViewStyle[] = [styles.markCellBase, CELL_FILL_WHITE];
const CELL_STYLE_SELECTED: ViewStyle[] = [styles.markCellBase, CELL_FILL_BLACK];

const Glyph: React.FC<{ref_: ReferencePoint; selected: boolean}> = React.memo(({ref_, selected}) => {
  const fg = selected ? '#ffffff' : '#000000';
  if (ref_ === 'center') {
    return <View style={[CENTER_DOT_LAYOUT, {backgroundColor: fg}]} />;
  }
  return (
    <>
      {SEGMENTS_BY_REF[ref_].map((seg, i) => (
        <View key={i} style={[ARROW_BASE_STYLE, seg, {backgroundColor: fg}]} />
      ))}
    </>
  );
});
Glyph.displayName = 'Glyph';

export const ReferencePicker: React.FC<ReferencePickerProps> = ({value, onPick}) => (
  <View style={styles.markGrid}>
    {GRID.map((row, ri) => (
      <View key={ri} style={styles.markRow}>
        {row.map(ref => {
          const selected = value === ref;
          return (
            <Pressable
              key={ref}
              style={selected ? CELL_STYLE_SELECTED : CELL_STYLE_UNSELECTED}
              onPress={() => onPick(ref)}>
              <Glyph ref_={ref} selected={selected} />
            </Pressable>
          );
        })}
      </View>
    ))}
  </View>
);
