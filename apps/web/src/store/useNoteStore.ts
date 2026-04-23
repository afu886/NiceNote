import { create } from 'zustand'

import type { NoteSearchResult, NoteSelect, TagSelect } from '@nicenote/shared'
import { extractSnippet, generateSummary } from '@nicenote/shared'

import {
  loadStoredNotes,
  LocalStorageNoteRepository,
} from '../adapters/local-storage-note-repository'

// ============================================================
// Repository 实例（通过 domain 层接口访问数据）
// ============================================================

const repo = new LocalStorageNoteRepository()

// ============================================================
// localStorage 辅助函数（仅用于标签，标签暂无 domain 接口）
// ============================================================

const TAGS_STORAGE_KEY = 'nicenote-tags'
const NOTE_TAGS_STORAGE_KEY = 'nicenote-note-tags'

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

interface NoteStore {
  notes: NoteSelect[]
  selectedNoteId: string | null
  isLoading: boolean
  tags: TagSelect[]
  noteTags: Record<string, string[]>
  loadNotes: () => Promise<void>
  selectNote: (id: string | null) => void
  createNote: () => Promise<string>
  updateNote: (id: string, patch: { title?: string; content?: string | null }) => void
  deleteNote: (id: string) => Promise<void>
  importNotes: (items: Array<{ title: string; content: string }>) => void
  search: (query: string) => NoteSearchResult[]
  createTag: (name: string) => TagSelect
  addTagToNote: (noteId: string, tagId: string) => void
  removeTagFromNote: (noteId: string, tagId: string) => void
}

export const useNoteStore = create<NoteStore>((set, get) => ({
  notes: [],
  selectedNoteId: null,
  isLoading: true,
  tags: loadTags(),
  noteTags: loadNoteTags(),

  loadNotes: async () => {
    set({ isLoading: true })
    try {
      // Web 端直接读取完整笔记，避免 list + get 的 N+1 加载。
      const notes = loadStoredNotes()
      set({ notes, isLoading: false })
    } catch {
      set({ isLoading: false })
    }
  },

  selectNote: (id) => set({ selectedNoteId: id }),

  createNote: async () => {
    const note = await repo.create({ title: '' })
    set((state) => ({ notes: [note, ...state.notes], selectedNoteId: note.id }))
    return note.id
  },

  updateNote: (id, patch) => {
    // 乐观更新：立即更新本地状态
    const notes = get().notes.map((n) =>
      n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n
    )
    notes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    set({ notes })

    // 后台持久化
    repo.update(id, patch).catch((err) => {
      console.error('保存笔记失败:', err)
    })
  },

  deleteNote: async (id) => {
    await repo.delete(id)
    const { notes, selectedNoteId } = get()
    set({
      notes: notes.filter((n) => n.id !== id),
      selectedNoteId: selectedNoteId === id ? null : selectedNoteId,
    })
  },

  importNotes: (items) => {
    const importPromises = items.map((item) =>
      repo.create({ title: item.title, content: item.content || null })
    )
    Promise.all(importPromises)
      .then((newNotes) => {
        set((state) => ({ notes: [...newNotes, ...state.notes] }))
      })
      .catch((err) => {
        console.error('导入笔记失败:', err)
      })
  },

  search: (query) => {
    const q = query.toLowerCase()
    const limit = 20
    const notes = get().notes
    const results: NoteSearchResult[] = []

    for (const note of notes) {
      if (results.length >= limit) break

      const content = note.content ?? ''
      const titleMatch = note.title.toLowerCase().includes(q)
      // extractSnippet 内部已做 toLowerCase + indexOf，无需重复计算
      const snippet = extractSnippet(content, q)

      if (!titleMatch && !snippet) continue

      results.push({
        id: note.id,
        title: note.title,
        summary: generateSummary(content) || null,
        folderId: note.folderId,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        tags: [],
        snippet,
      })
    }

    return results
  },

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

// 启动时加载笔记
useNoteStore.getState().loadNotes()
