import type { Language, Settings, Theme } from '@nicenote/shared'

export type { Language, Settings, Theme }

/**
 * 应用设置域。tagColors 归入 settings 域（不进笔记/标签模型）。
 * key 为标签名（与 Desktop SQLite tag_colors 表一致；Web 同样按名）。
 */
export interface AppSettings extends Settings {
  tagColors: Record<string, string>
}
