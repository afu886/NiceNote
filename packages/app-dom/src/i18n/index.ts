import { initReactI18next } from 'react-i18next'

import i18n from 'i18next'

import en from './locales/en'
import zh from './locales/zh'

let initialized = false

/**
 * 初始化 i18n，两端使用不同的 storageKey
 * - Web: 'nicenote-lang'
 * - Desktop: 'nicenote-desktop-lang'
 */
export function initI18n(options: { storageKey: string }) {
  if (initialized) return i18n

  initialized = true

  function detectLanguage(): string {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(options.storageKey)
      if (saved === 'zh' || saved === 'en') return saved
    }

    if (typeof navigator !== 'undefined') {
      const browserLang = navigator.language
      if (browserLang.startsWith('zh')) return 'zh'
    }
    return 'en'
  }

  void i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      zh: { translation: zh },
    },
    lng: detectLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  })

  return i18n
}

export default i18n
