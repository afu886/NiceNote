import type { StateCreator } from 'zustand'

import { AppService } from '../../bindings/tauri'
import type { DesktopStore } from '../useDesktopStore'

export interface FolderSlice {
  currentFolder: string | null
  recentFolders: string[]
  openFolder: (path?: string) => Promise<void>
}

export const createFolderSlice: StateCreator<DesktopStore, [], [], FolderSlice> = (set, get) => ({
  currentFolder: null,
  recentFolders: [],

  openFolder: async (path?: string) => {
    try {
      let folderPath = path
      if (!folderPath) {
        folderPath = await AppService.OpenFolderDialog()
      }
      if (!folderPath) return

      await AppService.AddRecentFolder(folderPath)
      await AppService.WatchFolder(folderPath)

      set({ currentFolder: folderPath, activeNote: null, notes: [] })

      await get().loadNotes()
      const recent = await AppService.GetRecentFolders()
      set({ recentFolders: recent })
    } catch (err) {
      console.error('打开文件夹失败:', err)
    }
  },
})
