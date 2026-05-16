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

import type { NoteContent, NoteFile } from '../bindings/tauri'

/**
 * Desktop 笔记 IPC 子集端口（AppService 中与笔记相关的方法）。
 * 抽成接口以便契约测试注入内存实现，生产环境注入真实 AppService。
 */
export interface DesktopNoteApi {
  listNotes(folderPath: string): Promise<NoteFile[]>
  getNoteContent(path: string): Promise<NoteContent>
  saveNote(path: string, content: string, tags: string[]): Promise<void>
  createNote(folderPath: string): Promise<NoteFile>
  renameNote(oldPath: string, newTitle: string): Promise<NoteFile>
  deleteNote(path: string): Promise<void>
}

function toNote(c: NoteContent): Note {
  return {
    id: asNoteId(c.id),
    title: c.title,
    content: c.content,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }
}

/**
 * Tauri 文件后端 → core NoteRepository 适配器。
 *
 * 边界翻译：frontmatter id（Rust 缺失时回填）→ NoteId；path 绝不外泄进 app-dom。
 * 私有 idToPath 映射在 list/get/create 时刷新；rename 后 id 不变（Rust 保证）。
 */
export class TauriNoteRepository implements NoteRepository {
  private readonly idToPath = new Map<string, string>()

  constructor(
    private readonly api: DesktopNoteApi,
    private readonly folderPath: string
  ) {}

  private remember(id: string, path: string): void {
    this.idToPath.set(id, path)
  }

  private async resolvePath(id: NoteId): Promise<string | null> {
    const cached = this.idToPath.get(id)
    if (cached) return cached
    // 缓存未命中：刷新列表重建映射
    await this.list({})
    return this.idToPath.get(id) ?? null
  }

  async list(_query: NoteListQuery): Promise<NoteListPage> {
    const files = await this.api.listNotes(this.folderPath)
    const items = files.map((f) => {
      this.remember(f.id, f.path)
      return {
        id: asNoteId(f.id),
        title: f.title,
        summary: f.summary || null,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
      }
    })
    // Desktop 不分页：一次性返回，无下一页游标
    return { items, nextCursor: null }
  }

  async get(id: NoteId): Promise<Note | null> {
    const path = await this.resolvePath(id)
    if (!path) return null
    try {
      const content = await this.api.getNoteContent(path)
      this.remember(content.id, content.path)
      return toNote(content)
    } catch {
      return null
    }
  }

  async create(draft: NoteDraft): Promise<Note> {
    const created = await this.api.createNote(this.folderPath)
    let path = created.path
    if (draft.content !== undefined) {
      await this.api.saveNote(path, draft.content, [])
    }
    if (draft.title !== undefined && draft.title.length > 0) {
      const renamed = await this.api.renameNote(path, draft.title)
      path = renamed.path
    }
    const content = await this.api.getNoteContent(path)
    this.remember(content.id, content.path)
    return toNote(content)
  }

  async update(id: NoteId, patch: NotePatch): Promise<Note> {
    const path = await this.resolvePath(id)
    if (!path) throw new Error(`笔记不存在: ${id}`)
    let current = path
    if (patch.content !== undefined) {
      const existing = await this.api.getNoteContent(current)
      await this.api.saveNote(current, patch.content, existing.tags)
    }
    if (patch.title !== undefined) {
      const renamed = await this.api.renameNote(current, patch.title)
      current = renamed.path
    }
    const content = await this.api.getNoteContent(current)
    this.remember(content.id, content.path)
    return toNote(content)
  }

  async delete(id: NoteId): Promise<void> {
    const path = await this.resolvePath(id)
    if (!path) return
    await this.api.deleteNote(path)
    this.idToPath.delete(id)
  }
}
