import type { AppRuntime } from '../app-runtime'
import type { NoteId } from '../note/types'

import type { Tag } from './types'

export interface TagInfo {
  name: string
  color?: string | undefined
  count: number
}

export interface TagUsecases {
  listTags(): Promise<Tag[]>
  tagsOfNames(noteId: NoteId): Promise<string[]>
  /** 名称语义添加：标签不存在则先创建再关联（统一 Web 关系型与 Desktop 名称型差异） */
  addByName(noteId: NoteId, name: string): Promise<void>
  removeByName(noteId: NoteId, name: string): Promise<void>
}

/**
 * 标签 usecase 工厂。UI 只说标签名；名称 ↔ id 解析与自动建标签收敛到此，
 * 取代各端 Provider 里手搓的 tagNameToId/createTag 映射图。
 */
export function createTagUsecases(runtime: Pick<AppRuntime, 'tags'>): TagUsecases {
  const { tags } = runtime
  return {
    listTags: () => tags.listTags(),

    async tagsOfNames(noteId) {
      const list = await tags.tagsOf(noteId)
      return list.map((t) => t.name)
    },

    async addByName(noteId, name) {
      const trimmed = name.trim()
      if (trimmed.length === 0) return
      const all = await tags.listTags()
      const existing = all.find((t) => t.name === trimmed)
      const tag = existing ?? (await tags.createTag({ name: trimmed }))
      await tags.attach(noteId, tag.id)
    },

    async removeByName(noteId, name) {
      const all = await tags.listTags()
      const tag = all.find((t) => t.name === name)
      if (tag) await tags.detach(noteId, tag.id)
    },
  }
}
