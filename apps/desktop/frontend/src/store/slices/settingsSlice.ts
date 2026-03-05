import type { StateCreator } from 'zustand'

import type { Settings } from '../../bindings/tauri'
import { AppService } from '../../bindings/tauri'
import type { DesktopStore } from '../useDesktopStore'

const THEME_STORAGE_KEY = 'nicenote-desktop-theme'
const LANG_STORAGE_KEY = 'nicenote-desktop-lang'

export type CurrentView = 'all' | 'tags' | 'favorites' | 'folder-tree'

export interface SettingsSlice {
  // 视图状态
  currentView: CurrentView
  selectedTag: string | null
  sidebarOpen: boolean

  // 应用设置
  settings: Settings
  tagColors: Record<string, string>
  favorites: string[]

  // 视图操作
  setCurrentView: (view: CurrentView) => void
  setSelectedTag: (tag: string | null) => void
  toggleSidebar: () => void

  // 收藏操作
  toggleFavorite: (path: string) => Promise<void>
  loadFavorites: () => Promise<void>

  // 设置操作
  loadSettings: () => Promise<void>
  saveSettings: (settings: Partial<Settings>) => Promise<void>
  loadTagColors: () => Promise<void>
  setTagColor: (tag: string, color: string) => Promise<void>
}

export const createSettingsSlice: StateCreator<DesktopStore, [], [], SettingsSlice> = (
  set,
  get
) => ({
  currentView: 'all',
  selectedTag: null,
  sidebarOpen: true,
  settings: { theme: 'system', language: 'zh' },
  tagColors: {},
  favorites: [],

  setCurrentView: (view: CurrentView) => {
    set({ currentView: view, selectedTag: null })
  },

  setSelectedTag: (tag: string | null) => {
    set({ selectedTag: tag, currentView: 'all' })
  },

  toggleSidebar: () => {
    set((state) => ({ sidebarOpen: !state.sidebarOpen }))
  },

  toggleFavorite: async (path: string) => {
    try {
      await AppService.ToggleFavorite(path)
      await get().loadFavorites()
    } catch (err) {
      console.error('切换收藏失败:', err)
    }
  },

  loadFavorites: async () => {
    try {
      const favorites = await AppService.GetFavorites()
      set({ favorites })
    } catch (err) {
      console.error('加载收藏失败:', err)
    }
  },

  loadSettings: async () => {
    try {
      const settings = await AppService.GetSettings()
      if (!settings) return
      set({ settings })
      applyTheme(settings.theme)
      localStorage.setItem(THEME_STORAGE_KEY, settings.theme)
      localStorage.setItem(LANG_STORAGE_KEY, settings.language)
    } catch (err) {
      console.error('加载设置失败:', err)
    }
  },

  saveSettings: async (patch: Partial<Settings>) => {
    const current = get().settings
    const updated: Settings = { ...current, ...patch }
    set({ settings: updated })
    if (patch.theme) {
      applyTheme(patch.theme)
      localStorage.setItem(THEME_STORAGE_KEY, patch.theme)
    }
    if (patch.language) {
      localStorage.setItem(LANG_STORAGE_KEY, patch.language)
      document.documentElement.lang = patch.language
    }
    try {
      await AppService.SaveSettings(updated)
    } catch (err) {
      console.error('保存设置失败:', err)
    }
  },

  loadTagColors: async () => {
    try {
      const tagColors = await AppService.GetTagColors()
      set({ tagColors })
    } catch (err) {
      console.error('加载标签颜色失败:', err)
    }
  },

  setTagColor: async (tag: string, color: string) => {
    set((state) => ({ tagColors: { ...state.tagColors, [tag]: color } }))
    try {
      await AppService.SetTagColor(tag, color)
    } catch (err) {
      console.error('设置标签颜色失败:', err)
    }
  },
})

// 工具函数：应用主题到 DOM
function applyTheme(theme: Settings['theme']) {
  const root = document.documentElement
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.toggle('dark', prefersDark)
    root.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
  } else {
    root.classList.toggle('dark', theme === 'dark')
    root.setAttribute('data-theme', theme)
  }
}
