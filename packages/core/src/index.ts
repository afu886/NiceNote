/**
 * @nicenote/core — NiceNote 业务内核
 *
 * 统一领域模型、Repository 端口、能力发现模型、Markdown 持久化规则、
 * 可复用契约测试套件。不依赖 React/Tauri/localStorage/SQLite。
 */

// ---- 品牌类型载体 ----
export type { Brand } from './brand'

// ---- 笔记域 ----
export type { NoteListCursor, NoteListPage, NoteListQuery, NoteRepository } from './note/repository'
export type { NoteRepositoryContractOptions } from './note/repository-contract'
export { createNoteRepositoryContract } from './note/repository-contract'
export type { Note, NoteDraft, NoteId, NotePatch, NoteRef, NoteSummary } from './note/types'
export { asNoteId, tryNoteId } from './note/types'
export type { NoteUsecases } from './note/usecases'
export { createNoteUsecases } from './note/usecases'

// ---- 标签域 ----
export type { TagRepository } from './tag/repository'
export type { TagRepositoryContractOptions } from './tag/repository-contract'
export { createTagRepositoryContract } from './tag/repository-contract'
export type { Tag, TagDraft, TagId, TagPatch } from './tag/types'
export { asTagId, tryTagId } from './tag/types'
export type { TagInfo, TagUsecases } from './tag/usecases'
export { createTagUsecases } from './tag/usecases'

// ---- 工作区域 ----
export type { WorkspaceRepository } from './workspace/repository'
export type {
  Workspace,
  WorkspaceId,
  WorkspaceRef,
  WorkspaceWatchHandlers,
  WorkspaceWatchSubscription,
} from './workspace/types'
export { asWorkspaceId } from './workspace/types'

// ---- 设置域 ----
export type { SettingsRepository } from './settings/repository'
export type { AppSettings, Language, Settings, Theme } from './settings/types'

// ---- 搜索域 ----
export type { SearchService } from './search/service'
export type { SearchHit, SearchQuery } from './search/types'

// ---- 保存态 ----
export type { SaveState } from './save-state'

// ---- 能力模型 & Runtime ----
export type { AppRuntime, SystemIntegration } from './app-runtime'
export type { CapabilityState, SystemCapabilities } from './capabilities'
export type { KeyValueStore } from './prefs'

// ---- Markdown 持久化 ----
export type { Frontmatter } from './markdown/frontmatter'
export { emptyFrontmatter, parseFrontmatter, serializeFrontmatter } from './markdown/frontmatter'
export {
  NOTE_BODY_FORMAT,
  NOTE_ID_LOCATION,
  PRESERVE_UNKNOWN_FRONTMATTER,
} from './markdown/persistence-policy'
export type { MarkdownRoundtripContractOptions } from './markdown/roundtrip-contract'
export { createMarkdownRoundtripContract } from './markdown/roundtrip-contract'

// ---- 契约测试运行器注入接口 ----
export type { ContractExpect, ContractExpectation, ContractHarness } from './contract-testing'
