// Localised UI chrome for the alignment popup + the firmware-visible
// button name. Two locale-bag shapes:
//   - STRINGS (StringId → string): used by the React UI via `t(id)`
//   - LASSO_BUTTON_NAME / PLUGIN_NAME maps: serialised as
//     JSON-encoded {locale: name} for the firmware to render.

export type StringId =
  | 'dialog.title'
  | 'picker.anchorTitle'
  | 'picker.targetTitle'
  | 'ref.topLeft'
  | 'ref.top'
  | 'ref.topRight'
  | 'ref.right'
  | 'ref.bottomRight'
  | 'ref.bottom'
  | 'ref.bottomLeft'
  | 'ref.left'
  | 'ref.center'
  | 'axis.alignX'
  | 'axis.alignY'
  | 'offset.x'
  | 'offset.y'
  | 'action.setAnchor'
  | 'action.setNewAnchor'
  | 'action.apply'
  | 'action.applyAndReAnchor'
  | 'warning.outOfBounds'
  | 'warning.noLasso'
  | 'warning.noAxis'
  | 'anchor.notSet'
  | 'anchor.saved'
  | 'popup.close';

const STRINGS: Record<string, Partial<Record<StringId, string>>> = {
  en: {
    'dialog.title': 'Alignment',
    'picker.anchorTitle': 'Anchor',
    'picker.targetTitle': 'Target',
    'ref.topLeft': 'Top-left',
    'ref.top': 'Top',
    'ref.topRight': 'Top-right',
    'ref.right': 'Right',
    'ref.bottomRight': 'Bottom-right',
    'ref.bottom': 'Bottom',
    'ref.bottomLeft': 'Bottom-left',
    'ref.left': 'Left',
    'ref.center': 'Center',
    'axis.alignX': 'Align X',
    'axis.alignY': 'Align Y',
    'offset.x': 'Offset X',
    'offset.y': 'Offset Y',
    'action.setAnchor': 'Set Anchor',
    'action.setNewAnchor': 'Set New Anchor',
    'action.apply': 'Apply Alignment',
    'action.applyAndReAnchor': 'Apply & Re-anchor',
    'warning.outOfBounds': 'Target would extend beyond the page',
    'warning.noLasso': 'Draw a lasso selection first',
    'warning.noAxis': 'Select at least one axis to align',
    'anchor.notSet': 'Anchor: not set',
    'anchor.saved': 'Anchor: saved',
    'popup.close': 'Close',
  },
  zh_CN: {
    'dialog.title': '对齐',
    'picker.anchorTitle': '锚点',
    'picker.targetTitle': '目标',
    'ref.topLeft': '左上',
    'ref.top': '上',
    'ref.topRight': '右上',
    'ref.right': '右',
    'ref.bottomRight': '右下',
    'ref.bottom': '下',
    'ref.bottomLeft': '左下',
    'ref.left': '左',
    'ref.center': '中心',
    'axis.alignX': '对齐 X',
    'axis.alignY': '对齐 Y',
    'offset.x': '偏移 X',
    'offset.y': '偏移 Y',
    'action.setAnchor': '设置锚点',
    'action.setNewAnchor': '更新锚点',
    'action.apply': '应用对齐',
    'action.applyAndReAnchor': '应用并更新锚点',
    'warning.outOfBounds': '目标将超出页面范围',
    'warning.noLasso': '请先框选内容',
    'warning.noAxis': '至少选择一个对齐轴',
    'anchor.notSet': '锚点：未设置',
    'anchor.saved': '锚点：已保存',
    'popup.close': '关闭',
  },
  zh_TW: {
    'dialog.title': '對齊',
    'picker.anchorTitle': '錨點',
    'picker.targetTitle': '目標',
    'ref.topLeft': '左上',
    'ref.top': '上',
    'ref.topRight': '右上',
    'ref.right': '右',
    'ref.bottomRight': '右下',
    'ref.bottom': '下',
    'ref.bottomLeft': '左下',
    'ref.left': '左',
    'ref.center': '中心',
    'axis.alignX': '對齊 X',
    'axis.alignY': '對齊 Y',
    'offset.x': '偏移 X',
    'offset.y': '偏移 Y',
    'action.setAnchor': '設定錨點',
    'action.setNewAnchor': '更新錨點',
    'action.apply': '套用對齊',
    'action.applyAndReAnchor': '套用並更新錨點',
    'warning.outOfBounds': '目標將超出頁面範圍',
    'warning.noLasso': '請先框選內容',
    'warning.noAxis': '至少選擇一個對齊軸',
    'anchor.notSet': '錨點：未設定',
    'anchor.saved': '錨點：已儲存',
    'popup.close': '關閉',
  },
  ja: {
    'dialog.title': '揃え',
    'picker.anchorTitle': 'アンカー',
    'picker.targetTitle': 'ターゲット',
    'ref.topLeft': '左上',
    'ref.top': '上',
    'ref.topRight': '右上',
    'ref.right': '右',
    'ref.bottomRight': '右下',
    'ref.bottom': '下',
    'ref.bottomLeft': '左下',
    'ref.left': '左',
    'ref.center': '中央',
    'axis.alignX': 'X 軸を揃える',
    'axis.alignY': 'Y 軸を揃える',
    'offset.x': 'オフセット X',
    'offset.y': 'オフセット Y',
    'action.setAnchor': 'アンカー設定',
    'action.setNewAnchor': 'アンカー更新',
    'action.apply': '揃えを適用',
    'action.applyAndReAnchor': '適用してアンカー更新',
    'warning.outOfBounds': 'ページの範囲を超えます',
    'warning.noLasso': '先に投げ縄選択してください',
    'warning.noAxis': '少なくとも1軸を選択してください',
    'anchor.notSet': 'アンカー：未設定',
    'anchor.saved': 'アンカー：保存済み',
    'popup.close': '閉じる',
  },
  th: {
    'dialog.title': 'การจัดตำแหน่ง',
    'picker.anchorTitle': 'จุดยึด',
    'picker.targetTitle': 'เป้าหมาย',
    'ref.topLeft': 'บนซ้าย',
    'ref.top': 'บน',
    'ref.topRight': 'บนขวา',
    'ref.right': 'ขวา',
    'ref.bottomRight': 'ล่างขวา',
    'ref.bottom': 'ล่าง',
    'ref.bottomLeft': 'ล่างซ้าย',
    'ref.left': 'ซ้าย',
    'ref.center': 'กลาง',
    'axis.alignX': 'จัดแกน X',
    'axis.alignY': 'จัดแกน Y',
    'offset.x': 'ออฟเซ็ต X',
    'offset.y': 'ออฟเซ็ต Y',
    'action.setAnchor': 'ตั้งจุดยึด',
    'action.setNewAnchor': 'ตั้งจุดยึดใหม่',
    'action.apply': 'ใช้การจัดตำแหน่ง',
    'action.applyAndReAnchor': 'ใช้และตั้งจุดยึดใหม่',
    'warning.outOfBounds': 'เป้าหมายจะอยู่นอกหน้ากระดาษ',
    'warning.noLasso': 'กรุณาเลือกพื้นที่ก่อน',
    'warning.noAxis': 'เลือกอย่างน้อยหนึ่งแกน',
    'anchor.notSet': 'จุดยึด: ยังไม่ตั้ง',
    'anchor.saved': 'จุดยึด: บันทึกแล้ว',
    'popup.close': 'ปิด',
  },
  nl: {
    'dialog.title': 'Uitlijning',
    'picker.anchorTitle': 'Anker',
    'picker.targetTitle': 'Doel',
    'ref.topLeft': 'Linksboven',
    'ref.top': 'Boven',
    'ref.topRight': 'Rechtsboven',
    'ref.right': 'Rechts',
    'ref.bottomRight': 'Rechtsonder',
    'ref.bottom': 'Onder',
    'ref.bottomLeft': 'Linksonder',
    'ref.left': 'Links',
    'ref.center': 'Midden',
    'axis.alignX': 'X uitlijnen',
    'axis.alignY': 'Y uitlijnen',
    'offset.x': 'Verschuiving X',
    'offset.y': 'Verschuiving Y',
    'action.setAnchor': 'Anker instellen',
    'action.setNewAnchor': 'Nieuw anker',
    'action.apply': 'Uitlijning toepassen',
    'action.applyAndReAnchor': 'Toepassen & nieuw anker',
    'warning.outOfBounds': 'Doel valt buiten de pagina',
    'warning.noLasso': 'Maak eerst een lasso-selectie',
    'warning.noAxis': 'Selecteer ten minste één as',
    'anchor.notSet': 'Anker: niet ingesteld',
    'anchor.saved': 'Anker: opgeslagen',
    'popup.close': 'Sluiten',
  },
  de: {
    'dialog.title': 'Ausrichtung',
    'picker.anchorTitle': 'Anker',
    'picker.targetTitle': 'Ziel',
    'ref.topLeft': 'Oben links',
    'ref.top': 'Oben',
    'ref.topRight': 'Oben rechts',
    'ref.right': 'Rechts',
    'ref.bottomRight': 'Unten rechts',
    'ref.bottom': 'Unten',
    'ref.bottomLeft': 'Unten links',
    'ref.left': 'Links',
    'ref.center': 'Mitte',
    'axis.alignX': 'X ausrichten',
    'axis.alignY': 'Y ausrichten',
    'offset.x': 'Versatz X',
    'offset.y': 'Versatz Y',
    'action.setAnchor': 'Anker setzen',
    'action.setNewAnchor': 'Anker neu setzen',
    'action.apply': 'Ausrichtung anwenden',
    'action.applyAndReAnchor': 'Anwenden & neu verankern',
    'warning.outOfBounds': 'Ziel würde über die Seite hinausragen',
    'warning.noLasso': 'Erst eine Lasso-Auswahl zeichnen',
    'warning.noAxis': 'Mindestens eine Achse auswählen',
    'anchor.notSet': 'Anker: nicht gesetzt',
    'anchor.saved': 'Anker: gespeichert',
    'popup.close': 'Schließen',
  },
};

const LASSO_BUTTON_NAME: Record<string, string> = {
  en: 'Alignment',
  zh_CN: '对齐',
  zh_TW: '對齊',
  ja: '揃え',
  th: 'การจัดตำแหน่ง',
  nl: 'Uitlijning',
  de: 'Ausrichtung',
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

export const localizedLassoButtonName = (): string => JSON.stringify(LASSO_BUTTON_NAME);
export const localizedPluginName = (): string => JSON.stringify(PLUGIN_NAME);

export const __testing__ = {
  STRINGS,
  LASSO_BUTTON_NAME,
  PLUGIN_NAME,
  normaliseLocale,
};
