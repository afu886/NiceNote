import type { ContractHarness } from '../contract-testing'
import type { NoteId } from '../note/types'

import type { TagRepository } from './repository'

export interface TagRepositoryContractOptions {
  makeRepo: () => TagRepository | Promise<TagRepository>
  /** 提供一个属于该 repo 的有效 NoteId（关系测试用） */
  makeNoteId: () => NoteId | Promise<NoteId>
  reset?: () => void | Promise<void>
}

/**
 * 可复用的 TagRepository 契约套件（关系型：TagId ↔ NoteId）。
 */
export function createTagRepositoryContract(
  harness: ContractHarness,
  options: TagRepositoryContractOptions
): void {
  const { describe, it, expect } = harness
  const { makeRepo, makeNoteId, reset } = options

  describe('TagRepository 契约', () => {
    it('createTag → listTags 含新标签', async () => {
      await reset?.()
      const repo = await makeRepo()
      const tag = await repo.createTag({ name: 'rust' })
      const all = await repo.listTags()
      expect(all.some((t) => t.id === tag.id && t.name === 'rust')).toBe(true)
    })

    it('attach/detach 维护关系，tagsOf 反映关联', async () => {
      await reset?.()
      const repo = await makeRepo()
      const noteId = await makeNoteId()
      const tag = await repo.createTag({ name: 'tauri' })
      await repo.attach(noteId, tag.id)
      let related = await repo.tagsOf(noteId)
      expect(related.some((t) => t.id === tag.id)).toBe(true)
      await repo.detach(noteId, tag.id)
      related = await repo.tagsOf(noteId)
      expect(related.some((t) => t.id === tag.id)).toBe(false)
    })

    it('deleteTag 后 listTags 不含该标签', async () => {
      await reset?.()
      const repo = await makeRepo()
      const tag = await repo.createTag({ name: 'temp' })
      await repo.deleteTag(tag.id)
      const all = await repo.listTags()
      expect(all.some((t) => t.id === tag.id)).toBe(false)
    })
  })
}
