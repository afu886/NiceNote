import type { StateCreator } from 'zustand'

import type { DesktopStore } from '../useDesktopStore'

export interface WatcherSlice {
  handleFileCreated: (path: string) => void
  handleFileModified: (path: string) => void
  handleFileDeleted: (path: string) => void
}

export const createWatcherSlice: StateCreator<DesktopStore, [], [], WatcherSlice> = (
  set,
  get
) => ({
  handleFileCreated: (path: string) => {
    const { currentFolder } = get()
    if (!currentFolder) return
    if (path.startsWith(currentFolder)) {
      get().loadNotes()
    }
  },

  handleFileModified: (path: string) => {
    const { activeNote } = get()
    if (activeNote?.path === path) {
      get().openNote(path)
    }
    get().loadNotes()
  },

  handleFileDeleted: (path: string) => {
    set((state) => {
      const notes = state.notes.filter((n) => n.path !== path)
      const activeNote = state.activeNote?.path === path ? null : state.activeNote
      return { notes, activeNote }
    })
  },
})
