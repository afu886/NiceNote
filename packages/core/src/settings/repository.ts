import type { AppSettings } from './types'

/**
 * 设置仓储端口。
 *
 * Web=localStorage（含 theme storage-key、LANG key），Desktop=SQLite + localStorage 镜像，
 * 均在对应 app 的 src/runtime/ 内；core 不持有持久化细节。
 */
export interface SettingsRepository {
  load(): Promise<AppSettings>
  save(patch: Partial<AppSettings>): Promise<AppSettings>
}
