import { create } from 'zustand'

import type { NoteListItem, NoteSearchResult, NoteSelect, TagSelect } from '@nicenote/shared'
import { generateSummary } from '@nicenote/shared'

const STORAGE_KEY = 'nicenote-notes'
const TAGS_STORAGE_KEY = 'nicenote-tags'
const NOTE_TAGS_STORAGE_KEY = 'nicenote-note-tags'

function loadNotes(): NoteSelect[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as NoteSelect[]) : []
  } catch {
    return []
  }
}

function saveNotes(notes: NoteSelect[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
}

function loadTags(): TagSelect[] {
  try {
    const raw = localStorage.getItem(TAGS_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as TagSelect[]) : []
  } catch {
    return []
  }
}

function saveTags(tags: TagSelect[]) {
  localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(tags))
}

function loadNoteTags(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(NOTE_TAGS_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, string[]>) : {}
  } catch {
    return {}
  }
}

function saveNoteTags(noteTags: Record<string, string[]>) {
  localStorage.setItem(NOTE_TAGS_STORAGE_KEY, JSON.stringify(noteTags))
}

function toListItem(note: NoteSelect): NoteListItem {
  return {
    id: note.id,
    title: note.title,
    summary: generateSummary(note.content ?? '') || null,
    folderId: note.folderId,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  }
}

function searchNotes(notes: NoteSelect[], query: string, limit = 20): NoteSearchResult[] {
  const q = query.toLowerCase()
  const results: NoteSearchResult[] = []

  for (const note of notes) {
    if (results.length >= limit) break

    const content = note.content ?? ''
    const titleMatch = note.title.toLowerCase().includes(q)
    const contentIdx = content.toLowerCase().indexOf(q)

    if (!titleMatch && contentIdx === -1) continue

    // 从匹配位置提取纯文本摘要片段（不注入 HTML，避免 XSS）
    let snippet = ''
    if (contentIdx !== -1) {
      const start = Math.max(0, contentIdx - 40)
      const end = Math.min(content.length, contentIdx + q.length + 60)
      const raw = content.slice(start, end)
      snippet = (start > 0 ? '…' : '') + raw + (end < content.length ? '…' : '')
    }

    results.push({
      id: note.id,
      title: note.title,
      summary: generateSummary(content) || null,
      folderId: note.folderId,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      snippet,
    })
  }

  return results
}

interface NoteStore {
  notes: NoteSelect[]
  selectedNoteId: string | null
  tags: TagSelect[]
  noteTags: Record<string, string[]>
  selectNote: (id: string | null) => void
  createNote: () => string
  updateNote: (id: string, patch: { title?: string; content?: string | null }) => void
  deleteNote: (id: string) => void
  importNotes: (items: Array<{ title: string; content: string }>) => void
  search: (query: string) => NoteSearchResult[]
  createTag: (name: string) => TagSelect
  addTagToNote: (noteId: string, tagId: string) => void
  removeTagFromNote: (noteId: string, tagId: string) => void
}

export const useNoteStore = create<NoteStore>((set, get) => ({
  notes: loadNotes(),
  selectedNoteId: null,
  tags: loadTags(),
  noteTags: loadNoteTags(),

  selectNote: (id) => set({ selectedNoteId: id }),

  createNote: () => {
    const now = new Date().toISOString()
    const note: NoteSelect = {
      id: crypto.randomUUID(),
      title: '',
      content: null,
      folderId: null,
      createdAt: now,
      updatedAt: now,
    }
    const notes = [note, ...get().notes]
    saveNotes(notes)
    set({ notes, selectedNoteId: note.id })
    return note.id
  },

  updateNote: (id, patch) => {
    const notes = get().notes.map((n) =>
      n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n
    )
    notes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    saveNotes(notes)
    set({ notes })
  },

  deleteNote: (id) => {
    const { notes, selectedNoteId } = get()
    const newNotes = notes.filter((n) => n.id !== id)
    saveNotes(newNotes)
    set({
      notes: newNotes,
      selectedNoteId: selectedNoteId === id ? null : selectedNoteId,
    })
  },

  importNotes: (items) => {
    const now = new Date().toISOString()
    const newNotes: NoteSelect[] = items.map((item) => ({
      id: crypto.randomUUID(),
      title: item.title,
      content: item.content || null,
      folderId: null,
      createdAt: now,
      updatedAt: now,
    }))
    const notes = [...newNotes, ...get().notes]
    saveNotes(notes)
    set({ notes })
  },

  search: (query) => searchNotes(get().notes, query),

  createTag: (name) => {
    const tag: TagSelect = {
      id: crypto.randomUUID(),
      name: name.trim(),
      color: null,
      createdAt: new Date().toISOString(),
    }
    const tags = [...get().tags, tag]
    saveTags(tags)
    set({ tags })
    return tag
  },

  addTagToNote: (noteId, tagId) => {
    const noteTags = { ...get().noteTags }
    const existing = noteTags[noteId] ?? []
    if (existing.includes(tagId)) return
    noteTags[noteId] = [...existing, tagId]
    saveNoteTags(noteTags)
    set({ noteTags })
  },

  removeTagFromNote: (noteId, tagId) => {
    const noteTags = { ...get().noteTags }
    const existing = noteTags[noteId] ?? []
    noteTags[noteId] = existing.filter((id) => id !== tagId)
    saveNoteTags(noteTags)
    set({ noteTags })
  },
}))

// 供组件使用的 selector
export const selectNoteList = (notes: NoteSelect[]): NoteListItem[] => notes.map(toListItem)
