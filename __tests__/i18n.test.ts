import {
  __testing__,
  detectLocale,
  localizedSetAlignmentName,
  localizedSetAnchorName,
  localizedApplyAlignmentName,
  localizedPluginName,
  t,
} from '../src/i18n/i18n';

describe('t', () => {
  it('returns the English string by default', () => {
    expect(t('dialog.title', 'en')).toBe('Set Alignment');
  });

  it('falls back to English for unknown locales', () => {
    expect(t('dialog.title', 'xx')).toBe('Set Alignment');
  });

  it('falls back to zh_TW for unknown zh variants', () => {
    expect(t('dialog.title', 'zh_HK')).toBe('設定對齊');
  });

  it('handles every supported locale for each id', () => {
    const ids: Array<keyof (typeof __testing__.STRINGS)['en']> = [
      'dialog.title',
      'mark.topLeft',
      'mark.top',
      'mark.topRight',
      'mark.right',
      'mark.bottomRight',
      'mark.bottom',
      'mark.bottomLeft',
      'mark.left',
      'mark.clear',
      'mark.savedAt',
      'mark.noneYet',
      'popup.close',
    ];
    for (const id of ids) {
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
    const set = JSON.parse(localizedSetAlignmentName());
    expect(typeof set.en).toBe('string');
    expect(typeof set.zh_CN).toBe('string');

    const anchor = JSON.parse(localizedSetAnchorName());
    expect(typeof anchor.en).toBe('string');
    expect(anchor.en).toBe('Set Anchor');

    const apply = JSON.parse(localizedApplyAlignmentName());
    expect(typeof apply.en).toBe('string');
    expect(apply.en).toBe('Apply Alignment');

    const plugin = JSON.parse(localizedPluginName());
    expect(typeof plugin.en).toBe('string');
  });

  it('every supported locale has a name in each button helper', () => {
    const locales = Object.keys(__testing__.STRINGS);
    for (const helper of [
      localizedSetAlignmentName,
      localizedSetAnchorName,
      localizedApplyAlignmentName,
      localizedPluginName,
    ]) {
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
