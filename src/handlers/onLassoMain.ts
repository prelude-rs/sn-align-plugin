// Lasso-toolbar button handler. Single dual-mode button:
//
//   No anchor saved → save the current lasso bbox as anchorBox.
//   Anchor saved   → apply alignment by translating the lasso so its
//                    edge / corner (per stored alignmentType) lands
//                    on the anchor's matching edge / corner. Uses
//                    the firmware's native resizeLassoRect path,
//                    which commits on setLassoBoxState(2) and is
//                    undoable.
//
// No popup. The handler reads state, dispatches by anchor presence,
// and tears down. Phase 5 swaps the button's name/icon between
// "Set Anchor" and "Apply Alignment" via modifyButtonRes.

import {tryAcquire, release} from '../core/reentrancyGuard';
import {computeAnchorShift, type Rect} from '../core/anchor';
import type {APIResponse, Logger} from '../sdk/types';
import {unwrap} from '../sdk/unwrap';
import {safeClosePluginView} from '../sdk/closeView';
import type {AnchorStorage} from '../storage/anchorStorage';

const LASSO_BOX_STATE_RELEASED = 2;

export type LassoCommAPILike = {
  getLassoRect: () => Promise<APIResponse<Rect>>;
  resizeLassoRect: (rect: Rect) => Promise<APIResponse<boolean>>;
  setLassoBoxState: (state: number) => Promise<APIResponse<boolean>>;
  closePluginView: () => Promise<boolean>;
};

export type LassoDeps = {
  comm: LassoCommAPILike;
  storage: AnchorStorage;
  logger: Logger;
  // Phase 5: swap the lasso button identity to "Apply Alignment"
  // after a successful Set Anchor. Phase 4 leaves it absent.
  onAnchorSaved?: () => void;
};

export type LassoOutcome =
  | 'ok-saved'
  | 'ok-applied'
  | 'busy'
  | 'noop'
  | 'failed';

export const onLassoMain = async (deps: LassoDeps): Promise<LassoOutcome> => {
  if (!tryAcquire()) {
    deps.logger.warn(
      '[align:lasso] pipeline already running — ignoring re-entry',
    );
    await safeClosePluginView(deps.comm, deps.logger);
    return 'busy';
  }

  try {
    const state = await deps.storage.load();
    const lassoRect = unwrap(
      await deps.comm.getLassoRect(),
      'getLassoRect',
    );

    if (state.anchorBox === null) {
      // Set Anchor branch.
      await deps.storage.setAnchorBox(lassoRect);
      deps.logger.log(
        `[align:lasso] saved anchor box=${JSON.stringify(lassoRect)}`,
      );
      if (deps.onAnchorSaved) {
        try {
          deps.onAnchorSaved();
        } catch (e) {
          deps.logger.warn(
            `[align:lasso] onAnchorSaved threw: ${(e as Error).message}`,
          );
        }
      }
      return 'ok-saved';
    }

    // Apply Alignment branch.
    const {dx, dy} = computeAnchorShift(
      state.anchorBox,
      lassoRect,
      state.alignmentType,
    );
    if (dx === 0 && dy === 0) {
      deps.logger.log('[align:lasso] selection already aligned with anchor');
      return 'noop';
    }

    const newRect: Rect = {
      left: lassoRect.left + dx,
      top: lassoRect.top + dy,
      right: lassoRect.right + dx,
      bottom: lassoRect.bottom + dy,
    };

    deps.logger.log(
      `[align:lasso] resize lasso (dx=${dx}, dy=${dy}, type=${state.alignmentType}) ${JSON.stringify(lassoRect)} -> ${JSON.stringify(newRect)}`,
    );

    const res = await deps.comm.resizeLassoRect(newRect);
    if (!res || !res.success) {
      deps.logger.warn(
        `[align:lasso] resizeLassoRect failed: ${res?.error?.message ?? 'no error'}`,
      );
      return 'failed';
    }

    deps.logger.log('[align:lasso] resizeLassoRect ok');
    return 'ok-applied';
  } catch (e) {
    deps.logger.error(`[align:lasso] crashed: ${(e as Error).message}`);
    return 'failed';
  } finally {
    // SYNC-FIRST: release before any await — the firmware can suspend
    // the JS context mid-await and leave the busy flag stuck.
    release();
    try {
      await deps.comm.setLassoBoxState(LASSO_BOX_STATE_RELEASED);
    } catch (e) {
      deps.logger.warn(
        `[align:lasso] setLassoBoxState(2) threw: ${(e as Error).message}`,
      );
    }
    await safeClosePluginView(deps.comm, deps.logger);
  }
};
