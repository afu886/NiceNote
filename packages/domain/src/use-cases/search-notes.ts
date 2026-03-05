import type { NoteSearchQuery, NoteSearchResult } from '@nicenote/shared'

import type { NoteRepository } from '../note-repository'

/**
 * 搜索笔记用例
 */
export function createSearchNotesUseCase(repo: NoteRepository) {
  return async (query: NoteSearchQuery): Promise<NoteSearchResult[]> => {
    return repo.search(query)
  }
}
