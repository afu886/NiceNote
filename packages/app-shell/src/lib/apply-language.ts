import type { Language } from '@nicenote/shared'

import i18n from '../i18n'

/**
 * 将语言设置应用到 DOM 和 i18n（平台无关）
 *
 * 更新 i18n 语言和 document.documentElement.lang 属性。
 */
export function applyLanguageToDOM(lang: Language) {
  void i18n.changeLanguage(lang)
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang
  }
}
