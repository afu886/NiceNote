// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import { createNoteRepositoryContract } from '@nicenote/core'

import { makeCoreNoteRepo, resetWebNotes } from './local-storage-note-repository.adapter'

createNoteRepositoryContract(
  { describe, it, expect },
  { makeRepo: makeCoreNoteRepo, reset: resetWebNotes, supportsPagination: true }
)
