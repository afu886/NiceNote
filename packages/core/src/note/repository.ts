import type { Note, NoteDraft, NoteId, NotePatch, NoteSummary } from './types'

/** 游标分页游标。品牌 id 内含，path 永不泄漏。 */
export interface NoteListCursor {
  updatedAt: string
  id: NoteId
}

export interface NoteListQuery {
  limit?: number
  cursor?: NoteListCursor | null
}

export interface NoteListPage {
  items: NoteSummary[]
  nextCursor: NoteListCursor | null
}

/**
 * 笔记仓储端口。
 *
 * Web=localStorage 实现，Desktop=Tauri 文件实现，均在对应 app 的 src/runtime/ 内。
 * core 不提供实现。所有方法只收发 NoteId，绝不暴露 path。
 */
export interface NoteRepository {
  list(query: NoteListQuery): Promise<NoteListPage>
  get(id: NoteId): Promise<Note | null>
  create(draft: NoteDraft): Promise<Note>
  update(id: NoteId, patch: NotePatch): Promise<Note>
  delete(id: NoteId): Promise<void>
}
