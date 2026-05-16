import { describe, expect, it } from 'vitest'

import { createNoteRepositoryContract } from '@nicenote/core'

import { InMemoryNoteApi } from './in-memory-note-api.mock'
import { TauriNoteRepository } from './tauri-note-repository.adapter'

const FOLDER = '/ws'
let api = new InMemoryNoteApi(FOLDER)

createNoteRepositoryContract(
  { describe, it, expect },
  {
    makeRepo: () => new TauriNoteRepository(api, FOLDER),
    reset: () => {
      api = new InMemoryNoteApi(FOLDER)
    },
    supportsPagination: false,
  }
)
