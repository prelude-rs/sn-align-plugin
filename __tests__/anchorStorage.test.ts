import {
  ANCHOR_STORAGE_KEY,
  DEFAULT_ANCHOR_STATE,
  __resetDefaultAnchorStorageForTest,
  createKvBackedAnchorStorage,
  createMemoryAnchorStorage,
  getDefaultAnchorStorage,
  type AnchorState,
} from '../src/storage/anchorStorage';
import {DEFAULT_ALIGNMENT_CONFIG, type AlignmentConfig} from '../src/core/anchor';

afterEach(() => __resetDefaultAnchorStorageForTest());

const sampleConfig: AlignmentConfig = {
  anchorRef: 'top-right',
  targetRef: 'left',
  alignX: true,
  alignY: false,
  offsetX: 30,
  offsetY: 0,
};

const sampleState: AnchorState = {
  config: sampleConfig,
  anchorBox: {left: 1, top: 2, right: 3, bottom: 4},
};

const fakeKv = () => {
  const map = new Map<string, string>();
  return {
    map,
    backend: {
      getItem: jest.fn(async (key: string) => map.get(key) ?? null),
      setItem: jest.fn(async (key: string, value: string) => {
        map.set(key, value);
      }),
      removeItem: jest.fn(async (key: string) => {
        map.delete(key);
      }),
    },
  };
};

describe('memory storage', () => {
  it('first load returns DEFAULT_ANCHOR_STATE', async () => {
    const s = createMemoryAnchorStorage();
    expect(await s.load()).toEqual(DEFAULT_ANCHOR_STATE);
  });

  it('default state uses DEFAULT_ALIGNMENT_CONFIG', () => {
    expect(DEFAULT_ANCHOR_STATE.config).toBe(DEFAULT_ALIGNMENT_CONFIG);
    expect(DEFAULT_ANCHOR_STATE.anchorBox).toBe(null);
  });

  it('round-trips a saved state', async () => {
    const s = createMemoryAnchorStorage();
    await s.save(sampleState);
    expect(await s.load()).toEqual(sampleState);
  });

  it('setConfig leaves anchorBox alone', async () => {
    const s = createMemoryAnchorStorage(sampleState);
    const next: AlignmentConfig = {...sampleConfig, anchorRef: 'bottom'};
    await s.setConfig(next);
    expect(await s.load()).toEqual({config: next, anchorBox: sampleState.anchorBox});
  });

  it('setAnchorBox leaves config alone', async () => {
    const s = createMemoryAnchorStorage(sampleState);
    await s.setAnchorBox(null);
    expect(await s.load()).toEqual({config: sampleConfig, anchorBox: null});
  });
});

describe('KV-backed storage', () => {
  it('persists with the namespaced key in v3 envelope', async () => {
    const {map, backend} = fakeKv();
    const s = createKvBackedAnchorStorage(backend);
    await s.save(sampleState);
    const raw = map.get(ANCHOR_STORAGE_KEY);
    expect(raw).toBeDefined();
    const parsed = JSON.parse(raw!);
    expect(parsed.version).toBe(3);
    expect(parsed.config).toEqual(sampleConfig);
    expect(parsed.anchorBox).toEqual(sampleState.anchorBox);
  });

  it('round-trips a state via the backend', async () => {
    const {backend} = fakeKv();
    const s = createKvBackedAnchorStorage(backend);
    await s.save(sampleState);
    expect(await s.load()).toEqual(sampleState);
  });

  it('returns DEFAULT_ANCHOR_STATE on first load (no key set)', async () => {
    const {backend} = fakeKv();
    const s = createKvBackedAnchorStorage(backend);
    expect(await s.load()).toEqual(DEFAULT_ANCHOR_STATE);
  });

  it('returns DEFAULT_ANCHOR_STATE on malformed JSON', async () => {
    const {map, backend} = fakeKv();
    map.set(ANCHOR_STORAGE_KEY, 'not json{');
    const s = createKvBackedAnchorStorage(backend);
    expect(await s.load()).toEqual(DEFAULT_ANCHOR_STATE);
  });

  it('returns DEFAULT_ANCHOR_STATE on older schema versions (v1, v2)', async () => {
    const {map, backend} = fakeKv();
    map.set(ANCHOR_STORAGE_KEY, JSON.stringify({version: 2, alignmentType: 'left', anchorBox: null}));
    const s = createKvBackedAnchorStorage(backend);
    expect(await s.load()).toEqual(DEFAULT_ANCHOR_STATE);
  });

  it('coerces an invalid anchorBox to null but keeps a valid config', async () => {
    const {map, backend} = fakeKv();
    map.set(
      ANCHOR_STORAGE_KEY,
      JSON.stringify({
        version: 3,
        config: sampleConfig,
        anchorBox: {left: 1, top: 2, right: 3}, // missing bottom
      }),
    );
    const s = createKvBackedAnchorStorage(backend);
    expect(await s.load()).toEqual({config: sampleConfig, anchorBox: null});
  });

  it('rejects an invalid config, falls back to DEFAULT_ANCHOR_STATE', async () => {
    const {map, backend} = fakeKv();
    map.set(
      ANCHOR_STORAGE_KEY,
      JSON.stringify({
        version: 3,
        config: {anchorRef: 'middle', targetRef: 'left', alignX: true, alignY: true, offsetX: 0, offsetY: 0},
        anchorBox: null,
      }),
    );
    const s = createKvBackedAnchorStorage(backend);
    expect(await s.load()).toEqual(DEFAULT_ANCHOR_STATE);
  });

  it('swallows backend errors on load', async () => {
    const backend = {
      getItem: jest.fn(async () => {
        throw new Error('boom');
      }),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    };
    const s = createKvBackedAnchorStorage(backend);
    expect(await s.load()).toEqual(DEFAULT_ANCHOR_STATE);
  });

  it('swallows backend errors on save', async () => {
    const backend = {
      getItem: jest.fn(),
      setItem: jest.fn(async () => {
        throw new Error('boom');
      }),
      removeItem: jest.fn(),
    };
    const s = createKvBackedAnchorStorage(backend);
    await expect(s.save(sampleState)).resolves.toBeUndefined();
  });

  it('setConfig reads then writes (preserves anchorBox)', async () => {
    const {backend} = fakeKv();
    const s = createKvBackedAnchorStorage(backend);
    await s.save(sampleState);
    const next: AlignmentConfig = {...sampleConfig, anchorRef: 'bottom'};
    await s.setConfig(next);
    expect(await s.load()).toEqual({config: next, anchorBox: sampleState.anchorBox});
  });
});

describe('getDefaultAnchorStorage', () => {
  it('returns a usable storage even without AsyncStorage installed', async () => {
    const s = getDefaultAnchorStorage();
    expect(await s.load()).toEqual(DEFAULT_ANCHOR_STATE);
    await s.save(sampleState);
    expect(await s.load()).toEqual(sampleState);
  });

  it('memoises the result', () => {
    const a = getDefaultAnchorStorage();
    const b = getDefaultAnchorStorage();
    expect(a).toBe(b);
  });
});
