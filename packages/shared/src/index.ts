/**
 * @nicenote/shared — 入口
 *
 * 所有工具函数和通用类型的统一出口
 */

// ============================================================
// 工具函数
// ============================================================
export { LANG_STORAGE_KEY } from './constants'
export { toKebabCase } from './parsers'
export type { Language, Settings, Theme } from './settings'
export { debounce } from './utils/debounce'
export { isMac, parseShortcutKeys } from './utils/platform'
export { extractSnippet } from './utils/snippet'
export { generateSummary } from './utils/summary'
export { throttle } from './utils/throttle'
export type { LinkValidationErrorKey } from './validators'
export { getLinkValidationError } from './validators'

// ============================================================
// 领域 Schema & 类型
//
// 仅导出仍被 Web/Desktop runtime 适配层消费的类型；
// note/tag schema 运行时对象已被 @nicenote/core 取代，不再对外导出，
// 仅在文件内部支撑下方 z.infer 推导类型。
// ============================================================
export type {
  NoteCreateInput,
  NoteListItem,
  NoteListQuery,
  NoteListResult,
  NoteSearchQuery,
  NoteSearchResult,
  NoteSelect,
  NoteUpdateInput,
} from './schemas/note'
export type { TagSelect } from './schemas/tag'
