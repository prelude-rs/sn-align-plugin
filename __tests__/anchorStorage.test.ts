import {
  DEFAULT_ANCHOR_STATE,
  __resetDefaultAnchorStorageForTest,
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
