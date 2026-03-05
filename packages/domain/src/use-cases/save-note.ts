import type { NoteSelect, NoteUpdateInput } from '@nicenote/shared'

import type { NoteRepository } from '../note-repository'

/**
 * 保存笔记用例：验证输入后委托给 Repository
 */
export function createSaveNoteUseCase(repo: NoteRepository) {
  return async (id: string, input: NoteUpdateInput): Promise<NoteSelect> => {
    return repo.update(id, input)
  }
}
