import {
  ALL_REFERENCE_POINTS,
  DEFAULT_ALIGNMENT_CONFIG,
  computeAnchorShift,
  isAlignmentConfig,
  isAnchorBox,
  isReferencePoint,
  pointOnBox,
  translateRect,
  type AlignmentConfig,
  type Rect,
} from '../src/core/anchor';

const anchor: Rect = {left: 100, top: 200, right: 300, bottom: 400};
// 100×50 selection somewhere far away.
const sel: Rect = {left: 500, top: 600, right: 600, bottom: 650};

const cfg = (patch: Partial<AlignmentConfig> = {}): AlignmentConfig => ({...DEFAULT_ALIGNMENT_CONFIG, ...patch});

describe('pointOnBox', () => {
  it('corners pick edge values for both axes', () => {
    expect(pointOnBox(anchor, 'top-left')).toEqual({x: 100, y: 200});
    expect(pointOnBox(anchor, 'top-right')).toEqual({x: 300, y: 200});
    expect(pointOnBox(anchor, 'bottom-left')).toEqual({x: 100, y: 400});
    expect(pointOnBox(anchor, 'bottom-right')).toEqual({x: 300, y: 400});
  });

  it('side-mids pick edge for one axis and center for the other', () => {
    expect(pointOnBox(anchor, 'top')).toEqual({x: 200, y: 200});
    expect(pointOnBox(anchor, 'bottom')).toEqual({x: 200, y: 400});
    expect(pointOnBox(anchor, 'left')).toEqual({x: 100, y: 300});
    expect(pointOnBox(anchor, 'right')).toEqual({x: 300, y: 300});
  });

  it('center returns the geometric center', () => {
    expect(pointOnBox(anchor, 'center')).toEqual({x: 200, y: 300});
  });
});

describe('computeAnchorShift', () => {
  it('corner-to-corner alignment shifts both axes', () => {
    expect(computeAnchorShift(anchor, sel, cfg({anchorRef: 'top-left', targetRef: 'top-left'}))).toEqual({
      dx: 100 - 500,
      dy: 200 - 600,
    });
  });

  it('side-mid same-side alignment matches centers on the perpendicular axis', () => {
    // Anchor left + Target left → target's left edge meets anchor's left edge,
    // AND target's vertical center (625) lands on anchor's vertical center (300).
    expect(computeAnchorShift(anchor, sel, cfg({anchorRef: 'left', targetRef: 'left'}))).toEqual({
      dx: 100 - 500,
      dy: 300 - 625,
    });
  });

  it('"next to" — anchor right-mid + target left-mid puts target right of anchor', () => {
    // X: target.left (500) → anchor.right (300). dx = -200. Negative because
    // sel was further right than anchor; usually you'd be applying this with
    // a fresh selection elsewhere — the math doesn't care.
    expect(computeAnchorShift(anchor, sel, cfg({anchorRef: 'right', targetRef: 'left'}))).toEqual({
      dx: 300 - 500,
      dy: 300 - 625,
    });
  });

  it('center-to-center fully overlaps centers', () => {
    expect(computeAnchorShift(anchor, sel, cfg({anchorRef: 'center', targetRef: 'center'}))).toEqual({
      dx: 200 - 550,
      dy: 300 - 625,
    });
  });

  it('constrainX: false suppresses dx', () => {
    expect(computeAnchorShift(anchor, sel, cfg({anchorRef: 'left', targetRef: 'left', constrainX: false}))).toEqual({
      dx: 0,
      dy: 300 - 625,
    });
  });

  it('constrainY: false suppresses dy', () => {
    expect(computeAnchorShift(anchor, sel, cfg({anchorRef: 'left', targetRef: 'left', constrainY: false}))).toEqual({
      dx: 100 - 500,
      dy: 0,
    });
  });

  it('preserves current "free perpendicular axis" semantics — left edges aligned, Y untouched', () => {
    // Equivalent of the v0.1.0 "alignmentType: left" behavior.
    expect(
      computeAnchorShift(anchor, sel, cfg({anchorRef: 'left', targetRef: 'left', constrainX: true, constrainY: false})),
    ).toEqual({dx: 100 - 500, dy: 0});
  });

  it('gapX shifts the anchor point rightward before computing dx', () => {
    expect(computeAnchorShift(anchor, sel, cfg({anchorRef: 'right', targetRef: 'left', gapX: 25}))).toEqual({
      dx: 300 + 25 - 500,
      dy: 300 - 625,
    });
  });

  it('gapY shifts the anchor point downward before computing dy', () => {
    expect(computeAnchorShift(anchor, sel, cfg({anchorRef: 'bottom', targetRef: 'top', gapY: 50}))).toEqual({
      dx: 200 - 550,
      dy: 400 + 50 - 600,
    });
  });

  it('zero shift when target reference already lands on anchor reference', () => {
    const aligned: Rect = {left: 100, top: 200, right: 200, bottom: 250};
    // Both anchorRef='top-left' and targetRef='top-left' on aligned at (100, 200) == anchor's (100, 200).
    expect(computeAnchorShift(anchor, aligned, cfg({anchorRef: 'top-left', targetRef: 'top-left'}))).toEqual({
      dx: 0,
      dy: 0,
    });
  });
});

describe('translateRect', () => {
  it('shifts all four edges by the given delta', () => {
    expect(translateRect(sel, 10, -5)).toEqual({left: 510, top: 595, right: 610, bottom: 645});
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

describe('isReferencePoint', () => {
  it('accepts every member of ALL_REFERENCE_POINTS', () => {
    for (const ref of ALL_REFERENCE_POINTS) {
      expect(isReferencePoint(ref)).toBe(true);
    }
  });

  it('rejects strings outside the enum', () => {
    expect(isReferencePoint('middle')).toBe(false);
    expect(isReferencePoint(42)).toBe(false);
  });

  it('covers all 9 reference points', () => {
    expect(ALL_REFERENCE_POINTS).toHaveLength(9);
  });
});

describe('isAlignmentConfig', () => {
  it('accepts a complete config', () => {
    expect(isAlignmentConfig(DEFAULT_ALIGNMENT_CONFIG)).toBe(true);
  });

  it('rejects missing fields', () => {
    expect(isAlignmentConfig({anchorRef: 'left', targetRef: 'left'})).toBe(false);
  });

  it('rejects invalid reference points', () => {
    expect(
      isAlignmentConfig({
        anchorRef: 'middle',
        targetRef: 'left',
        constrainX: true,
        constrainY: true,
        gapX: 0,
        gapY: 0,
      }),
    ).toBe(false);
  });

  it('rejects non-boolean toggles', () => {
    expect(
      isAlignmentConfig({
        anchorRef: 'left',
        targetRef: 'left',
        constrainX: 'yes',
        constrainY: true,
        gapX: 0,
        gapY: 0,
      }),
    ).toBe(false);
  });

  it('rejects non-numeric gaps', () => {
    expect(
      isAlignmentConfig({
        anchorRef: 'left',
        targetRef: 'left',
        constrainX: true,
        constrainY: true,
        gapX: '10',
        gapY: 0,
      }),
    ).toBe(false);
  });
});
