import {
  ALL_ALIGNMENT_TYPES,
  computeAnchorShift,
  isAlignmentType,
  isAnchorBox,
  type AnchorBox,
  type Rect,
} from '../src/core/anchor';

const anchor: AnchorBox = {left: 100, top: 200, right: 300, bottom: 400};
// Selection bbox is a 100×50 rect we move around.
const sel: Rect = {left: 500, top: 600, right: 600, bottom: 650};

describe('computeAnchorShift', () => {
  it('shifts both axes for corner alignmentTypes', () => {
    expect(computeAnchorShift(anchor, sel, 'top-left')).toEqual({
      dx: 100 - 500,
      dy: 200 - 600,
    });
    expect(computeAnchorShift(anchor, sel, 'top-right')).toEqual({
      dx: 300 - 600,
      dy: 200 - 600,
    });
    expect(computeAnchorShift(anchor, sel, 'bottom-right')).toEqual({
      dx: 300 - 600,
      dy: 400 - 650,
    });
    expect(computeAnchorShift(anchor, sel, 'bottom-left')).toEqual({
      dx: 100 - 500,
      dy: 400 - 650,
    });
  });

  it('shifts only y for top/bottom sides', () => {
    expect(computeAnchorShift(anchor, sel, 'top')).toEqual({
      dx: 0,
      dy: 200 - 600,
    });
    expect(computeAnchorShift(anchor, sel, 'bottom')).toEqual({
      dx: 0,
      dy: 400 - 650,
    });
  });

  it('shifts only x for left/right sides', () => {
    expect(computeAnchorShift(anchor, sel, 'left')).toEqual({
      dx: 100 - 500,
      dy: 0,
    });
    expect(computeAnchorShift(anchor, sel, 'right')).toEqual({
      dx: 300 - 600,
      dy: 0,
    });
  });

  it('returns zero shift when the relevant edge already aligns', () => {
    const aligned: Rect = {left: 100, top: 999, right: 999, bottom: 999};
    expect(computeAnchorShift(anchor, aligned, 'left')).toEqual({dx: 0, dy: 0});
  });

  it('orthogonality: alignmentType can change without re-saving anchor', () => {
    // Same anchor + same selection, different types → independent results.
    const left = computeAnchorShift(anchor, sel, 'left');
    const top = computeAnchorShift(anchor, sel, 'top');
    expect(left.dy).toBe(0);
    expect(top.dx).toBe(0);
    expect(left.dx).not.toBe(0);
    expect(top.dy).not.toBe(0);
  });
});

describe('isAnchorBox', () => {
  it('accepts a full Rect', () => {
    expect(isAnchorBox(anchor)).toBe(true);
  });

  it('rejects partial / wrong-typed rects', () => {
    expect(isAnchorBox({left: 1, top: 2, right: 3})).toBe(false);
    expect(isAnchorBox({left: '1', top: 2, right: 3, bottom: 4})).toBe(false);
    expect(isAnchorBox(null)).toBe(false);
    expect(isAnchorBox('hi')).toBe(false);
  });
});

describe('isAlignmentType', () => {
  it('accepts every member of ALL_ALIGNMENT_TYPES', () => {
    for (const t of ALL_ALIGNMENT_TYPES) {
      expect(isAlignmentType(t)).toBe(true);
    }
  });

  it('rejects strings outside the enum', () => {
    expect(isAlignmentType('middle')).toBe(false);
    expect(isAlignmentType(42)).toBe(false);
  });

  it('covers all 8 alignment types', () => {
    expect(ALL_ALIGNMENT_TYPES).toHaveLength(8);
  });
});
