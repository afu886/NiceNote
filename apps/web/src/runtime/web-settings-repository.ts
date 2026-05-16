import type { AppSettings, Language, SettingsRepository, Theme } from '@nicenote/core'
import { LANG_STORAGE_KEY } from '@nicenote/shared'

const TAG_COLORS_KEY = 'nicenote-tag-colors'

function themeStorageKey(): string {
  if (typeof document === 'undefined') return 'nicenote-theme'
  return document.documentElement.getAttribute('data-theme-storage-key') ?? 'nicenote-theme'
}

function readTheme(): Theme {
  const saved = localStorage.getItem(themeStorageKey())
  return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system'
}

function readLanguage(): Language {
  const saved = localStorage.getItem(LANG_STORAGE_KEY)
  return saved === 'zh' || saved === 'en' ? saved : 'en'
}

function readTagColors(): Record<string, string> {
  try {
    const raw = localStorage.getItem(TAG_COLORS_KEY)
    return raw ? (JSON.parse(raw) as Record<string, string>) : {}
  } catch {
    return {}
  }
}

/** Web 设置仓储：localStorage（沿用现有 theme/lang 键，tagColors 归 settings 域）。 */
export class WebSettingsRepository implements SettingsRepository {
  async load(): Promise<AppSettings> {
    return {
      theme: readTheme(),
      language: readLanguage(),
      tagColors: readTagColors(),
    }
  }

  async save(patch: Partial<AppSettings>): Promise<AppSettings> {
    if (patch.theme !== undefined) {
      localStorage.setItem(themeStorageKey(), patch.theme)
    }
    if (patch.language !== undefined) {
      localStorage.setItem(LANG_STORAGE_KEY, patch.language)
    }
    if (patch.tagColors !== undefined) {
      localStorage.setItem(TAG_COLORS_KEY, JSON.stringify(patch.tagColors))
    }
    return this.load()
  }
}
