// Page-toolbar button handler. Opens the popup so the user can set
// the alignmentType (which cell of the 3×3 grid is "selected" / will
// be used at apply time) or clear the saved anchor box. The popup
// only mutates one field at a time — picking a cell sets
// alignmentType and leaves anchorBox alone, since the two are
// orthogonal (a saved anchor box can be applied against any
// alignmentType without re-saving).
//
// This handler does NOT call setLassoBoxState — the page toolbar is
// not a lasso surface, there's no firmware lasso state to release.

import {tryAcquire, release} from '../core/reentrancyGuard';
import type {AlignmentType} from '../core/anchor';
import {hidePopup, showPopup} from '../ui/popupController';
import type {Logger} from '../sdk/types';
import {safeClosePluginView} from '../sdk/closeView';
import {DEFAULT_ANCHOR_STATE, type AnchorStorage} from '../storage/anchorStorage';

export type PageCommAPILike = {
  closePluginView: () => Promise<boolean>;
};

export type PageDeps = {
  comm: PageCommAPILike;
  storage: AnchorStorage;
  logger: Logger;
  // Phase 5 will plumb a setLassoButtonIdentity callback here so
  // clearing the anchor can swap the lasso button back to "Set
  // Anchor". Phase 4 leaves it absent — the lasso button keeps the
  // identity it booted with until something else triggers a swap.
  onAnchorCleared?: () => void;
};

export type PageOutcome = 'ok' | 'busy' | 'failed';

const teardown = async (deps: PageDeps): Promise<void> => {
  // SYNC-FIRST: release before any await — the firmware can suspend
  // the JS context mid-await and leave the busy flag stuck.
  release();
  hidePopup();
  await safeClosePluginView(deps.comm, deps.logger);
};

const runSetAlignmentType = async (
  deps: PageDeps,
  alignmentType: AlignmentType,
): Promise<void> => {
  try {
    await deps.storage.setAlignmentType(alignmentType);
    deps.logger.log(`[align:page] alignmentType=${alignmentType}`);
  } catch (e) {
    deps.logger.error(
      `[align:page] setAlignmentType crashed: ${(e as Error).message}`,
    );
  }
};

const runClearAnchor = async (deps: PageDeps): Promise<void> => {
  try {
    await deps.storage.setAnchorBox(null);
    deps.logger.log('[align:page] cleared anchor');
    if (deps.onAnchorCleared) {
      try {
        deps.onAnchorCleared();
      } catch (e) {
        deps.logger.warn(
          `[align:page] onAnchorCleared threw: ${(e as Error).message}`,
        );
      }
    }
  } catch (e) {
    deps.logger.error(
      `[align:page] clearAnchor crashed: ${(e as Error).message}`,
    );
  }
};

export const onPageToolbar = async (deps: PageDeps): Promise<PageOutcome> => {
  if (!tryAcquire()) {
    deps.logger.warn(
      '[align:page] pipeline already running — ignoring re-entry',
    );
    await safeClosePluginView(deps.comm, deps.logger);
    return 'busy';
  }

  let state = DEFAULT_ANCHOR_STATE;
  try {
    state = await deps.storage.load();
  } catch (e) {
    deps.logger.error(
      `[align:page] storage.load crashed: ${(e as Error).message}`,
    );
    release();
    await safeClosePluginView(deps.comm, deps.logger);
    return 'failed';
  }

  deps.logger.log(
    `[align:page] showing popup (anchor=${state.anchorBox ? 'set' : 'none'} type=${state.alignmentType})`,
  );

  showPopup(state.alignmentType, state.anchorBox != null, {
    onSetAlignmentType: async alignmentType => {
      await runSetAlignmentType(deps, alignmentType);
      await teardown(deps);
    },
    onClearAnchor: async () => {
      await runClearAnchor(deps);
      await teardown(deps);
    },
    onClose: async () => {
      await teardown(deps);
    },
  });

  return 'ok';
};
