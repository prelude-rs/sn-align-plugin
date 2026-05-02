import {setLassoMode} from '../src/buttons/lassoButtonToggle';
import {LASSO_APPLY_ALIGNMENT_BUTTON_ID, LASSO_SET_ANCHOR_BUTTON_ID} from '../src/buttons/registerLassoButton';
import type {PluginManagerLike} from '../src/buttons/buttonCommon';

const stubLogger = () => {
  const logs: string[] = [];
  return {
    logs,
    logger: {
      log: (m: string) => logs.push(`[log] ${m}`),
      warn: (m: string) => logs.push(`[warn] ${m}`),
      error: (m: string) => logs.push(`[err] ${m}`),
    },
  };
};

const stubPluginManager = (
  setButtonState = jest.fn(async (_id: number, _state: boolean) => true),
): {pm: PluginManagerLike; setButtonState: typeof setButtonState} => ({
  pm: {
    registerButton: jest.fn(async () => true),
    registerButtonListener: jest.fn(),
    setButtonState,
    getPluginDirPath: jest.fn(async () => '/plugin'),
  },
  setButtonState,
});

describe('setLassoMode', () => {
  it('disables apply, enables set when mode = set-anchor', async () => {
    const {pm, setButtonState} = stubPluginManager();
    const {logger} = stubLogger();
    await setLassoMode({pluginManager: pm, logger}, 'set-anchor');
    expect(setButtonState.mock.calls).toEqual([
      [LASSO_APPLY_ALIGNMENT_BUTTON_ID, false],
      [LASSO_SET_ANCHOR_BUTTON_ID, true],
    ]);
  });

  it('disables set, enables apply when mode = apply-alignment', async () => {
    const {pm, setButtonState} = stubPluginManager();
    const {logger} = stubLogger();
    await setLassoMode({pluginManager: pm, logger}, 'apply-alignment');
    expect(setButtonState.mock.calls).toEqual([
      [LASSO_SET_ANCHOR_BUTTON_ID, false],
      [LASSO_APPLY_ALIGNMENT_BUTTON_ID, true],
    ]);
  });

  it('disables outgoing before enabling incoming (no transient both-visible)', async () => {
    const order: Array<[number, boolean]> = [];
    const setButtonState = jest.fn(async (id: number, enable: boolean) => {
      order.push([id, enable]);
      return true;
    });
    const {pm} = stubPluginManager(setButtonState);
    const {logger} = stubLogger();
    await setLassoMode({pluginManager: pm, logger}, 'apply-alignment');
    // First call must be a `false` (disable), second a `true` (enable).
    expect(order[0]![1]).toBe(false);
    expect(order[1]![1]).toBe(true);
  });

  it('resolves silently if setButtonState throws', async () => {
    const setButtonState = jest.fn<Promise<boolean>, [number, boolean]>(async () => {
      throw new Error('boom');
    });
    const {pm} = stubPluginManager(setButtonState);
    const {logger, logs} = stubLogger();
    await expect(setLassoMode({pluginManager: pm, logger}, 'set-anchor')).resolves.toBeUndefined();
    expect(logs.some(l => l.includes('boom'))).toBe(true);
  });
});
