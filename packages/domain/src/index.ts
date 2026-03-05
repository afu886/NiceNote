/**
 * @nicenote/domain — 领域层
 *
 * Repository 接口 + UseCase（纯 TS，无 IO）
 */

// ============================================================
// Repository 接口
// ============================================================
export type { NoteRepository } from './note-repository'
export type { SearchIndex } from './search-index'
export type { Settings, SettingsRepository } from './settings-repository'

// ============================================================
// Use Cases
// ============================================================
export { createCreateNoteUseCase } from './use-cases/create-note'
export { createLoadNotesUseCase } from './use-cases/load-notes'
export { createSaveNoteUseCase } from './use-cases/save-note'
export { createSearchNotesUseCase } from './use-cases/search-notes'
