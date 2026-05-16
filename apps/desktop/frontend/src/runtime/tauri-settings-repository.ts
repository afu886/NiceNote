import type { AppSettings, Language, SettingsRepository, Theme } from '@nicenote/core'

import type { Settings } from '../bindings/tauri'

/** Desktop 设置 IPC 子集（settings + tagColors 走 SQLite） */
export interface DesktopSettingsApi {
  getSettings(): Promise<Settings>
  saveSettings(settings: Settings): Promise<void>
  getTagColors(): Promise<Record<string, string>>
  setTagColor(tag: string, color: string): Promise<void>
}

/** Desktop 设置仓储：SQLite（theme/language + tagColors 归 settings 域）。 */
export class TauriSettingsRepository implements SettingsRepository {
  private cached: Settings = { theme: 'system', language: 'zh' }

  constructor(private readonly api: DesktopSettingsApi) {}

  async load(): Promise<AppSettings> {
    const [settings, tagColors] = await Promise.all([
      this.api.getSettings(),
      this.api.getTagColors(),
    ])
    if (settings) this.cached = settings
    return {
      theme: (this.cached.theme as Theme) ?? 'system',
      language: (this.cached.language as Language) ?? 'zh',
      tagColors: tagColors ?? {},
    }
  }

  async save(patch: Partial<AppSettings>): Promise<AppSettings> {
    if (patch.theme !== undefined || patch.language !== undefined) {
      const next: Settings = {
        theme: patch.theme ?? this.cached.theme,
        language: patch.language ?? this.cached.language,
      }
      this.cached = next
      await this.api.saveSettings(next)
    }
    if (patch.tagColors !== undefined) {
      for (const [name, color] of Object.entries(patch.tagColors)) {
        await this.api.setTagColor(name, color)
      }
    }
    return this.load()
  }
}
