// Single popup-driven lasso handler. The button (showType:1) opens
// the popup; all interactions (picker, toggles, offsets, save, apply,
// clear) flow back through callbacks.
//
// Lasso box state lifecycle (per SDK: 0=Show, 1=Hide, 2=Completely
// remove):
//   - On entry, after capturing the initial lasso bbox, we call
//     setLassoBoxState(1) to HIDE the lasso menu/toolbar. This keeps
//     the lasso selection alive (so resizeLassoRect can still operate
//     on it during Apply) while removing the visual pollution of
//     stacking our popup on top of the menu.
//   - On every teardown path (Set Anchor / Apply / Close), we call
//     setLassoBoxState(2) to commit any pending resize and fully
//     release the lasso state — required to avoid leaving the host's
//     gesture chain dangling (sn-formula precedent).
//
// Caching: while the popup is showing, the firmware can't change the
// lasso bbox or the page size (menu is hidden, no nav). We capture
// both at popup open and reuse the cached values for every settings
// change and the Apply path. This avoids 4 firmware calls per
// interaction (getCurrentFilePath, getCurrentPageNum, getPageSize,
// getLassoRect) — a meaningful battery + latency win on E-Ink.
//
// Reentrancy guard: tryAcquire on entry, release SYNC-FIRST in the
// finally block of action handlers (the firmware's state:stop can
// suspend mid-await). Settings-only callbacks (picker, offsets, toggles)
// don't need the guard since they don't touch firmware state.

import {tryAcquire, release} from '../core/reentrancyGuard';
import {computeAnchorShift, translateRect, type AlignmentConfig, type ReferencePoint, type Rect} from '../core/anchor';
import type {APIResponse, Logger} from '../sdk/types';
import {unwrap} from '../sdk/unwrap';
import {safeClosePluginView} from '../sdk/closeView';
import {fitsInPage, resolvePageSize, type PageSize, type PageSizeCommAPI, type PageSizeFileAPI} from '../sdk/pageSize';
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

const wouldExitPage = (
  config: AlignmentConfig,
  anchorBox: Rect | null,
  lasso: Rect | null,
  page: PageSize,
): boolean => {
  if (!anchorBox || !lasso) {
    return false;
  }
  const {dx, dy} = computeAnchorShift(anchorBox, lasso, config);
  return !fitsInPage(translateRect(lasso, dx, dy), page);
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

  // One-shot firmware reads — neither value can change while our
  // popup is showing (the menu is hidden + no nav available).
  const lasso = await tryGetLassoRect(deps);
  const page = await resolvePageSize(deps.comm, deps.fileApi, deps.logger);

  // Hide the lasso menu now that we've captured what we need to
  // render the popup. State 1 keeps the lasso alive for resize.
  await safeSetLassoBoxState(deps, LASSO_BOX_STATE_HIDDEN);

  // Closure-local state mirrors what's in storage so settings-only
  // callbacks can avoid an extra storage.load round-trip.
  let cfg: AlignmentConfig = initial.config;
  const anchorBox: Rect | null = initial.anchorBox;

  const refreshUi = (): void => {
    updatePopup({
      config: cfg,
      hasAnchor: anchorBox !== null,
      noLasso: lasso === null,
      outOfBounds: wouldExitPage(cfg, anchorBox, lasso, page),
    });
  };

  const patchConfig = async (patch: Partial<AlignmentConfig>): Promise<void> => {
    cfg = {...cfg, ...patch};
    await deps.storage.setConfig(cfg);
    refreshUi();
  };

  const onPatchError = (label: string) => (e: unknown) =>
    deps.logger.warn(`[align:lasso] ${label} failed: ${(e as Error).message}`);

  // Shared body for Apply and Apply & Re-anchor. The re-anchor variant
  // saves the translated rect as the new anchor box on success, so the
  // user can chain Apply & Re-anchor steps to stack/row content. If the
  // resize call fails we skip the re-anchor — chaining off a failed
  // step would silently corrupt the anchor.
  const performApply = async (alsoReAnchor: boolean): Promise<void> => {
    const label = alsoReAnchor ? 'apply+reanchor' : 'apply';
    try {
      if (!anchorBox) {
        deps.logger.warn(`[align:lasso] ${label}: no anchor saved`);
        return;
      }
      if (!lasso) {
        deps.logger.warn(`[align:lasso] ${label}: no lasso selection`);
        return;
      }
      const {dx, dy} = computeAnchorShift(anchorBox, lasso, cfg);
      const newRect = translateRect(lasso, dx, dy);
      if (!fitsInPage(newRect, page)) {
        deps.logger.warn(
          `[align:lasso] ${label} rejected: ${JSON.stringify(newRect)} exits page ${JSON.stringify(page)}`,
        );
        return;
      }
      if (dx === 0 && dy === 0) {
        deps.logger.log(`[align:lasso] ${label}: already aligned (noop)`);
      } else {
        deps.logger.log(
          `[align:lasso] resize lasso (dx=${dx}, dy=${dy}) ${JSON.stringify(lasso)} -> ${JSON.stringify(newRect)}`,
        );
        const res = await deps.comm.resizeLassoRect(newRect);
        if (!res || !res.success) {
          deps.logger.warn(`[align:lasso] resizeLassoRect failed: ${res?.error?.message ?? 'no error'}`);
          return;
        }
      }
      if (alsoReAnchor) {
        await deps.storage.setAnchorBox(newRect);
        deps.logger.log(`[align:lasso] re-anchor box=${JSON.stringify(newRect)}`);
      }
    } catch (e) {
      deps.logger.error(`[align:lasso] ${label} crashed: ${(e as Error).message}`);
    } finally {
      // teardown calls setLassoBoxState(2) which commits the pending
      // resizeLassoRect (firmware semantics) and supports native undo.
      await teardown(deps);
    }
  };

  const callbacks: AlignmentPopupCallbacks = {
    onSetAnchorRef: (ref: ReferencePoint) => {
      patchConfig({anchorRef: ref}).catch(onPatchError('setAnchorRef'));
    },
    onSetTargetRef: (ref: ReferencePoint) => {
      patchConfig({targetRef: ref}).catch(onPatchError('setTargetRef'));
    },
    onToggleAlignX: () => {
      patchConfig({alignX: !cfg.alignX}).catch(onPatchError('toggleAlignX'));
    },
    onToggleAlignY: () => {
      patchConfig({alignY: !cfg.alignY}).catch(onPatchError('toggleAlignY'));
    },
    onSetOffsetX: (value: number) => {
      patchConfig({offsetX: value}).catch(onPatchError('setOffsetX'));
    },
    onSetOffsetY: (value: number) => {
      patchConfig({offsetY: value}).catch(onPatchError('setOffsetY'));
    },
    onSetAnchor: () => {
      (async () => {
        try {
          if (!lasso) {
            deps.logger.warn('[align:lasso] set anchor: no lasso selection');
            return;
          }
          await deps.storage.setAnchorBox(lasso);
          deps.logger.log(`[align:lasso] set anchor box=${JSON.stringify(lasso)}`);
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
      performApply(false).catch(() => {
        /* logged inside */
      });
    },
    onApplyAndReAnchor: () => {
      performApply(true).catch(() => {
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
      config: cfg,
      hasAnchor: anchorBox !== null,
      outOfBounds: wouldExitPage(cfg, anchorBox, lasso, page),
      noLasso: lasso === null,
    },
    callbacks,
  );

  deps.logger.log(`[align:lasso] popup opened (anchor=${anchorBox ? 'set' : 'none'} config=${JSON.stringify(cfg)})`);

  return 'opened';
};
