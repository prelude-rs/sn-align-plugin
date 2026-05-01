import {
  ANCHOR_STORAGE_KEY,
  DEFAULT_ANCHOR_STATE,
  __resetDefaultAnchorStorageForTest,
  createKvBackedAnchorStorage,
  createMemoryAnchorStorage,
  getDefaultAnchorStorage,
  type AnchorState,
} from '../src/storage/anchorStorage';

afterEach(() => __resetDefaultAnchorStorageForTest());

const sampleState: AnchorState = {
  alignmentType: 'top-right',
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

  it('round-trips a saved state', async () => {
    const s = createMemoryAnchorStorage();
    await s.save(sampleState);
    expect(await s.load()).toEqual(sampleState);
  });

  it('setAlignmentType leaves anchorBox alone', async () => {
    const s = createMemoryAnchorStorage(sampleState);
    await s.setAlignmentType('bottom');
    expect(await s.load()).toEqual({
      alignmentType: 'bottom',
      anchorBox: sampleState.anchorBox,
    });
  });

  it('setAnchorBox leaves alignmentType alone', async () => {
    const s = createMemoryAnchorStorage(sampleState);
    await s.setAnchorBox(null);
    expect(await s.load()).toEqual({
      alignmentType: sampleState.alignmentType,
      anchorBox: null,
    });
  });
});

describe('KV-backed storage', () => {
  it('persists with the namespaced key in v2 envelope', async () => {
    const {map, backend} = fakeKv();
    const s = createKvBackedAnchorStorage(backend);
    await s.save(sampleState);
    const raw = map.get(ANCHOR_STORAGE_KEY);
    expect(raw).toBeDefined();
    const parsed = JSON.parse(raw!);
    expect(parsed.version).toBe(2);
    expect(parsed.alignmentType).toBe('top-right');
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

  it('returns DEFAULT_ANCHOR_STATE on wrong schema version', async () => {
    const {map, backend} = fakeKv();
    map.set(
      ANCHOR_STORAGE_KEY,
      JSON.stringify({version: 1, mark: {alignmentType: 'top-left', x: 1, y: 2}}),
    );
    const s = createKvBackedAnchorStorage(backend);
    expect(await s.load()).toEqual(DEFAULT_ANCHOR_STATE);
  });

  it('coerces an invalid anchorBox to null but keeps a valid alignmentType', async () => {
    const {map, backend} = fakeKv();
    map.set(
      ANCHOR_STORAGE_KEY,
      JSON.stringify({
        version: 2,
        alignmentType: 'right',
        anchorBox: {left: 1, top: 2, right: 3}, // missing bottom
      }),
    );
    const s = createKvBackedAnchorStorage(backend);
    expect(await s.load()).toEqual({alignmentType: 'right', anchorBox: null});
  });

  it('rejects unknown alignmentType, falls back to DEFAULT_ANCHOR_STATE', async () => {
    const {map, backend} = fakeKv();
    map.set(
      ANCHOR_STORAGE_KEY,
      JSON.stringify({version: 2, alignmentType: 'middle', anchorBox: null}),
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

  it('setAlignmentType reads then writes (preserves anchorBox)', async () => {
    const {backend} = fakeKv();
    const s = createKvBackedAnchorStorage(backend);
    await s.save(sampleState);
    await s.setAlignmentType('bottom');
    expect(await s.load()).toEqual({
      alignmentType: 'bottom',
      anchorBox: sampleState.anchorBox,
    });
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
