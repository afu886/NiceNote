import type { Brand } from '../brand'

/**
 * 笔记稳定合成标识。
 *
 * 领域内只用 NoteId。任何 path / localStorage key / SQLite rowid 都是 runtime 私有，
 * 必须在 repository 边界翻译为 NoteId，禁止泄漏进 app-dom。
 */
export type NoteId = Brand<string, 'NoteId'>

/**
 * 铸造 NoteId —— repository 边界唯一入口。
 *
 * 实现方必须用稳定、与内容无关的标识铸造（Web=localStorage UUID，Desktop=frontmatter id）。
 * 禁止用 path / rowid / localStorage key 作为 NoteId 的值。
 */
export function asNoteId(raw: string): NoteId {
  if (raw.length === 0) {
    throw new Error('NoteId 必须是非空字符串')
  }
  return raw as NoteId
}

/** 安全翻译：空值不抛，返回 null（用于 repository 边界容错） */
export function tryNoteId(raw: string | null | undefined): NoteId | null {
  return raw != null && raw.length > 0 ? (raw as NoteId) : null
}

/** 笔记领域实体。正文只持久化 Markdown（不变量）。无 folderId、无内联 tags（关系型走 TagRepository）。 */
export interface Note {
  id: NoteId
  title: string
  /** Markdown 字符串。不变量：不持久化 ProseMirror JSON。 */
  content: string
  /** ISO8601 */
  createdAt: string
  /** ISO8601 */
  updatedAt: string
}

/** 列表/侧栏投影，不含正文。 */
export interface NoteSummary {
  id: NoteId
  title: string
  summary: string | null
  createdAt: string
  updatedAt: string
}

/** 系统集成层引用笔记的领域 ref（不暴露 path）。 */
export interface NoteRef {
  readonly id: NoteId
}

/** 新建草稿。exactOptionalPropertyTypes：调用方应省略而非传 undefined。 */
export interface NoteDraft {
  title?: string
  content?: string
}

/** 局部更新补丁。 */
export interface NotePatch {
  title?: string
  content?: string
}
