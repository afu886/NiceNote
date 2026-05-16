// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import { asNoteId, createTagRepositoryContract } from '@nicenote/core'

import { makeCoreTagRepo, resetWebTags } from './local-storage-tag-repository.adapter'

createTagRepositoryContract(
  { describe, it, expect },
  {
    makeRepo: makeCoreTagRepo,
    makeNoteId: () => asNoteId('note-contract-1'),
    reset: resetWebTags,
  }
)
