import type { NoteCreateInput, NoteSelect } from '@nicenote/shared'

import type { NoteRepository } from '../note-repository'

/**
 * 创建笔记用例
 */
export function createCreateNoteUseCase(repo: NoteRepository) {
  return async (input: NoteCreateInput): Promise<NoteSelect> => {
    return repo.create(input)
  }
}
