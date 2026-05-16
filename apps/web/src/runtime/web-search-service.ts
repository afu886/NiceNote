import type { SearchHit, SearchQuery, SearchService } from '@nicenote/core'
import { asNoteId } from '@nicenote/core'
import { extractSnippet } from '@nicenote/shared'

import { loadStoredNotes } from '../adapters/local-storage-note-repository'

/** Web 搜索：内存扫描（沿用原 useNoteStore.search 语义）。 */
export class WebSearchService implements SearchService {
  async search(query: SearchQuery): Promise<SearchHit[]> {
    const q = query.q.toLowerCase()
    const limit = query.limit ?? 20
    const results: SearchHit[] = []
    for (const note of loadStoredNotes()) {
      if (results.length >= limit) break
      const content = note.content ?? ''
      const titleMatch = note.title.toLowerCase().includes(q)
      const snippet = extractSnippet(content, q)
      if (!titleMatch && !snippet) continue
      results.push({
        id: asNoteId(note.id),
        title: note.title,
        snippet,
        updatedAt: note.updatedAt,
      })
    }
    return results
  }
}
