import type { NoteSearchQuery, NoteSearchResult } from '@nicenote/shared'

/**
 * 搜索索引接口，各端可选择不同实现（内存索引、FTS5、线性扫描等）
 */
export interface SearchIndex {
  search(query: NoteSearchQuery): Promise<NoteSearchResult[]>
}
