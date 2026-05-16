import type { NoteRepository } from './note/repository'
import type { NoteRef } from './note/types'
import type { SearchService } from './search/service'
import type { SettingsRepository } from './settings/repository'
import type { TagRepository } from './tag/repository'
import type { WorkspaceRepository } from './workspace/repository'
import type { WorkspaceRef } from './workspace/types'
import type { SystemCapabilities } from './capabilities'
import type { KeyValueStore } from './prefs'

/**
 * 系统集成端口。
 *
 * capabilities 是唯一的平台差异表达点。optional 方法仅在对应能力 available 时由 runtime 填充；
 * UI 不靠方法存在与否分叉，只读 capabilities 渲染统一界面。
 */
export interface SystemIntegration {
  readonly capabilities: SystemCapabilities
  revealItem?(ref: NoteRef): Promise<void>
  pickWorkspaceFolder?(): Promise<WorkspaceRef | null>
  exportToFile?(name: string, markdown: string): Promise<void>
  toggleFavorite?(ref: NoteRef): Promise<void>
  listFavorites?(): Promise<readonly NoteRef[]>
  /** 导入 Markdown 文件（importExport 能力 available 时提供）。返回成功导入数量。 */
  importMarkdownFiles?(files: File[]): Promise<number>
}

/**
 * AppRuntime 只是 I/O 端口集合，不是状态。
 * NiceNoteApp 只接收 AppRuntime：<NiceNoteApp runtime={runtime} />。
 */
export interface AppRuntime {
  notes: NoteRepository
  tags: TagRepository
  workspaces: WorkspaceRepository
  settings: SettingsRepository
  search: SearchService
  system: SystemIntegration
  /** UI 偏好键值存储（侧栏宽度/开合等），由 app 注入，app-dom 不直接碰 localStorage */
  prefs: KeyValueStore
}
