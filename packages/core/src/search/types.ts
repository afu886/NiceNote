import type { NoteId } from '../note/types'

export interface SearchQuery {
  q: string
  limit?: number
}

/** 搜索命中。以 NoteId 寻址（Desktop path → NoteId 已在 runtime 边界翻译）。 */
export interface SearchHit {
  id: NoteId
  title: string
  snippet: string
  updatedAt: string
}
