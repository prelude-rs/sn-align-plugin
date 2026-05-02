// Localised UI chrome (toolbar button names + popup labels).
// Two toolbar buttons live in different toolbars:
//   - Page toolbar  → "Set Alignment" (opens picker popup)
//   - Lasso toolbar → "Set Anchor" (no anchor) / "Apply Alignment" (anchored)
// The popup just needs the dialog title, the close button label, and
// the anchor labels (used for accessibility on the icon-only cells
// and shown in the status line).

export type StringId =
  | 'dialog.title'
  | 'mark.topLeft'
  | 'mark.top'
  | 'mark.topRight'
  | 'mark.right'
  | 'mark.bottomRight'
  | 'mark.bottom'
  | 'mark.bottomLeft'
  | 'mark.left'
  | 'mark.clear'
  | 'mark.savedAt'
  | 'mark.noneYet'
  | 'popup.close';

const STRINGS: Record<string, Partial<Record<StringId, string>>> = {
  en: {
    'dialog.title': 'Set Alignment',
    'mark.topLeft': 'Top-left',
    'mark.top': 'Top',
    'mark.topRight': 'Top-right',
    'mark.right': 'Right',
    'mark.bottomRight': 'Bottom-right',
    'mark.bottom': 'Bottom',
    'mark.bottomLeft': 'Bottom-left',
    'mark.left': 'Left',
    'mark.clear': 'Clear Anchor',
    'mark.savedAt': 'Anchored',
    'mark.noneYet': 'No anchor saved yet',
    'popup.close': 'Close',
  },
  zh_CN: {
    'dialog.title': '设置对齐',
    'mark.topLeft': '左上',
    'mark.top': '上',
    'mark.topRight': '右上',
    'mark.right': '右',
    'mark.bottomRight': '右下',
    'mark.bottom': '下',
    'mark.bottomLeft': '左下',
    'mark.left': '左',
    'mark.clear': '清除锚点',
    'mark.savedAt': '已锚定',
    'mark.noneYet': '尚未保存锚点',
    'popup.close': '关闭',
  },
  zh_TW: {
    'dialog.title': '設定對齊',
    'mark.topLeft': '左上',
    'mark.top': '上',
    'mark.topRight': '右上',
    'mark.right': '右',
    'mark.bottomRight': '右下',
    'mark.bottom': '下',
    'mark.bottomLeft': '左下',
    'mark.left': '左',
    'mark.clear': '清除錨點',
    'mark.savedAt': '已錨定',
    'mark.noneYet': '尚未儲存錨點',
    'popup.close': '關閉',
  },
  ja: {
    'dialog.title': '揃えを設定',
    'mark.topLeft': '左上',
    'mark.top': '上',
    'mark.topRight': '右上',
    'mark.right': '右',
    'mark.bottomRight': '右下',
    'mark.bottom': '下',
    'mark.bottomLeft': '左下',
    'mark.left': '左',
    'mark.clear': 'アンカーを消去',
    'mark.savedAt': '記録済',
    'mark.noneYet': 'アンカー未保存',
    'popup.close': '閉じる',
  },
  th: {
    'dialog.title': 'ตั้งการจัดตำแหน่ง',
    'mark.topLeft': 'บนซ้าย',
    'mark.top': 'บน',
    'mark.topRight': 'บนขวา',
    'mark.right': 'ขวา',
    'mark.bottomRight': 'ล่างขวา',
    'mark.bottom': 'ล่าง',
    'mark.bottomLeft': 'ล่างซ้าย',
    'mark.left': 'ซ้าย',
    'mark.clear': 'ล้างจุดยึด',
    'mark.savedAt': 'บันทึกแล้ว',
    'mark.noneYet': 'ยังไม่ได้บันทึกจุดยึด',
    'popup.close': 'ปิด',
  },
  nl: {
    'dialog.title': 'Uitlijning instellen',
    'mark.topLeft': 'Linksboven',
    'mark.top': 'Boven',
    'mark.topRight': 'Rechtsboven',
    'mark.right': 'Rechts',
    'mark.bottomRight': 'Rechtsonder',
    'mark.bottom': 'Onder',
    'mark.bottomLeft': 'Linksonder',
    'mark.left': 'Links',
    'mark.clear': 'Anker wissen',
    'mark.savedAt': 'Verankerd',
    'mark.noneYet': 'Nog geen anker ingesteld',
    'popup.close': 'Sluiten',
  },
  de: {
    'dialog.title': 'Ausrichtung setzen',
    'mark.topLeft': 'Oben links',
    'mark.top': 'Oben',
    'mark.topRight': 'Oben rechts',
    'mark.right': 'Rechts',
    'mark.bottomRight': 'Unten rechts',
    'mark.bottom': 'Unten',
    'mark.bottomLeft': 'Unten links',
    'mark.left': 'Links',
    'mark.clear': 'Anker löschen',
    'mark.savedAt': 'Verankert',
    'mark.noneYet': 'Kein Anker gespeichert',
    'popup.close': 'Schließen',
  },
};

const PAGE_SET_ALIGNMENT_NAME: Record<string, string> = {
  en: 'Set Alignment',
  zh_CN: '设置对齐',
  zh_TW: '設定對齊',
  ja: '揃えを設定',
  th: 'ตั้งการจัดตำแหน่ง',
  nl: 'Uitlijning instellen',
  de: 'Ausrichtung setzen',
};

const LASSO_SET_ANCHOR_NAME: Record<string, string> = {
  en: 'Set Anchor',
  zh_CN: '设置锚点',
  zh_TW: '設定錨點',
  ja: 'アンカーを設定',
  th: 'ตั้งจุดยึด',
  nl: 'Anker instellen',
  de: 'Anker setzen',
};

const LASSO_APPLY_ALIGNMENT_NAME: Record<string, string> = {
  en: 'Apply Alignment',
  zh_CN: '应用对齐',
  zh_TW: '套用對齊',
  ja: '揃えを適用',
  th: 'ใช้การจัดตำแหน่ง',
  nl: 'Uitlijning toepassen',
  de: 'Ausrichtung anwenden',
};

const PLUGIN_NAME: Record<string, string> = {
  en: 'Align',
  zh_CN: '对齐',
  zh_TW: '對齊',
  ja: '揃える',
  th: 'จัดตำแหน่ง',
  nl: 'Uitlijnen',
  de: 'Ausrichten',
};

const FALLBACK_LOCALE = 'en';

const normaliseLocale = (raw: string): string => {
  const swap = raw.replace('-', '_');
  if (STRINGS[swap]) {
    return swap;
  }
  const lang = swap.split('_')[0] ?? FALLBACK_LOCALE;
  if (STRINGS[lang]) {
    return lang;
  }
  if (swap.startsWith('zh') && STRINGS.zh_TW) {
    return 'zh_TW';
  }
  return FALLBACK_LOCALE;
};

export const detectLocale = (): string => {
  try {
    if (typeof Intl !== 'undefined' && Intl.Collator) {
      const resolved = new Intl.Collator().resolvedOptions().locale;
      if (resolved) {
        return normaliseLocale(resolved);
      }
    }
  } catch {
    // fall through
  }
  return FALLBACK_LOCALE;
};

const LOCALE = detectLocale();

export const t = (id: StringId, locale: string = LOCALE): string => {
  const resolved = normaliseLocale(locale);
  return STRINGS[resolved]?.[id] ?? STRINGS[FALLBACK_LOCALE]?.[id] ?? String(id);
};

export const localizedSetAlignmentName = (): string => JSON.stringify(PAGE_SET_ALIGNMENT_NAME);
export const localizedSetAnchorName = (): string => JSON.stringify(LASSO_SET_ANCHOR_NAME);
export const localizedApplyAlignmentName = (): string => JSON.stringify(LASSO_APPLY_ALIGNMENT_NAME);
export const localizedPluginName = (): string => JSON.stringify(PLUGIN_NAME);

export const __testing__ = {
  STRINGS,
  PAGE_SET_ALIGNMENT_NAME,
  LASSO_SET_ANCHOR_NAME,
  LASSO_APPLY_ALIGNMENT_NAME,
  PLUGIN_NAME,
  normaliseLocale,
};
