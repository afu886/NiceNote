import type { NoteId, Tag, TagDraft, TagId, TagPatch, TagRepository } from '@nicenote/core'
import { asTagId } from '@nicenote/core'

import type { NoteContent } from '../bindings/tauri'

import type { DesktopRuntimeContext } from './desktop-runtime-context'

/** Desktop 标签 IPC 子集（frontmatter 标签经 saveNote 落盘） */
export interface DesktopTagApi {
  getNoteContent(path: string): Promise<NoteContent>
  saveNote(path: string, content: string, tags: string[]): Promise<void>
}

function tag(name: string): Tag {
  // Desktop 标签以名称为身份（frontmatter 扁平 string[]），名称即稳定 id
  return { id: asTagId(name), name, createdAt: '' }
}

/**
 * Desktop 标签仓储：把 frontmatter 扁平 string[] 暴露为关系型端口。
 * 名称即 TagId；attach/detach 通过 saveNote 改写 frontmatter（等价原行为）。
 */
export class TauriTagRepository implements TagRepository {
  constructor(
    private readonly api: DesktopTagApi,
    private readonly ctx: DesktopRuntimeContext
  ) {}

  async listTags(): Promise<Tag[]> {
    return this.ctx.allTagNames().map(tag)
  }

  async createTag(draft: TagDraft): Promise<Tag> {
    // 物化发生在 attach 时写入 frontmatter；此处仅返回标识
    return tag(draft.name.trim())
  }

  async updateTag(_id: TagId, _patch: TagPatch): Promise<Tag> {
    // 全局标签重命名未在产品 UI 暴露；保持最小实现
    throw new Error('Desktop 暂不支持全局标签重命名')
  }

  async deleteTag(id: TagId): Promise<void> {
    const name = String(id)
    for (const noteId of this.ctx.allNoteIds()) {
      const path = this.ctx.pathOf(noteId)
      if (!path) continue
      if (!this.ctx.tagsOf(noteId).includes(name)) continue
      const content = await this.api.getNoteContent(path)
      const next = content.tags.filter((t) => t !== name)
      await this.api.saveNote(path, content.content, next)
      this.ctx.setTags(noteId, next)
    }
  }

  async tagsOf(noteId: NoteId): Promise<Tag[]> {
    return this.ctx.tagsOf(noteId).map(tag)
  }

  async attach(noteId: NoteId, tagId: TagId): Promise<void> {
    const name = String(tagId)
    const path = this.ctx.pathOf(noteId)
    if (!path) return
    const content = await this.api.getNoteContent(path)
    if (content.tags.includes(name)) return
    const next = [...content.tags, name]
    await this.api.saveNote(path, content.content, next)
    this.ctx.setTags(noteId, next)
  }

  async detach(noteId: NoteId, tagId: TagId): Promise<void> {
    const name = String(tagId)
    const path = this.ctx.pathOf(noteId)
    if (!path) return
    const content = await this.api.getNoteContent(path)
    const next = content.tags.filter((t) => t !== name)
    await this.api.saveNote(path, content.content, next)
    this.ctx.setTags(noteId, next)
  }
}
