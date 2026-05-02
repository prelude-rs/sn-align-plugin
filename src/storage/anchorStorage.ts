// Persistence for the alignment state — both the user's preferred
// alignmentType and the optional anchorBox. The two are orthogonal
// (the user can change alignmentType without disturbing anchorBox)
// but they share an envelope so a single load returns the full
// state and a single save commits both.
//
// Backend: in-memory only. The Supernote firmware doesn't expose a
// key-value store through sn-plugin-lib, and the
// @react-native-async-storage native module isn't included in the
// plugin host (we observed `Native module is null, cannot access
// legacy storage` on-device). sn-shapes' favoritesStorage uses the
// same memory fallback for the same reason.
//
// Empirically the plugin's JS context survives across lasso taps and
// across note swaps, so memory is sufficient for in-session
// persistence. State is lost only when the host process itself is
// killed (device restart, plugin reinstall).

import {isAlignmentType, isAnchorBox, type AlignmentType, type Rect} from '../core/anchor';

export const ANCHOR_STORAGE_KEY = '@snalign_anchor_state';

export type AnchorState = {
  readonly alignmentType: AlignmentType;
  readonly anchorBox: Rect | null;
};

export type AnchorEnvelope = {
  readonly version: 2;
  readonly alignmentType: AlignmentType;
  readonly anchorBox: Rect | null;
};

const SCHEMA_VERSION = 2 as const;

export const DEFAULT_ANCHOR_STATE: AnchorState = {
  alignmentType: 'left',
  anchorBox: null,
};

export interface AnchorStorage {
  load(): Promise<AnchorState>;
  save(state: AnchorState): Promise<void>;
  setAlignmentType(t: AlignmentType): Promise<void>;
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
  if (!isAlignmentType(env.alignmentType)) {
    return DEFAULT_ANCHOR_STATE;
  }
  const anchorBox =
    env.anchorBox === null || env.anchorBox === undefined ? null : isAnchorBox(env.anchorBox) ? env.anchorBox : null;
  return {alignmentType: env.alignmentType, anchorBox};
};

const serialiseEnvelope = (state: AnchorState): string => {
  const env: AnchorEnvelope = {
    version: SCHEMA_VERSION,
    alignmentType: state.alignmentType,
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
  async setAlignmentType(t) {
    const current = await read();
    await write({...current, alignmentType: t});
  },
  async setAnchorBox(box) {
    const current = await read();
    await write({...current, anchorBox: box});
  },
});

export const createKvBackedAnchorStorage = (backend: KvBackend): AnchorStorage =>
  buildStorage(
    async () => {
      try {
        const raw = await backend.getItem(ANCHOR_STORAGE_KEY);
        return parseEnvelope(raw);
      } catch (e) {
        console.error('[AnchorStorage] load failed:', e);
        return DEFAULT_ANCHOR_STATE;
      }
    },
    async state => {
      try {
        await backend.setItem(ANCHOR_STORAGE_KEY, serialiseEnvelope(state));
      } catch (e) {
        console.error('[AnchorStorage] save failed:', e);
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
