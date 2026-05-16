import type { Brand } from '../brand'

/** 标签稳定合成标识。关系型模型（TagId ↔ NoteId）。 */
export type TagId = Brand<string, 'TagId'>

/** 铸造 TagId —— repository 边界唯一入口。 */
export function asTagId(raw: string): TagId {
  if (raw.length === 0) {
    throw new Error('TagId 必须是非空字符串')
  }
  return raw as TagId
}

export function tryTagId(raw: string | null | undefined): TagId | null {
  return raw != null && raw.length > 0 ? (raw as TagId) : null
}

/**
 * 标签领域实体。
 *
 * 不含 color —— tagColors 归入 settings 域（AppSettings.tagColors），不进笔记/标签模型。
 */
export interface Tag {
  id: TagId
  name: string
  /** ISO8601 */
  createdAt: string
}

export interface TagDraft {
  name: string
}

export interface TagPatch {
  name?: string
}
