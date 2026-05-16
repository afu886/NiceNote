import type { NoteId } from '../note/types'

import type { Tag, TagDraft, TagId, TagPatch } from './types'

/**
 * 标签仓储端口（关系型为准：TagId ↔ NoteId）。
 *
 * UI 层只说标签名；名称 ↔ id 解析与自动建标签由 usecase（阶段 1）封装，
 * 本端口暴露关系型原语，契约套件据此证明关系模型。
 */
export interface TagRepository {
  listTags(): Promise<Tag[]>
  createTag(draft: TagDraft): Promise<Tag>
  updateTag(id: TagId, patch: TagPatch): Promise<Tag>
  deleteTag(id: TagId): Promise<void>
  /** 某笔记关联的标签 */
  tagsOf(noteId: NoteId): Promise<Tag[]>
  attach(noteId: NoteId, tagId: TagId): Promise<void>
  detach(noteId: NoteId, tagId: TagId): Promise<void>
}
