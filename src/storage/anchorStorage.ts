// Persistence for the alignment state — both the AlignmentConfig
// (anchor + target reference points, axis toggles, gaps) and the
// optional anchorBox. The two pieces are orthogonal (the user can
// tweak config without disturbing the anchor) but share an envelope
// so a single load returns the full state.
//
// Backend: in-memory only. The Supernote firmware doesn't expose a
// key-value store through sn-plugin-lib, and the
// @react-native-async-storage native module isn't included in the
// plugin host. Sibling plugins use the same memory fallback for the
// same reason.
//
// The plugin's JS context survives across lasso taps and across note
// swaps within a session, so memory is sufficient for in-session
// persistence. State is lost when the host process is killed (device
// restart, plugin reinstall).

import {
  isAlignmentConfig,
  isAnchorBox,
  type AlignmentConfig,
  type Rect,
  DEFAULT_ALIGNMENT_CONFIG,
} from '../core/anchor';
import type {Logger} from '../sdk/types';

export const ANCHOR_STORAGE_KEY = '@snalign_anchor_state';

export type AnchorState = {
  readonly config: AlignmentConfig;
  readonly anchorBox: Rect | null;
};

export type AnchorEnvelope = {
  readonly version: 3;
  readonly config: AlignmentConfig;
  readonly anchorBox: Rect | null;
};

const SCHEMA_VERSION = 3 as const;

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

type KvBackend = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

const parseEnvelope = (raw: string | null): AnchorState => {
  if (!raw) {
    return DEFAULT_ANCHOR_STATE;
  }
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return DEFAULT_ANCHOR_STATE;
  }
  if (!data || typeof data !== 'object') {
    return DEFAULT_ANCHOR_STATE;
  }
  const env = data as Partial<AnchorEnvelope>;
  if (env.version !== SCHEMA_VERSION) {
    return DEFAULT_ANCHOR_STATE;
  }
  if (!isAlignmentConfig(env.config)) {
    return DEFAULT_ANCHOR_STATE;
  }
  const anchorBox =
    env.anchorBox === null || env.anchorBox === undefined ? null : isAnchorBox(env.anchorBox) ? env.anchorBox : null;
  return {config: env.config, anchorBox};
};

const serialiseEnvelope = (state: AnchorState): string => {
  const env: AnchorEnvelope = {
    version: SCHEMA_VERSION,
    config: state.config,
    anchorBox: state.anchorBox,
  };
  return JSON.stringify(env);
};

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

export const createKvBackedAnchorStorage = (backend: KvBackend, logger?: Pick<Logger, 'error'>): AnchorStorage =>
  buildStorage(
    async () => {
      try {
        const raw = await backend.getItem(ANCHOR_STORAGE_KEY);
        return parseEnvelope(raw);
      } catch (e) {
        logger?.error(`[align:storage] load failed: ${(e as Error).message}`);
        return DEFAULT_ANCHOR_STATE;
      }
    },
    async state => {
      try {
        await backend.setItem(ANCHOR_STORAGE_KEY, serialiseEnvelope(state));
      } catch (e) {
        logger?.error(`[align:storage] save failed: ${(e as Error).message}`);
      }
    },
  );

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
