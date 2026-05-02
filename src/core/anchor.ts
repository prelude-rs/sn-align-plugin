// Math + types for the alignment feature. Two orthogonal pieces of
// state combine at apply time:
//
//   alignmentType — one of 8 directions (4 corners + 4 sides). The
//     user's preference for which edge / corner to align to. Always
//     set; default 'left'. Persisted on its own.
//
//   anchorBox — the saved bounding box of a previous selection. The
//     reference whose edge / corner the next selection's matching
//     edge / corner gets translated to land on. Optional; absent on
//     first install and after the user clears it. Persisted on its
//     own.
//
// Changing alignmentType does NOT clear anchorBox: the box is a Rect,
// so any alignmentType can be applied against it without re-saving.

export type Rect = {left: number; top: number; right: number; bottom: number};

export type AlignmentType =
  | 'top-left'
  | 'top'
  | 'top-right'
  | 'right'
  | 'bottom-right'
  | 'bottom'
  | 'bottom-left'
  | 'left';

export const ALL_ALIGNMENT_TYPES: readonly AlignmentType[] = [
  'top-left',
  'top',
  'top-right',
  'right',
  'bottom-right',
  'bottom',
  'bottom-left',
  'left',
] as const;

export type AnchorBox = Rect;

const constrainsX = (t: AlignmentType): boolean =>
  t === 'top-left' || t === 'top-right' || t === 'bottom-right' || t === 'bottom-left' || t === 'right' || t === 'left';

const constrainsY = (t: AlignmentType): boolean =>
  t === 'top-left' || t === 'top-right' || t === 'bottom-right' || t === 'bottom-left' || t === 'top' || t === 'bottom';

const pickXEdge = (b: Rect, t: AlignmentType): number => {
  if (t === 'top-left' || t === 'bottom-left' || t === 'left') {
    return b.left;
  }
  return b.right;
};

const pickYEdge = (b: Rect, t: AlignmentType): number => {
  if (t === 'top-left' || t === 'top-right' || t === 'top') {
    return b.top;
  }
  return b.bottom;
};

// Translation that, when applied to currentBbox, lands its edge /
// corner (per alignmentType) on anchorBox's matching edge / corner.
// Side types produce zero shift on the unconstrained axis.
export const computeAnchorShift = (
  anchorBox: AnchorBox,
  currentBbox: Rect,
  alignmentType: AlignmentType,
): {dx: number; dy: number} => {
  const dx = constrainsX(alignmentType)
    ? pickXEdge(anchorBox, alignmentType) - pickXEdge(currentBbox, alignmentType)
    : 0;
  const dy = constrainsY(alignmentType)
    ? pickYEdge(anchorBox, alignmentType) - pickYEdge(currentBbox, alignmentType)
    : 0;
  return {dx, dy};
};

export const isAnchorBox = (v: unknown): v is AnchorBox => {
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

export const isAlignmentType = (v: unknown): v is AlignmentType =>
  typeof v === 'string' && ALL_ALIGNMENT_TYPES.includes(v as AlignmentType);
