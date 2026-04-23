import { create } from 'zustand'

import { applyLanguageToDOM, applyThemeToDOM } from '@nicenote/app-shell'
import { debounce } from '@nicenote/shared'

import type { NoteContent, NoteFile, Settings } from '../bindings/tauri'
import { AppService } from '../bindings/tauri'

const THEME_STORAGE_KEY = 'nicenote-desktop-theme'
const LANG_STORAGE_KEY = 'nicenote-desktop-lang'

// 防抖的保存函数（800ms）
const debouncedSaveIpc = debounce(
  async (
    path: string,
    content: string,
    tags: string[],
    onDone: () => void,
    onError: () => void
  ) => {
    try {
      await AppService.saveNote(path, content, tags)
      onDone()
    } catch (err) {
      console.error('保存笔记失败:', err)
      onError()
    }
  },
  800
)

// 防抖的重命名函数（1500ms）
const debouncedRenameIpc = debounce(
  async (
    oldPath: string,
    newTitle: string,
    onSuccess: (updatedNote: NoteFile) => void,
    onError: () => void
  ) => {
    try {
      const updated = await AppService.renameNote(oldPath, newTitle)
      if (!updated) return
      onSuccess(updated)
    } catch (err) {
      console.error('重命名笔记失败:', err)
      onError()
    }
  },
  1500
)

export interface DesktopStore {
  currentFolder: string | null
  recentFolders: string[]
  notes: NoteFile[]
  activeNote: NoteContent | null
  isLoading: boolean
  saveState: 'saved' | 'saving' | 'unsaved'
  settings: Settings
  tagColors: Record<string, string>
  favorites: string[]
  openFolder: (path?: string) => Promise<void>
  loadRecentFolders: () => Promise<void>
  loadNotes: () => Promise<void>
  openNote: (path: string) => Promise<void>
  saveNote: (content: string, tags: string[]) => void
  createNote: () => Promise<void>
  renameNote: (newTitle: string) => void
  deleteNote: (path: string) => Promise<void>
  toggleFavorite: (path: string) => Promise<void>
  loadFavorites: () => Promise<void>
  loadSettings: () => Promise<void>
  saveSettings: (settings: Partial<Settings>) => Promise<void>
  loadTagColors: () => Promise<void>
  setTagColor: (tag: string, color: string) => Promise<void>
  handleFileCreated: (path: string) => void
  handleFileModified: (path: string) => void
  handleFileDeleted: (path: string) => void
}

export const useDesktopStore = create<DesktopStore>((set, get) => {
  const loadRecentFolders = async () => {
    try {
      const recentFolders = await AppService.getRecentFolders()
      set({ recentFolders })
    } catch {
      // Tauri 运行时未就绪时忽略错误
    }
  }

  const loadNotes = async () => {
    const { currentFolder } = get()
    if (!currentFolder) return

    set({ isLoading: true })
    try {
      const notes = await AppService.listNotes(currentFolder)
      notes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      set({ notes })
    } catch (err) {
      console.error('加载笔记列表失败:', err)
    } finally {
      set({ isLoading: false })
    }
  }

  const openNote = async (path: string) => {
    // 切换笔记前刷新待处理的保存/重命名操作，防止数据丢失
    debouncedSaveIpc.flush()
    debouncedRenameIpc.flush()
    try {
      const content = await AppService.getNoteContent(path)
      set({ activeNote: content })
    } catch (err) {
      console.error('打开笔记失败:', err)
    }
  }

  const loadFavorites = async () => {
    try {
      const favorites = await AppService.getFavorites()
      set({ favorites })
    } catch (err) {
      console.error('加载收藏失败:', err)
    }
  }

  const loadSettings = async () => {
    try {
      const settings = await AppService.getSettings()
      if (!settings) return
      set({ settings })
      applyThemeToDOM(settings.theme)
      localStorage.setItem(THEME_STORAGE_KEY, settings.theme)
      applyLanguageToDOM(settings.language)
      localStorage.setItem(LANG_STORAGE_KEY, settings.language)
    } catch (err) {
      console.error('加载设置失败:', err)
    }
  }

  const loadTagColors = async () => {
    try {
      const tagColors = await AppService.getTagColors()
      set({ tagColors })
    } catch (err) {
      console.error('加载标签颜色失败:', err)
    }
  }

  // 仅合并同一批次的后端事件，避免文件监听导致的频繁刷新
  const debouncedLoadNotes = debounce(() => {
    void loadNotes()
  }, 100)

  return {
    currentFolder: null,
    recentFolders: [],
    notes: [],
    activeNote: null,
    isLoading: false,
    saveState: 'saved',
    settings: { theme: 'system', language: 'zh' },
    tagColors: {},
    favorites: [],

    openFolder: async (path?: string) => {
      try {
        let folderPath = path
        if (!folderPath) {
          folderPath = await AppService.openFolderDialog()
        }
        if (!folderPath) return

        // 先更新状态，确保界面立即切换
        set({ currentFolder: folderPath, activeNote: null, notes: [] })

        // 非关键操作并行执行，失败不影响主流程
        await Promise.allSettled([
          AppService.addRecentFolder(folderPath),
          AppService.watchFolder(folderPath),
        ])

        await loadNotes()
        await loadRecentFolders()
      } catch (err) {
        console.error('打开文件夹失败:', err)
      }
    },

    loadRecentFolders,
    loadNotes,
    openNote,

    saveNote: (content: string, tags: string[]) => {
      const { activeNote } = get()
      if (!activeNote) return

      set((state) => ({
        saveState: 'saving',
        activeNote: state.activeNote ? { ...state.activeNote, content, tags } : null,
        notes: state.notes.map((note) =>
          note.path === activeNote.path ? { ...note, tags } : note
        ),
      }))

      debouncedSaveIpc(
        activeNote.path,
        content,
        tags,
        () => {
          set({ saveState: 'saved' })
          void loadNotes()
        },
        () => {
          set({ saveState: 'unsaved' })
        }
      )
    },

    createNote: async () => {
      const { currentFolder } = get()
      if (!currentFolder) return

      try {
        const newNote = await AppService.createNote(currentFolder)
        if (!newNote) return
        set((state) => ({ notes: [newNote, ...state.notes] }))
        await openNote(newNote.path)
      } catch (err) {
        console.error('创建笔记失败:', err)
      }
    },

    renameNote: (newTitle: string) => {
      const { activeNote } = get()
      if (!activeNote) return

      set({ activeNote: { ...activeNote, title: newTitle } })

      debouncedRenameIpc(
        activeNote.path,
        newTitle,
        (updated) => {
          set((state) => {
            const updatedActiveNote = state.activeNote ? { ...state.activeNote, ...updated } : null
            const notes = state.notes.map((note) =>
              note.path === activeNote.path ? { ...note, ...updated } : note
            )
            return { activeNote: updatedActiveNote, notes }
          })
        },
        () => {
          // 重命名失败时回滚：重新加载原始笔记状态
          void openNote(activeNote.path)
        }
      )
    },

    deleteNote: async (path: string) => {
      try {
        await AppService.deleteNote(path)
        set((state) => {
          const notes = state.notes.filter((note) => note.path !== path)
          const activeNote = state.activeNote?.path === path ? null : state.activeNote
          return { notes, activeNote }
        })
      } catch (err) {
        console.error('删除笔记失败:', err)
      }
    },

    toggleFavorite: async (path: string) => {
      try {
        await AppService.toggleFavorite(path)
        await loadFavorites()
      } catch (err) {
        console.error('切换收藏失败:', err)
      }
    },

    loadFavorites,
    loadSettings,

    saveSettings: async (patch: Partial<Settings>) => {
      const prev = get().settings
      const updated: Settings = { ...prev, ...patch }
      set({ settings: updated })
      if (patch.theme) {
        applyThemeToDOM(patch.theme)
        localStorage.setItem(THEME_STORAGE_KEY, patch.theme)
      }
      if (patch.language) {
        applyLanguageToDOM(patch.language)
        localStorage.setItem(LANG_STORAGE_KEY, patch.language)
      }
      try {
        await AppService.saveSettings(updated)
      } catch (err) {
        console.error('保存设置失败:', err)
        // IPC 失败时回滚设置
        set({ settings: prev })
        applyThemeToDOM(prev.theme)
        localStorage.setItem(THEME_STORAGE_KEY, prev.theme)
        applyLanguageToDOM(prev.language)
        localStorage.setItem(LANG_STORAGE_KEY, prev.language)
      }
    },

    loadTagColors,

    setTagColor: async (tag: string, color: string) => {
      const prevColors = get().tagColors
      set({ tagColors: { ...prevColors, [tag]: color } })
      try {
        await AppService.setTagColor(tag, color)
      } catch (err) {
        console.error('设置标签颜色失败:', err)
        // IPC 失败时回滚到之前的颜色
        set({ tagColors: prevColors })
      }
    },

    handleFileCreated: (path: string) => {
      const { currentFolder } = get()
      if (currentFolder && path.startsWith(currentFolder)) {
        debouncedLoadNotes()
      }
    },

    handleFileModified: (path: string) => {
      const { activeNote, saveState, currentFolder } = get()
      // 当前正在编辑且有未保存内容时，跳过外部变更的重载以避免丢失用户编辑
      if (activeNote?.path === path && saveState === 'saved') {
        void openNote(path)
      }
      if (currentFolder && path.startsWith(currentFolder)) {
        debouncedLoadNotes()
      }
    },

    handleFileDeleted: (path: string) => {
      set((state) => {
        const notes = state.notes.filter((note) => note.path !== path)
        const activeNote = state.activeNote?.path === path ? null : state.activeNote
        return { notes, activeNote }
      })
    },
  }
})
