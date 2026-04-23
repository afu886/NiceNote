import { create } from 'zustand'

import { applyLanguageToDOM, applyThemeToDOM } from '@nicenote/app-shell'
import { LANG_STORAGE_KEY, type Language, type Theme } from '@nicenote/shared'

interface SettingsStore {
  theme: Theme
  language: Language
  setTheme: (theme: Theme) => void
  setLanguage: (lang: Language) => void
}

// ============================================================
// 主题
// ============================================================

function getStorageKey(): string | null {
  if (typeof document === 'undefined') return null
  return document.documentElement.getAttribute('data-theme-storage-key')
}

function resolveInitialTheme(): Theme {
  if (typeof document === 'undefined') return 'system'
  const storageKey = getStorageKey()
  if (storageKey) {
    const saved = localStorage.getItem(storageKey)
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved
  }
  return 'system'
}

// 跟随系统主题时的媒体查询监听器
let mediaQuery: MediaQueryList | null = null
let mediaListener: ((e: MediaQueryListEvent) => void) | null = null

function setupSystemListener() {
  if (typeof window === 'undefined') return
  cleanupSystemListener()
  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaListener = () => applyThemeToDOM('system')
  mediaQuery.addEventListener('change', mediaListener)
}

function cleanupSystemListener() {
  if (mediaQuery && mediaListener) {
    mediaQuery.removeEventListener('change', mediaListener)
    mediaQuery = null
    mediaListener = null
  }
}

// ============================================================
// 语言
// ============================================================

function resolveInitialLanguage(): Language {
  if (typeof localStorage === 'undefined') return 'en'
  const saved = localStorage.getItem(LANG_STORAGE_KEY)
  if (saved === 'zh' || saved === 'en') return saved
  return 'en'
}

// ============================================================
// 初始化
// ============================================================

const initialTheme = resolveInitialTheme()
if (initialTheme === 'system' && typeof window !== 'undefined') {
  setupSystemListener()
}

// ============================================================
// Store
// ============================================================

export const useSettingsStore = create<SettingsStore>((set) => ({
  theme: initialTheme,
  language: resolveInitialLanguage(),

  setTheme: (theme: Theme) => {
    if (theme === 'system') {
      setupSystemListener()
    } else {
      cleanupSystemListener()
    }
    applyThemeToDOM(theme)

    const storageKey = getStorageKey()
    if (storageKey) {
      localStorage.setItem(storageKey, theme)
    }

    set({ theme })
  },

  setLanguage: (lang: Language) => {
    applyLanguageToDOM(lang)
    localStorage.setItem(LANG_STORAGE_KEY, lang)
    set({ language: lang })
  },
}))
