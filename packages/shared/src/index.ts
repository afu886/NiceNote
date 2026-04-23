/**
 * @nicenote/shared — 入口
 *
 * 所有工具函数和通用类型的统一出口
 */

// ============================================================
// 工具函数
// ============================================================
export { DEFAULT_NOTE_TITLE, LANG_STORAGE_KEY, THEME_STORAGE_KEY } from './constants'
export { toKebabCase } from './parsers'
export type { Language, Settings, Theme } from './settings'
export { debounce } from './utils/debounce'
export { formatShortcutKey, isMac, MAC_SYMBOLS, parseShortcutKeys } from './utils/platform'
export { sanitizeContent } from './utils/sanitize'
export { extractSnippet } from './utils/snippet'
export { generateSummary } from './utils/summary'
export { throttle } from './utils/throttle'
export type { LinkValidationErrorKey } from './validators'
export { getLinkValidationError } from './validators'

// ============================================================
// 领域 Schema & 类型
// ============================================================
export type {
  NoteCreateInput,
  NoteInsert,
  NoteListItem,
  NoteListQuery,
  NoteListResult,
  NoteSearchQuery,
  NoteSearchResult,
  NoteSelect,
  NoteUpdateInput,
} from './schemas/note'
export {
  noteCreateSchema,
  noteIdParamSchema,
  noteInsertSchema,
  noteListItemSchema,
  noteListQuerySchema,
  noteSearchQuerySchema,
  noteSearchResultSchema,
  noteSelectSchema,
  noteUpdateSchema,
} from './schemas/note'

// ============================================================
// Folder Schema & 类型
// ============================================================
export type { FolderCreateInput, FolderSelect, FolderUpdateInput } from './schemas/folder'
export {
  folderCreateSchema,
  folderIdParamSchema,
  folderSelectSchema,
  folderUpdateSchema,
} from './schemas/folder'

// ============================================================
// Tag Schema & 类型
// ============================================================
export type { TagCreateInput, TagSelect, TagUpdateInput } from './schemas/tag'
export {
  noteTagParamSchema,
  tagCreateSchema,
  tagIdParamSchema,
  tagSelectSchema,
  tagUpdateSchema,
} from './schemas/tag'
