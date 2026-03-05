import type {
  NoteCreateInput,
  NoteListQuery,
  NoteListResult,
  NoteSearchQuery,
  NoteSearchResult,
  NoteSelect,
  NoteUpdateInput,
} from '@nicenote/shared'

/**
 * 笔记仓储接口，各端（Web / Desktop / Mobile）各自实现
 */
export interface NoteRepository {
  list(query: NoteListQuery): Promise<NoteListResult>
  get(id: string): Promise<NoteSelect | null>
  create(input: NoteCreateInput): Promise<NoteSelect>
  update(id: string, input: NoteUpdateInput): Promise<NoteSelect>
  delete(id: string): Promise<void>
  search(query: NoteSearchQuery): Promise<NoteSearchResult[]>
}
