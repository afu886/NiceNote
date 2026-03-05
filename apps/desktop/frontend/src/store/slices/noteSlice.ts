import type { StateCreator } from 'zustand'

import { debounce } from '@nicenote/shared'

import type { NoteContent, NoteFile } from '../../bindings/tauri'
import { AppService } from '../../bindings/tauri'
import type { DesktopStore } from '../useDesktopStore'

// 防抖的保存函数（800ms）
const debouncedSaveIpc = debounce(
  async (path: string, content: string, tags: string[], onDone: () => void) => {
    try {
      await AppService.SaveNote(path, content, tags)
      onDone()
    } catch (err) {
      console.error('保存笔记失败:', err)
    }
  },
  800
)

// 防抖的重命名函数（1500ms）
const debouncedRenameIpc = debounce(
  async (oldPath: string, newTitle: string, onSuccess: (updatedNote: NoteFile) => void) => {
    try {
      const updated = await AppService.RenameNote(oldPath, newTitle)
      if (!updated) return
      onSuccess(updated)
    } catch (err) {
      console.error('重命名笔记失败:', err)
    }
  },
  1500
)

export interface NoteSlice {
  notes: NoteFile[]
  activeNote: NoteContent | null
  isLoading: boolean
  saveState: 'saved' | 'saving' | 'unsaved'
  loadNotes: () => Promise<void>
  openNote: (path: string) => Promise<void>
  saveNote: (content: string, tags: string[]) => void
  createNote: () => Promise<void>
  renameNote: (newTitle: string) => void
  deleteNote: (path: string) => Promise<void>
}

export const createNoteSlice: StateCreator<DesktopStore, [], [], NoteSlice> = (set, get) => ({
  notes: [],
  activeNote: null,
  isLoading: false,
  saveState: 'saved',

  loadNotes: async () => {
    const { currentFolder } = get()
    if (!currentFolder) return

    set({ isLoading: true })
    try {
      const notes = await AppService.ListNotes(currentFolder)
      notes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      set({ notes })
    } catch (err) {
      console.error('加载笔记列表失败:', err)
    } finally {
      set({ isLoading: false })
    }
  },

  openNote: async (path: string) => {
    try {
      const content = await AppService.GetNoteContent(path)
      set({ activeNote: content })
    } catch (err) {
      console.error('打开笔记失败:', err)
    }
  },

  saveNote: (content: string, tags: string[]) => {
    const { activeNote } = get()
    if (!activeNote) return

    set({
      saveState: 'saving',
      activeNote: { ...activeNote, content },
    })

    debouncedSaveIpc(activeNote.path, content, tags, () => {
      set({ saveState: 'saved' })
      get().loadNotes()
    })
  },

  createNote: async () => {
    const { currentFolder } = get()
    if (!currentFolder) return

    try {
      const newNote = await AppService.CreateNote(currentFolder)
      if (!newNote) return
      set((state) => ({ notes: [newNote, ...state.notes] }))
      await get().openNote(newNote.path)
    } catch (err) {
      console.error('创建笔记失败:', err)
    }
  },

  renameNote: (newTitle: string) => {
    const { activeNote } = get()
    if (!activeNote) return

    set({ activeNote: { ...activeNote, title: newTitle } })

    debouncedRenameIpc(activeNote.path, newTitle, (updated) => {
      set((state) => {
        const updatedActiveNote = state.activeNote ? { ...state.activeNote, ...updated } : null
        const notes = state.notes.map((n) =>
          n.path === activeNote.path ? { ...n, ...updated } : n
        )
        return { activeNote: updatedActiveNote, notes }
      })
    })
  },

  deleteNote: async (path: string) => {
    try {
      await AppService.DeleteNote(path)
      set((state) => {
        const notes = state.notes.filter((n) => n.path !== path)
        const activeNote = state.activeNote?.path === path ? null : state.activeNote
        return { notes, activeNote }
      })
    } catch (err) {
      console.error('删除笔记失败:', err)
    }
  },
})
