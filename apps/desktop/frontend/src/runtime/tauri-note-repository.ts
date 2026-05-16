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

import type { NoteContent } from '../bindings/tauri'

import { DebouncedWriter, type DesktopRuntimeContext } from './desktop-runtime-context'
import type { DesktopNoteApi } from './tauri-note-repository.adapter'

const SAVE_DEBOUNCE_MS = 800
const RENAME_DEBOUNCE_MS = 1500

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
 * Tauri 文件后端 → core NoteRepository（生产实现）。
 *
 * 保留原 useDesktopStore 的关键语义：800ms 防抖保存、1500ms 防抖重命名、
 * 切换笔记前 flush 防止丢数据（get() 先 flush）。path↔NoteId 在边界翻译。
 */
export class TauriNoteRepository implements NoteRepository {
  private readonly saver = new DebouncedWriter(SAVE_DEBOUNCE_MS)
  private readonly renamer = new DebouncedWriter(RENAME_DEBOUNCE_MS)

  constructor(
    private readonly api: DesktopNoteApi,
    private readonly ctx: DesktopRuntimeContext
  ) {}

  /** 切换/读取前 flush 待写，防止防抖期间丢失编辑（等价原 openNote 行为） */
  async flushPending(): Promise<void> {
    await this.renamer.flush()
    await this.saver.flush()
  }

  async list(_query: NoteListQuery): Promise<NoteListPage> {
    const folder = this.ctx.currentFolder
    if (!folder) return { items: [], nextCursor: null }
    const files = await this.api.listNotes(folder)
    files.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    const items = files.map((f) => {
      this.ctx.remember(f)
      return {
        id: asNoteId(f.id),
        title: f.title,
        summary: f.summary || null,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
      }
    })
    return { items, nextCursor: null }
  }

  async get(id: NoteId): Promise<Note | null> {
    await this.flushPending()
    const path = this.ctx.pathOf(id)
    if (!path) return null
    try {
      const content = await this.api.getNoteContent(path)
      this.ctx.remember(content)
      return toNote(content)
    } catch {
      return null
    }
  }

  async create(draft: NoteDraft): Promise<Note> {
    const folder = this.ctx.currentFolder
    if (!folder) throw new Error('未打开工作区')
    const created = await this.api.createNote(folder)
    this.ctx.remember(created)
    let path = created.path
    if (draft.content !== undefined) {
      await this.api.saveNote(path, draft.content, [])
    }
    if (draft.title !== undefined && draft.title.length > 0) {
      const renamed = await this.api.renameNote(path, draft.title)
      this.ctx.forgetPath(path)
      this.ctx.remember(renamed)
      path = renamed.path
    }
    const content = await this.api.getNoteContent(path)
    this.ctx.remember(content)
    return toNote(content)
  }

  async update(id: NoteId, patch: NotePatch): Promise<Note> {
    const path = this.ctx.pathOf(id)
    if (!path) throw new Error(`笔记不存在: ${id}`)
    const ops: Array<Promise<void>> = []

    if (patch.content !== undefined) {
      const content = patch.content
      ops.push(
        this.saver.schedule(async () => {
          const target = this.ctx.pathOf(id) ?? path
          await this.api.saveNote(target, content, this.ctx.tagsOf(id))
        })
      )
    }
    if (patch.title !== undefined) {
      const title = patch.title
      ops.push(
        this.renamer.schedule(async () => {
          const target = this.ctx.pathOf(id) ?? path
          const renamed = await this.api.renameNote(target, title)
          this.ctx.forgetPath(target)
          this.ctx.remember(renamed)
        })
      )
    }
    await Promise.all(ops)
    const finalPath = this.ctx.pathOf(id)
    if (!finalPath) throw new Error(`笔记不存在: ${id}`)
    const content = await this.api.getNoteContent(finalPath)
    this.ctx.remember(content)
    return toNote(content)
  }

  async delete(id: NoteId): Promise<void> {
    const path = this.ctx.pathOf(id)
    if (!path) return
    await this.api.deleteNote(path)
    this.ctx.forgetPath(path)
  }
}
