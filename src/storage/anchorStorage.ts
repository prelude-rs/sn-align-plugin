// Persistence for the alignment state — both the AlignmentConfig
// (anchor + target reference points, axis toggles, offsets) and the
// optional anchorBox. The two pieces are orthogonal (the user can
// tweak config without disturbing the anchor) but share an envelope
// so a single load returns the full state.
//
// Backend: in-memory only. The Supernote firmware doesn't expose a
// key-value store through sn-plugin-lib, and no AsyncStorage native
// module is included in the plugin host. Sibling plugins use the
// same memory fallback. If a future sn-plugin-lib release adds a
// public KV API on PluginManager / NativePluginManager / PluginFileAPI,
// re-introduce a KvBackend adapter then — until that trigger fires we
// don't pay carrying cost for the stub (Phase 3 D-04, audit §6.1).
//
// The plugin's JS context survives across lasso taps and across note
// swaps within a session, so memory is sufficient for in-session
// persistence. State is lost when the host process is killed (device
// restart, plugin reinstall).

import {type AlignmentConfig, type Rect, DEFAULT_ALIGNMENT_CONFIG} from '../core/anchor';

export type AnchorState = {
  readonly config: AlignmentConfig;
  readonly anchorBox: Rect | null;
};

// Schema-versioned envelope shape. The v3 discriminator is preserved as the
// future-migration anchor: any future persistent backend re-introducing
// load/save round-trips parses this envelope and resets to
// DEFAULT_ANCHOR_STATE on version mismatch (Phase 3 D-04, audit §6.1).
export type AnchorEnvelope = {
  readonly version: 3;
  readonly config: AlignmentConfig;
  readonly anchorBox: Rect | null;
};

export const DEFAULT_ANCHOR_STATE: AnchorState = {
  config: DEFAULT_ALIGNMENT_CONFIG,
  anchorBox: null,
};

export interface AnchorStorage {
  load(): Promise<AnchorState>;
  save(state: AnchorState): Promise<void>;
  setConfig(config: AlignmentConfig): Promise<void>;
  setAnchorBox(box: Rect | null): Promise<void>;
}

const buildStorage = (
  read: () => Promise<AnchorState>,
  write: (state: AnchorState) => Promise<void>,
): AnchorStorage => ({
  load: read,
  save: write,
  async setConfig(config) {
    const current = await read();
    await write({...current, config});
  },
  async setAnchorBox(box) {
    const current = await read();
    await write({...current, anchorBox: box});
  },
});

export const createMemoryAnchorStorage = (initial: AnchorState = DEFAULT_ANCHOR_STATE): AnchorStorage => {
  let state: AnchorState = initial;
  return buildStorage(
    async () => state,
    async next => {
      state = next;
    },
  );
};

let cachedDefault: AnchorStorage | null = null;

export const getDefaultAnchorStorage = (): AnchorStorage => {
  if (!cachedDefault) {
    cachedDefault = createMemoryAnchorStorage();
  }
  return cachedDefault;
};

export const __resetDefaultAnchorStorageForTest = (): void => {
  cachedDefault = null;
};
