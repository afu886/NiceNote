import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useNoteStore } from './useNoteStore'

const NOTES_STORAGE_KEY = 'nicenote-notes'

function createLocalStorageMock(): Storage {
  let store = new Map<string, string>()

  return {
    get length() {
      return store.size
    },
    clear() {
      store = new Map()
    },
    getItem(key) {
      return store.get(key) ?? null
    },
    key(index) {
      return Array.from(store.keys())[index] ?? null
    },
    removeItem(key) {
      store.delete(key)
    },
    setItem(key, value) {
      store.set(key, value)
    },
  } satisfies Storage
}

describe('useNoteStore', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createLocalStorageMock())
    useNoteStore.setState({
      notes: [],
      selectedNoteId: null,
      isLoading: false,
      tags: [],
      noteTags: {},
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('starts with no selected note', () => {
    expect(useNoteStore.getState().selectedNoteId).toBeNull()
  })

  it('selects a note by id', () => {
    useNoteStore.getState().selectNote('n1')
    expect(useNoteStore.getState().selectedNoteId).toBe('n1')
  })

  it('clears selection with null', () => {
    useNoteStore.getState().selectNote('n1')
    useNoteStore.getState().selectNote(null)
    expect(useNoteStore.getState().selectedNoteId).toBeNull()
  })

  it('replaces previous selection', () => {
    useNoteStore.getState().selectNote('n1')
    useNoteStore.getState().selectNote('n2')
    expect(useNoteStore.getState().selectedNoteId).toBe('n2')
  })

  it('loads stored notes directly from localStorage', async () => {
    localStorage.setItem(
      NOTES_STORAGE_KEY,
      JSON.stringify([
        {
          id: 'n1',
          title: 'Older',
          content: 'older note',
          folderId: null,
          createdAt: '2026-04-20T08:00:00.000Z',
          updatedAt: '2026-04-20T08:00:00.000Z',
        },
        {
          id: 'n2',
          title: 'Newer',
          content: 'newer note',
          folderId: null,
          createdAt: '2026-04-21T08:00:00.000Z',
          updatedAt: '2026-04-21T08:00:00.000Z',
        },
      ])
    )

    await useNoteStore.getState().loadNotes()

    expect(useNoteStore.getState().notes).toEqual([
      {
        id: 'n2',
        title: 'Newer',
        content: 'newer note',
        folderId: null,
        createdAt: '2026-04-21T08:00:00.000Z',
        updatedAt: '2026-04-21T08:00:00.000Z',
      },
      {
        id: 'n1',
        title: 'Older',
        content: 'older note',
        folderId: null,
        createdAt: '2026-04-20T08:00:00.000Z',
        updatedAt: '2026-04-20T08:00:00.000Z',
      },
    ])
    expect(useNoteStore.getState().isLoading).toBe(false)
  })
})
