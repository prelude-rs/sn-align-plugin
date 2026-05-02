import {
  __testing__,
  detectLocale,
  localizedLassoButtonName,
  localizedPluginName,
  t,
  type StringId,
} from '../src/i18n/i18n';

const ALL_IDS: StringId[] = [
  'dialog.title',
  'picker.anchorTitle',
  'picker.targetTitle',
  'ref.topLeft',
  'ref.top',
  'ref.topRight',
  'ref.right',
  'ref.bottomRight',
  'ref.bottom',
  'ref.bottomLeft',
  'ref.left',
  'ref.center',
  'axis.constrainX',
  'axis.constrainY',
  'gap.x',
  'gap.y',
  'action.save',
  'action.apply',
  'action.clear',
  'warning.outOfBounds',
  'warning.noLasso',
  'status.noAnchor',
  'status.savedAt',
  'popup.close',
];

describe('t', () => {
  it('returns the English string by default', () => {
    expect(t('dialog.title', 'en')).toBe('Alignment');
  });

  it('falls back to English for unknown locales', () => {
    expect(t('dialog.title', 'xx')).toBe('Alignment');
  });

  it('falls back to zh_TW for unknown zh variants', () => {
    expect(t('dialog.title', 'zh_HK')).toBe('對齊');
  });

  it('handles every supported locale for each id', () => {
    for (const id of ALL_IDS) {
      for (const locale of Object.keys(__testing__.STRINGS)) {
        const v = t(id, locale);
        expect(typeof v).toBe('string');
        expect(v.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('localized name helpers', () => {
  it('returns JSON-encoded {locale: name} maps for every button helper', () => {
    const button = JSON.parse(localizedLassoButtonName());
    expect(typeof button.en).toBe('string');
    expect(button.en).toBe('Alignment');

    const plugin = JSON.parse(localizedPluginName());
    expect(typeof plugin.en).toBe('string');
  });

  it('every supported locale has a name in each helper', () => {
    const locales = Object.keys(__testing__.STRINGS);
    for (const helper of [localizedLassoButtonName, localizedPluginName]) {
      const map = JSON.parse(helper());
      for (const locale of locales) {
        expect(typeof map[locale]).toBe('string');
        expect(map[locale].length).toBeGreaterThan(0);
      }
    }
  });
});

describe('normaliseLocale', () => {
  const {normaliseLocale} = __testing__;
  it('swaps BCP-47 hyphens for underscores', () => {
    expect(normaliseLocale('zh-CN')).toBe('zh_CN');
  });
  it('drops region for unknown variants', () => {
    expect(normaliseLocale('en-US')).toBe('en');
  });
  it('falls back to en for completely unknown locales', () => {
    expect(normaliseLocale('xx_YY')).toBe('en');
  });
});

describe('detectLocale', () => {
  it('returns a known locale (works in jest environment)', () => {
    const l = detectLocale();
    expect(typeof l).toBe('string');
    expect(Object.keys(__testing__.STRINGS)).toContain(l);
  });
});
