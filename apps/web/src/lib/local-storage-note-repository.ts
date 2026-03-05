import type { NoteRepository } from '@nicenote/domain'
import type {
  NoteCreateInput,
  NoteListQuery,
  NoteListResult,
  NoteSearchQuery,
  NoteSearchResult,
  NoteSelect,
  NoteUpdateInput,
} from '@nicenote/shared'
import { generateSummary } from '@nicenote/shared'

const STORAGE_KEY = 'nicenote-notes'

function loadAll(): NoteSelect[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as NoteSelect[]) : []
  } catch {
    return []
  }
}

function saveAll(notes: NoteSelect[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
}

/**
 * 基于 localStorage 的 NoteRepository 实现（Web 端）
 */
export class LocalStorageNoteRepository implements NoteRepository {
  async list(query: NoteListQuery): Promise<NoteListResult> {
    let notes = loadAll()

    if (query.folderId) {
      notes = notes.filter((n) => n.folderId === query.folderId)
    }

    // 按更新时间倒序
    notes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

    // 游标分页
    if (query.cursor && query.cursorId) {
      const idx = notes.findIndex((n) => n.updatedAt <= query.cursor! && n.id !== query.cursorId)
      if (idx > 0) notes = notes.slice(idx)
    }

    const limit = query.limit ?? 50
    const page = notes.slice(0, limit + 1)
    const hasNext = page.length > limit
    const data = page.slice(0, limit).map((n) => ({
      id: n.id,
      title: n.title,
      summary: generateSummary(n.content ?? '') || null,
      folderId: n.folderId,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
    }))

    const last = data[data.length - 1]
    return {
      data,
      nextCursor: hasNext && last ? last.updatedAt : null,
      nextCursorId: hasNext && last ? last.id : null,
    }
  }

  async get(id: string): Promise<NoteSelect | null> {
    return loadAll().find((n) => n.id === id) ?? null
  }

  async create(input: NoteCreateInput): Promise<NoteSelect> {
    const now = new Date().toISOString()
    const note: NoteSelect = {
      id: crypto.randomUUID(),
      title: input.title ?? '',
      content: input.content ?? null,
      folderId: input.folderId ?? null,
      createdAt: now,
      updatedAt: now,
    }
    const notes = [note, ...loadAll()]
    saveAll(notes)
    return note
  }

  async update(id: string, input: NoteUpdateInput): Promise<NoteSelect> {
    const notes = loadAll()
    const idx = notes.findIndex((n) => n.id === id)
    if (idx === -1) throw new Error(`笔记不存在: ${id}`)

    const existing = notes[idx]!
    const updated: NoteSelect = {
      id: existing.id,
      title: input.title ?? existing.title,
      content: input.content !== undefined ? input.content : existing.content,
      folderId: input.folderId !== undefined ? input.folderId : existing.folderId,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    }
    notes[idx] = updated
    notes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    saveAll(notes)
    return updated
  }

  async delete(id: string): Promise<void> {
    const notes = loadAll().filter((n) => n.id !== id)
    saveAll(notes)
  }

  async search(query: NoteSearchQuery): Promise<NoteSearchResult[]> {
    const q = query.q.toLowerCase()
    const limit = query.limit ?? 20
    const notes = loadAll()
    const results: NoteSearchResult[] = []

    for (const note of notes) {
      if (results.length >= limit) break

      const content = note.content ?? ''
      const titleMatch = note.title.toLowerCase().includes(q)
      const contentIdx = content.toLowerCase().indexOf(q)

      if (!titleMatch && contentIdx === -1) continue

      // 提取纯文本摘要片段
      let snippet = ''
      if (contentIdx !== -1) {
        const start = Math.max(0, contentIdx - 40)
        const end = Math.min(content.length, contentIdx + q.length + 60)
        const raw = content.slice(start, end)
        snippet = (start > 0 ? '…' : '') + raw + (end < content.length ? '…' : '')
      }

      results.push({
        id: note.id,
        title: note.title,
        summary: generateSummary(content) || null,
        folderId: note.folderId,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        snippet,
      })
    }

    return results
  }
}
