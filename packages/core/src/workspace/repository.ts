import type {
  Workspace,
  WorkspaceRef,
  WorkspaceWatchHandlers,
  WorkspaceWatchSubscription,
} from './types'

/**
 * 工作区仓储端口。
 *
 * Web 无工作区概念：current()→null、recent()→[]、不实现 watch（能力位 unsupported）。
 * Desktop 把 currentFolder/recentFolders 翻译为 Workspace，watch() 重实现文件监听。
 */
export interface WorkspaceRepository {
  current(): Promise<Workspace | null>
  recent(): Promise<Workspace[]>
  open(ref: WorkspaceRef): Promise<Workspace>
  watch?(handlers: WorkspaceWatchHandlers): Promise<WorkspaceWatchSubscription>
}
