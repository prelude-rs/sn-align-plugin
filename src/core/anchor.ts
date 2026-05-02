// Two-point alignment math. The user picks a reference point on the
// anchor box and a reference point on the target (lasso) box, plus
// optional per-axis constraints and gaps. The translation lands the
// target's reference point on the anchor's reference point (modulo
// gaps and axis toggles).
//
// Reference points are 9: the 4 corners, the 4 mid-sides, and the
// geometric center. Each maps to a 2D point on a Rect; corners pick
// edge values for both axes, side-mids pick edge for one axis and
// box-center for the other, center picks both axes' centers.
//
// Axis toggles: when constrainX is false, dx = 0 (target keeps its
// X). Same for constrainY. Default is both ON, giving full 2D snap.
// Gaps offset the anchor point before the shift is computed, so a
// positive gapX pushes the target rightward of where it would
// otherwise land.

export type Rect = {left: number; top: number; right: number; bottom: number};

export type ReferencePoint =
  | 'top-left'
  | 'top'
  | 'top-right'
  | 'right'
  | 'bottom-right'
  | 'bottom'
  | 'bottom-left'
  | 'left'
  | 'center';

export const ALL_REFERENCE_POINTS: readonly ReferencePoint[] = [
  'top-left',
  'top',
  'top-right',
  'right',
  'bottom-right',
  'bottom',
  'bottom-left',
  'left',
  'center',
] as const;

export type AlignmentConfig = {
  readonly anchorRef: ReferencePoint;
  readonly targetRef: ReferencePoint;
  readonly constrainX: boolean;
  readonly constrainY: boolean;
  readonly gapX: number;
  readonly gapY: number;
};

export const DEFAULT_ALIGNMENT_CONFIG: AlignmentConfig = {
  anchorRef: 'left',
  targetRef: 'left',
  constrainX: true,
  constrainY: true,
  gapX: 0,
  gapY: 0,
};

export type Point = {x: number; y: number};

const isLeft = (r: ReferencePoint): boolean => r === 'top-left' || r === 'left' || r === 'bottom-left';
const isRight = (r: ReferencePoint): boolean => r === 'top-right' || r === 'right' || r === 'bottom-right';
const isTop = (r: ReferencePoint): boolean => r === 'top-left' || r === 'top' || r === 'top-right';
const isBottom = (r: ReferencePoint): boolean => r === 'bottom-left' || r === 'bottom' || r === 'bottom-right';

export const pointOnBox = (box: Rect, ref: ReferencePoint): Point => {
  const cx = (box.left + box.right) / 2;
  const cy = (box.top + box.bottom) / 2;
  const x = isLeft(ref) ? box.left : isRight(ref) ? box.right : cx;
  const y = isTop(ref) ? box.top : isBottom(ref) ? box.bottom : cy;
  return {x, y};
};

export const computeAnchorShift = (
  anchorBox: Rect,
  currentBbox: Rect,
  config: AlignmentConfig,
): {dx: number; dy: number} => {
  const aP = pointOnBox(anchorBox, config.anchorRef);
  const tP = pointOnBox(currentBbox, config.targetRef);
  const dx = config.constrainX ? aP.x + config.gapX - tP.x : 0;
  const dy = config.constrainY ? aP.y + config.gapY - tP.y : 0;
  return {dx, dy};
};

export const translateRect = (r: Rect, dx: number, dy: number): Rect => ({
  left: r.left + dx,
  top: r.top + dy,
  right: r.right + dx,
  bottom: r.bottom + dy,
});

export const isAnchorBox = (v: unknown): v is Rect => {
  if (!v || typeof v !== 'object') {
    return false;
  }
  const r = v as Partial<Rect>;
  return (
    typeof r.left === 'number' &&
    typeof r.top === 'number' &&
    typeof r.right === 'number' &&
    typeof r.bottom === 'number'
  );
};

export const isReferencePoint = (v: unknown): v is ReferencePoint =>
  typeof v === 'string' && ALL_REFERENCE_POINTS.includes(v as ReferencePoint);

export const isAlignmentConfig = (v: unknown): v is AlignmentConfig => {
  if (!v || typeof v !== 'object') {
    return false;
  }
  const c = v as Partial<AlignmentConfig>;
  return (
    isReferencePoint(c.anchorRef) &&
    isReferencePoint(c.targetRef) &&
    typeof c.constrainX === 'boolean' &&
    typeof c.constrainY === 'boolean' &&
    typeof c.gapX === 'number' &&
    typeof c.gapY === 'number'
  );
};
