// Single popup-driven lasso handler. The button (showType:1) opens
// the popup; all interactions (picker, toggles, gaps, save, apply,
// clear) flow back through callbacks.
//
// Lasso box state lifecycle (per SDK: 0=Show, 1=Hide, 2=Completely
// remove):
//   - On entry, after capturing the initial lasso bbox, we call
//     setLassoBoxState(1) to HIDE the lasso menu/toolbar. This keeps
//     the lasso selection alive (so resizeLassoRect can still operate
//     on it during Apply) while removing the visual pollution of
//     stacking our popup on top of the menu. Mirrors the sn-dictionary
//     pattern but using state 1 instead of 2 since we still need the
//     lasso for the Apply path.
//   - On every teardown path (Save / Apply / Clear / Close), we call
//     setLassoBoxState(2) to commit any pending resize and fully
//     release the lasso state — required to avoid leaving the host's
//     gesture chain dangling (sn-formula precedent).
//
// Reentrancy guard: tryAcquire on entry, release SYNC-FIRST in the
// finally block of action handlers (the firmware's state:stop can
// suspend mid-await). Settings-only callbacks (picker, gaps, toggles)
// don't need the guard since they don't touch firmware state.

import {tryAcquire, release} from '../core/reentrancyGuard';
import {computeAnchorShift, translateRect, type AlignmentConfig, type ReferencePoint, type Rect} from '../core/anchor';
import type {APIResponse, Logger} from '../sdk/types';
import {unwrap} from '../sdk/unwrap';
import {safeClosePluginView} from '../sdk/closeView';
import {fitsInPage, resolvePageSize, type PageSizeCommAPI, type PageSizeFileAPI} from '../sdk/pageSize';
import type {AnchorStorage} from '../storage/anchorStorage';
import type {AlignmentPopupCallbacks} from '../ui/AlignmentPopup';
import {hidePopup, showPopup, updatePopup} from '../ui/popupController';

const LASSO_BOX_STATE_HIDDEN = 1;
const LASSO_BOX_STATE_RELEASED = 2;

export type LassoCommAPILike = PageSizeCommAPI & {
  getLassoRect: () => Promise<APIResponse<Rect>>;
  resizeLassoRect: (rect: Rect) => Promise<APIResponse<boolean>>;
  setLassoBoxState: (state: number) => Promise<APIResponse<boolean>>;
  closePluginView: () => Promise<boolean>;
};

export type LassoDeps = {
  comm: LassoCommAPILike;
  fileApi: PageSizeFileAPI;
  storage: AnchorStorage;
  logger: Logger;
};

export type LassoOutcome = 'opened' | 'busy' | 'failed';

const tryGetLassoRect = async (deps: LassoDeps): Promise<Rect | null> => {
  try {
    return unwrap(await deps.comm.getLassoRect(), 'getLassoRect');
  } catch (e) {
    deps.logger.warn(`[align:lasso] getLassoRect failed: ${(e as Error).message}`);
    return null;
  }
};

const safeSetLassoBoxState = async (deps: LassoDeps, state: number): Promise<void> => {
  try {
    const res = await deps.comm.setLassoBoxState(state);
    if (!res || !res.success) {
      deps.logger.warn(`[align:lasso] setLassoBoxState(${state}) success=false: ${res?.error?.message ?? 'unknown'}`);
    }
  } catch (e) {
    deps.logger.warn(`[align:lasso] setLassoBoxState(${state}) threw: ${(e as Error).message}`);
  }
};

const computeOutOfBounds = async (
  deps: LassoDeps,
  config: AlignmentConfig,
  anchorBox: Rect | null,
  lassoRect: Rect | null,
): Promise<boolean> => {
  if (!anchorBox || !lassoRect) {
    return false;
  }
  const {dx, dy} = computeAnchorShift(anchorBox, lassoRect, config);
  const newRect = translateRect(lassoRect, dx, dy);
  const page = await resolvePageSize(deps.comm, deps.fileApi, deps.logger);
  return !fitsInPage(newRect, page);
};

const recomputeFlags = async (deps: LassoDeps): Promise<void> => {
  const state = await deps.storage.load();
  const lasso = await tryGetLassoRect(deps);
  const oob = await computeOutOfBounds(deps, state.config, state.anchorBox, lasso);
  updatePopup({config: state.config, hasAnchor: state.anchorBox !== null, noLasso: lasso === null, outOfBounds: oob});
};

const teardown = async (deps: LassoDeps): Promise<void> => {
  release();
  hidePopup();
  // Commit any pending resize and fully release the lasso state on
  // every teardown path. Without this the gesture chain stays armed
  // and pen taps may not land on the page until the user exits the
  // note (sn-formula / sn-dictionary precedent).
  await safeSetLassoBoxState(deps, LASSO_BOX_STATE_RELEASED);
  await safeClosePluginView(deps.comm, deps.logger);
};

export const onLassoMain = async (deps: LassoDeps): Promise<LassoOutcome> => {
  if (!tryAcquire()) {
    deps.logger.warn('[align:lasso] pipeline already running — ignoring re-entry');
    await safeClosePluginView(deps.comm, deps.logger);
    return 'busy';
  }

  let initial;
  try {
    initial = await deps.storage.load();
  } catch (e) {
    deps.logger.error(`[align:lasso] storage.load crashed: ${(e as Error).message}`);
    release();
    await safeClosePluginView(deps.comm, deps.logger);
    return 'failed';
  }

  const lasso = await tryGetLassoRect(deps);
  const initialOob = await computeOutOfBounds(deps, initial.config, initial.anchorBox, lasso);

  // Hide the lasso menu now that we've captured what we need to
  // render the popup. State 1 keeps the lasso alive for resize.
  await safeSetLassoBoxState(deps, LASSO_BOX_STATE_HIDDEN);

  const setConfigPatch = async (patch: Partial<AlignmentConfig>): Promise<void> => {
    const cur = await deps.storage.load();
    const next: AlignmentConfig = {...cur.config, ...patch};
    await deps.storage.setConfig(next);
    await recomputeFlags(deps);
  };

  const callbacks: AlignmentPopupCallbacks = {
    onSetAnchorRef: (ref: ReferencePoint) => {
      setConfigPatch({anchorRef: ref}).catch(e =>
        deps.logger.warn(`[align:lasso] setAnchorRef failed: ${(e as Error).message}`),
      );
    },
    onSetTargetRef: (ref: ReferencePoint) => {
      setConfigPatch({targetRef: ref}).catch(e =>
        deps.logger.warn(`[align:lasso] setTargetRef failed: ${(e as Error).message}`),
      );
    },
    onToggleAlignX: () => {
      deps.storage
        .load()
        .then(s => setConfigPatch({alignX: !s.config.alignX}))
        .catch(e => deps.logger.warn(`[align:lasso] toggleX failed: ${(e as Error).message}`));
    },
    onToggleAlignY: () => {
      deps.storage
        .load()
        .then(s => setConfigPatch({alignY: !s.config.alignY}))
        .catch(e => deps.logger.warn(`[align:lasso] toggleY failed: ${(e as Error).message}`));
    },
    onSetGapX: (value: number) => {
      setConfigPatch({gapX: value}).catch(e =>
        deps.logger.warn(`[align:lasso] setGapX failed: ${(e as Error).message}`),
      );
    },
    onSetGapY: (value: number) => {
      setConfigPatch({gapY: value}).catch(e =>
        deps.logger.warn(`[align:lasso] setGapY failed: ${(e as Error).message}`),
      );
    },
    onSetAnchor: () => {
      (async () => {
        try {
          const rect = await tryGetLassoRect(deps);
          if (!rect) {
            deps.logger.warn('[align:lasso] set anchor: no lasso selection');
            await recomputeFlags(deps);
            return;
          }
          await deps.storage.setAnchorBox(rect);
          deps.logger.log(`[align:lasso] set anchor box=${JSON.stringify(rect)}`);
        } catch (e) {
          deps.logger.error(`[align:lasso] set anchor crashed: ${(e as Error).message}`);
        } finally {
          await teardown(deps);
        }
      })().catch(() => {
        /* logged inside */
      });
    },
    onApply: () => {
      (async () => {
        try {
          const state = await deps.storage.load();
          if (!state.anchorBox) {
            deps.logger.warn('[align:lasso] apply: no anchor saved');
            return;
          }
          const lassoRect = await tryGetLassoRect(deps);
          if (!lassoRect) {
            deps.logger.warn('[align:lasso] apply: no lasso selection');
            return;
          }
          const {dx, dy} = computeAnchorShift(state.anchorBox, lassoRect, state.config);
          if (dx === 0 && dy === 0) {
            deps.logger.log('[align:lasso] apply: already aligned (noop)');
            return;
          }
          const newRect = translateRect(lassoRect, dx, dy);
          const page = await resolvePageSize(deps.comm, deps.fileApi, deps.logger);
          if (!fitsInPage(newRect, page)) {
            deps.logger.warn(
              `[align:lasso] apply rejected: ${JSON.stringify(newRect)} exits page ${JSON.stringify(page)}`,
            );
            return;
          }
          deps.logger.log(
            `[align:lasso] resize lasso (dx=${dx}, dy=${dy}) ${JSON.stringify(lassoRect)} -> ${JSON.stringify(
              newRect,
            )}`,
          );
          const res = await deps.comm.resizeLassoRect(newRect);
          if (!res || !res.success) {
            deps.logger.warn(`[align:lasso] resizeLassoRect failed: ${res?.error?.message ?? 'no error'}`);
            return;
          }
        } catch (e) {
          deps.logger.error(`[align:lasso] apply crashed: ${(e as Error).message}`);
        } finally {
          // teardown calls setLassoBoxState(2) which commits the
          // pending resizeLassoRect (firmware semantics) and supports
          // native undo.
          await teardown(deps);
        }
      })().catch(() => {
        /* logged inside */
      });
    },
    onClose: () => {
      teardown(deps).catch(() => {
        /* logged inside */
      });
    },
  };

  showPopup(
    {
      config: initial.config,
      hasAnchor: initial.anchorBox !== null,
      outOfBounds: initialOob,
      noLasso: lasso === null,
    },
    callbacks,
  );

  deps.logger.log(
    `[align:lasso] popup opened (anchor=${initial.anchorBox ? 'set' : 'none'} config=${JSON.stringify(
      initial.config,
    )})`,
  );

  return 'opened';
};
