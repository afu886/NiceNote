import type { Brand } from '../brand'
import type { NoteId } from '../note/types'

/** 工作区稳定标识。Desktop 文件夹 path 在边界翻译为 WorkspaceId，path 不外泄。 */
export type WorkspaceId = Brand<string, 'WorkspaceId'>

export function asWorkspaceId(raw: string): WorkspaceId {
  if (raw.length === 0) {
    throw new Error('WorkspaceId 必须是非空字符串')
  }
  return raw as WorkspaceId
}

export interface Workspace {
  id: WorkspaceId
  name: string
}

export interface WorkspaceRef {
  readonly id: WorkspaceId
}

/** 文件监听归一为领域变更事件（path → NoteId 已在 runtime 边界翻译）。 */
export interface WorkspaceWatchHandlers {
  onNoteCreated(id: NoteId): void
  onNoteChanged(id: NoteId): void
  onNoteDeleted(id: NoteId): void
}

export interface WorkspaceWatchSubscription {
  dispose(): void
}
