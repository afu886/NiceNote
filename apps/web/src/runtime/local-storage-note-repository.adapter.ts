import type {
  Note,
  NoteDraft,
  NoteId,
  NoteListPage,
  NoteListQuery,
  NotePatch,
  NoteRepository,
} from '@nicenote/core'
import { asNoteId } from '@nicenote/core'
import type { NoteSelect } from '@nicenote/shared'

import { LocalStorageNoteRepository } from '../adapters/local-storage-note-repository'

const NOTES_STORAGE_KEY = 'nicenote-notes'

/** Web NoteSelect → core 领域 Note（丢 folderId；content 归一为非空 Markdown 串） */
function toNote(n: NoteSelect): Note {
  return {
    id: asNoteId(n.id),
    title: n.title,
    content: n.content ?? '',
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
  }
}

/**
 * 把现有 LocalStorageNoteRepository（@nicenote/shared schema）薄封装为 core NoteRepository。
 * 不重写底层实现；只做边界类型翻译（string id → NoteId）。
 */
export class CoreLocalStorageNoteRepository implements NoteRepository {
  private readonly inner = new LocalStorageNoteRepository()

  async list(query: NoteListQuery): Promise<NoteListPage> {
    const limit = query.limit ?? 50
    const result = await this.inner.list({
      limit,
      ...(query.cursor ? { cursor: query.cursor.updatedAt, cursorId: query.cursor.id } : {}),
    })
    return {
      items: result.data.map((d) => ({
        id: asNoteId(d.id),
        title: d.title,
        summary: d.summary,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      })),
      nextCursor:
        result.nextCursor && result.nextCursorId
          ? { updatedAt: result.nextCursor, id: asNoteId(result.nextCursorId) }
          : null,
    }
  }

  async get(id: NoteId): Promise<Note | null> {
    const n = await this.inner.get(id)
    return n ? toNote(n) : null
  }

  async create(draft: NoteDraft): Promise<Note> {
    const n = await this.inner.create({
      ...(draft.title !== undefined ? { title: draft.title } : {}),
      ...(draft.content !== undefined ? { content: draft.content } : {}),
    })
    return toNote(n)
  }

  async update(id: NoteId, patch: NotePatch): Promise<Note> {
    const n = await this.inner.update(id, {
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.content !== undefined ? { content: patch.content } : {}),
    })
    return toNote(n)
  }

  async delete(id: NoteId): Promise<void> {
    await this.inner.delete(id)
  }
}

export function makeCoreNoteRepo(): NoteRepository {
  return new CoreLocalStorageNoteRepository()
}

export function resetWebNotes(): void {
  localStorage.removeItem(NOTES_STORAGE_KEY)
}
