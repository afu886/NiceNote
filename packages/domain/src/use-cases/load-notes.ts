import type { NoteListQuery, NoteListResult } from '@nicenote/shared'

import type { NoteRepository } from '../note-repository'

/**
 * 加载笔记列表用例
 */
export function createLoadNotesUseCase(repo: NoteRepository) {
  return async (query: NoteListQuery): Promise<NoteListResult> => {
    return repo.list(query)
  }
}
