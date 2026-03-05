/**
 * @nicenote/shared — 入口
 *
 * 所有工具函数和通用类型的统一出口
 */

// ============================================================
// 工具函数
// ============================================================
export { DEFAULT_NOTE_TITLE, LANG_STORAGE_KEY, THEME_STORAGE_KEY } from './constants'
export { debounce, throttle } from './debounce'
export { toKebabCase } from './parsers'
export { sanitizeContent } from './sanitize'
export { generateSummary } from './summary'
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
} from './schemas'
export {
  noteCreateSchema,
  noteIdParamSchema,
  noteListItemSchema,
  noteListQuerySchema,
  noteSearchQuerySchema,
  noteSearchResultSchema,
  noteSelectSchema,
  noteUpdateSchema,
} from './schemas'

// ============================================================
// Folder Schema & 类型
// ============================================================
export type { FolderCreateInput, FolderSelect, FolderUpdateInput } from './folder-schemas'
export {
  folderCreateSchema,
  folderIdParamSchema,
  folderSelectSchema,
  folderUpdateSchema,
} from './folder-schemas'

// ============================================================
// Tag Schema & 类型
// ============================================================
export type { TagCreateInput, TagSelect, TagUpdateInput } from './tag-schemas'
export {
  noteTagParamSchema,
  tagCreateSchema,
  tagIdParamSchema,
  tagSelectSchema,
  tagUpdateSchema,
} from './tag-schemas'
