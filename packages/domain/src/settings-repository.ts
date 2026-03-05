/**
 * 设置仓储接口
 */
export interface Settings {
  theme: string
  language: string
}

export interface SettingsRepository {
  get(): Promise<Settings>
  save(settings: Settings): Promise<void>
}
