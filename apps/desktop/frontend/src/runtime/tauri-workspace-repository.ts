import { listen } from '@tauri-apps/api/event'

import type {
  Workspace,
  WorkspaceRef,
  WorkspaceRepository,
  WorkspaceWatchHandlers,
  WorkspaceWatchSubscription,
} from '@nicenote/core'
import { asNoteId, asWorkspaceId } from '@nicenote/core'

import type { DesktopRuntimeContext } from './desktop-runtime-context'

/** Desktop 工作区 IPC 子集 */
export interface DesktopWorkspaceApi {
  getRecentFolders(): Promise<string[]>
  addRecentFolder(path: string): Promise<void>
  watchFolder(folderPath: string): Promise<void>
}

function folderName(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).pop() ?? path
}

/**
 * Desktop 工作区仓储：folder path 即 WorkspaceId（opaque，path 不外泄）。
 * watch() 复刻原 useTauriEvents + handleFile* 语义为领域变更事件。
 */
export class TauriWorkspaceRepository implements WorkspaceRepository {
  constructor(
    private readonly api: DesktopWorkspaceApi,
    private readonly ctx: DesktopRuntimeContext
  ) {}

  async current(): Promise<Workspace | null> {
    const folder = this.ctx.currentFolder
    if (!folder) return null
    return { id: asWorkspaceId(folder), name: folderName(folder) }
  }

  async recent(): Promise<Workspace[]> {
    const paths = await this.api.getRecentFolders().catch(() => [])
    return paths.map((p) => ({ id: asWorkspaceId(p), name: folderName(p) }))
  }

  async open(ref: WorkspaceRef): Promise<Workspace> {
    const path = String(ref.id)
    this.ctx.currentFolder = path
    await Promise.allSettled([this.api.addRecentFolder(path), this.api.watchFolder(path)])
    return { id: ref.id, name: folderName(path) }
  }

  async watch(handlers: WorkspaceWatchHandlers): Promise<WorkspaceWatchSubscription> {
    // path → NoteId：已跟踪的用真实 id；新建/未跟踪用 path 作为一次性 reload 触发标识
    // （store 的 handler 仅用 id 判断是否当前选中笔记，其余只触发列表重载）
    const refOf = (path: string) => this.ctx.idOf(path) ?? asNoteId(path)
    const unlisteners = Promise.all([
      listen<{ path: string }>('file:created', (e) =>
        handlers.onNoteCreated(refOf(e.payload.path))
      ),
      listen<{ path: string }>('file:modified', (e) =>
        handlers.onNoteChanged(refOf(e.payload.path))
      ),
      listen<{ path: string }>('file:deleted', (e) => {
        const id = this.ctx.idOf(e.payload.path)
        if (id) handlers.onNoteDeleted(id)
        else handlers.onNoteChanged(asNoteId(e.payload.path))
      }),
    ])
    return {
      dispose: () => {
        void unlisteners
          .then((fns) => fns.forEach((fn) => fn()))
          .catch((err) => console.error('清理文件监听失败:', err))
      },
    }
  }
}
