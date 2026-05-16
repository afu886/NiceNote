import type { SearchHit, SearchQuery, SearchService } from '@nicenote/core'

import type { SearchResult } from '../bindings/tauri'

import type { DesktopRuntimeContext } from './desktop-runtime-context'

export interface DesktopSearchApi {
  searchNotes(folderPath: string, query: string): Promise<SearchResult[]>
}

/** Desktop 搜索：后端索引/扫描；path → NoteId 在边界翻译。 */
export class TauriSearchService implements SearchService {
  constructor(
    private readonly api: DesktopSearchApi,
    private readonly ctx: DesktopRuntimeContext
  ) {}

  async search(query: SearchQuery): Promise<SearchHit[]> {
    const folder = this.ctx.currentFolder
    if (!folder || !query.q.trim()) return []
    const results = await this.api.searchNotes(folder, query.q)
    const limit = query.limit ?? 20
    const hits: SearchHit[] = []
    for (const r of results.slice(0, limit)) {
      const id = this.ctx.idOf(r.path)
      if (!id) continue
      hits.push({ id, title: r.title, snippet: r.snippet, updatedAt: r.updatedAt })
    }
    return hits
  }
}
