import type { StateCreator } from 'zustand'

import type { SearchResult } from '../../bindings/tauri'
import { AppService } from '../../bindings/tauri'
import type { DesktopStore } from '../useDesktopStore'

export interface SearchSlice {
  searchOpen: boolean
  searchQuery: string
  searchResults: SearchResult[]
  isSearching: boolean
  setSearchOpen: (open: boolean) => void
  search: (query: string) => Promise<void>
}

export const createSearchSlice: StateCreator<DesktopStore, [], [], SearchSlice> = (set, get) => ({
  searchOpen: false,
  searchQuery: '',
  searchResults: [],
  isSearching: false,

  setSearchOpen: (open: boolean) => {
    set({ searchOpen: open })
    if (!open) {
      set({ searchQuery: '', searchResults: [] })
    }
  },

  search: async (query: string) => {
    const { currentFolder } = get()
    set({ searchQuery: query })
    if (!query.trim() || !currentFolder) {
      set({ searchResults: [] })
      return
    }

    set({ isSearching: true })
    try {
      const results = await AppService.SearchNotes(currentFolder, query)
      set({ searchResults: results })
    } catch (err) {
      console.error('搜索失败:', err)
      set({ searchResults: [] })
    } finally {
      set({ isSearching: false })
    }
  },
})
