import { createStore } from 'zustand/vanilla'

import type {
  AppRuntime,
  Language,
  SaveState,
  SystemCapabilities,
  Theme,
  Workspace,
} from '@nicenote/core'
import { asNoteId, asWorkspaceId, createNoteUsecases, createTagUsecases } from '@nicenote/core'

import { applyLanguageToDOM } from '../lib/apply-language'
import { applyThemeToDOM } from '../lib/apply-theme'
import { logError } from '../lib/logger'
import type { AppTagInfo, Toast, ToastOptions } from '../types'

const SIDEBAR_MIN_WIDTH = 260
const SIDEBAR_MAX_WIDTH = 560
const SIDEBAR_DEFAULT_WIDTH = 320
const SIDEBAR_WIDTH_KEY = 'nicenote-sidebar-width'
const SIDEBAR_OPEN_KEY = 'nicenote-sidebar-open'

export interface ContextNote {
  id: string
  title: string
  summary: string | null
  tags: string[]
  updatedAt: string
}

export interface CurrentNote {
  id: string
  title: string
  content: string | null
  tags: string[]
  updatedAt: string
}

export interface AppState {
  // 笔记
  notes: ContextNote[]
  selectedNoteId: string | null
  currentNote: CurrentNote | null
  isLoading: boolean
  saveState: SaveState
  // 标签
  tags: AppTagInfo[]
  // 主题/语言
  theme: Theme
  language: Language
  // 侧栏
  sidebarOpen: boolean
  sidebarWidth: number
  sidebarResizing: boolean
  // toast
  toasts: Toast[]
  // 收藏 / 工作区 / 能力
  favorites: string[]
  currentWorkspace: Workspace | null
  recentWorkspaces: Workspace[]
  capabilities: SystemCapabilities

  // actions
  init(): Promise<void>
  reloadNotes(): Promise<void>
  selectNote(id: string | null): void
  createNote(): Promise<void>
  updateNote(id: string, patch: { title?: string; content?: string; tags?: string[] }): void
  deleteNote(id: string): Promise<void>
  searchNotes(query: string): Promise<Array<{ id: string; title: string; snippet: string }>>
  addTag(noteId: string, name: string): void
  removeTag(noteId: string, name: string): void
  setTheme(theme: Theme): void
  setLanguage(language: Language): void
  addToast(message: string, options?: ToastOptions): string
  removeToast(id: string): void
  sidebarOpenAction(): void
  sidebarCloseAction(): void
  sidebarToggle(): void
  sidebarSetWidth(width: number): void
  sidebarStartResize(): void
  sidebarStopResize(): void
  toggleFavorite(id: string): Promise<void>
  pickWorkspace(): Promise<void>
  openWorkspace(id: string): Promise<void>
  refreshFromExternalChange(): Promise<void>
}

export type AppStore = ReturnType<typeof createAppStore>

/**
 * NiceNote 统一视图状态（Web/Desktop 共用），构建在注入的 AppRuntime + core usecase 之上。
 * 取代 apps/web/src/store/*、apps/desktop/.../useDesktopStore、app-dom/store/* 三处状态源。
 */
export function createAppStore(runtime: AppRuntime) {
  const noteUsecases = createNoteUsecases(runtime)
  const tagUsecases = createTagUsecases(runtime)

  // toast 定时器表（与原 create-toast-store 等价）
  let nextToastId = 0
  const toastTimers = new Map<string, ReturnType<typeof setTimeout>>()

  // 系统主题媒体监听（与原 useSettingsStore 等价）
  let mediaQuery: MediaQueryList | null = null
  let mediaListener: (() => void) | null = null
  const cleanupSystemListener = () => {
    if (mediaQuery && mediaListener) {
      mediaQuery.removeEventListener('change', mediaListener)
      mediaQuery = null
      mediaListener = null
    }
  }
  const setupSystemListener = () => {
    if (typeof window === 'undefined') return
    cleanupSystemListener()
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaListener = () => applyThemeToDOM('system')
    mediaQuery.addEventListener('change', mediaListener)
  }

  const loadSidebarWidth = (): number => {
    const raw = runtime.prefs.get(SIDEBAR_WIDTH_KEY)
    const n = raw ? Number(raw) : NaN
    return n >= SIDEBAR_MIN_WIDTH && n <= SIDEBAR_MAX_WIDTH ? n : SIDEBAR_DEFAULT_WIDTH
  }
  const loadSidebarOpen = (): boolean => runtime.prefs.get(SIDEBAR_OPEN_KEY) !== 'false'

  const store = createStore<AppState>()((set, get) => {
    /** 把 NoteSummary 列表 + 每条标签解析为 UI 用的 ContextNote[]，并计算标签计数 */
    const projectNotes = async () => {
      const summaries = await noteUsecases.list()
      const allTags = await tagUsecases.listTags()
      const colorByName = new Map<string, string>()
      const settings = await runtime.settings.load()
      for (const [name, color] of Object.entries(settings.tagColors)) {
        colorByName.set(name, color)
      }
      const tagNamesByNote = await Promise.all(summaries.map((s) => tagUsecases.tagsOfNames(s.id)))
      const notes: ContextNote[] = summaries.map((s, i) => ({
        id: s.id,
        title: s.title,
        summary: s.summary,
        tags: tagNamesByNote[i] ?? [],
        updatedAt: s.updatedAt,
      }))
      const countByName = new Map<string, number>()
      for (const names of tagNamesByNote) {
        for (const n of names) countByName.set(n, (countByName.get(n) ?? 0) + 1)
      }
      const tags: AppTagInfo[] = allTags
        .map((t) => ({
          name: t.name,
          color: colorByName.get(t.name),
          count: countByName.get(t.name) ?? 0,
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
      set({ notes, tags })
    }

    const refreshFavorites = async () => {
      const list = runtime.system.listFavorites ? await runtime.system.listFavorites() : []
      set({ favorites: list.map((r) => String(r.id)) })
    }

    const refreshWorkspace = async () => {
      const [current, recent] = await Promise.all([
        runtime.workspaces.current(),
        runtime.workspaces.recent(),
      ])
      set({ currentWorkspace: current, recentWorkspaces: recent })
    }

    // 文件监听变更的合并重载（等价原 useDesktopStore debouncedLoadNotes 100ms）
    let reloadTimer: ReturnType<typeof setTimeout> | null = null
    const scheduleExternalReload = () => {
      if (reloadTimer) clearTimeout(reloadTimer)
      reloadTimer = setTimeout(() => {
        reloadTimer = null
        void projectNotes()
      }, 100)
    }

    let watchStarted = false
    const startWatchIfSupported = async () => {
      if (watchStarted) return
      if (runtime.system.capabilities.fileWatch !== 'available') return
      if (!runtime.workspaces.watch) return
      watchStarted = true
      await runtime.workspaces.watch({
        onNoteCreated: () => scheduleExternalReload(),
        onNoteChanged: (id) => {
          scheduleExternalReload()
          const { selectedNoteId, saveState } = get()
          // 当前正在编辑且有未保存内容时跳过外部重载，避免覆盖用户编辑
          if (selectedNoteId && String(id) === selectedNoteId && saveState === 'saved') {
            get().selectNote(selectedNoteId)
          }
        },
        onNoteDeleted: (id) => {
          scheduleExternalReload()
          set((state) => ({
            selectedNoteId: state.selectedNoteId === String(id) ? null : state.selectedNoteId,
            currentNote: state.currentNote?.id === String(id) ? null : state.currentNote,
          }))
        },
      })
    }

    return {
      notes: [],
      selectedNoteId: null,
      currentNote: null,
      isLoading: true,
      saveState: 'saved',
      tags: [],
      theme: 'system',
      language: 'en',
      sidebarOpen: loadSidebarOpen(),
      sidebarWidth: loadSidebarWidth(),
      sidebarResizing: false,
      toasts: [],
      favorites: [],
      currentWorkspace: null,
      recentWorkspaces: [],
      capabilities: runtime.system.capabilities,

      init: async () => {
        const settings = await runtime.settings.load()
        applyThemeToDOM(settings.theme)
        applyLanguageToDOM(settings.language)
        if (settings.theme === 'system') setupSystemListener()
        set({ theme: settings.theme, language: settings.language })
        await refreshWorkspace()
        set({ isLoading: true })
        try {
          await projectNotes()
        } finally {
          set({ isLoading: false })
        }
        await refreshFavorites()
        await startWatchIfSupported()
      },

      reloadNotes: async () => {
        set({ isLoading: true })
        try {
          await projectNotes()
        } finally {
          set({ isLoading: false })
        }
      },

      refreshFromExternalChange: async () => {
        await projectNotes()
        const { selectedNoteId } = get()
        if (selectedNoteId) {
          const note = await noteUsecases.get(asNoteId(selectedNoteId))
          if (note) {
            const names = await tagUsecases.tagsOfNames(note.id)
            set({
              currentNote: {
                id: note.id,
                title: note.title,
                content: note.content,
                tags: names,
                updatedAt: note.updatedAt,
              },
            })
          }
        }
      },

      selectNote: (id) => {
        if (!id) {
          set({ selectedNoteId: null, currentNote: null })
          return
        }
        set({ selectedNoteId: id })
        void (async () => {
          const note = await noteUsecases.get(asNoteId(id))
          if (!note) {
            set({ currentNote: null })
            return
          }
          const names = await tagUsecases.tagsOfNames(note.id)
          set({
            currentNote: {
              id: note.id,
              title: note.title,
              content: note.content,
              tags: names,
              updatedAt: note.updatedAt,
            },
          })
        })()
      },

      createNote: async () => {
        const note = await noteUsecases.create({ title: '' })
        await projectNotes()
        get().selectNote(note.id)
      },

      updateNote: (id, patch) => {
        const noteId = asNoteId(id)
        // 乐观更新当前笔记与列表
        set((state) => {
          const current =
            state.currentNote && state.currentNote.id === id
              ? {
                  ...state.currentNote,
                  ...(patch.title !== undefined ? { title: patch.title } : {}),
                  ...(patch.content !== undefined ? { content: patch.content } : {}),
                  ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
                  updatedAt: new Date().toISOString(),
                }
              : state.currentNote
          const notes = state.notes
            .map((n) =>
              n.id === id
                ? {
                    ...n,
                    ...(patch.title !== undefined ? { title: patch.title } : {}),
                    ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
                    updatedAt: new Date().toISOString(),
                  }
                : n
            )
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
          return { currentNote: current, notes }
        })

        set({ saveState: 'saving' })
        void (async () => {
          try {
            if (patch.title !== undefined || patch.content !== undefined) {
              await noteUsecases.update(noteId, {
                ...(patch.title !== undefined ? { title: patch.title } : {}),
                ...(patch.content !== undefined ? { content: patch.content } : {}),
              })
            }
            if (patch.tags !== undefined) {
              const currentNames = await tagUsecases.tagsOfNames(noteId)
              const next = new Set(patch.tags)
              const prev = new Set(currentNames)
              for (const name of patch.tags) {
                if (!prev.has(name)) await tagUsecases.addByName(noteId, name)
              }
              for (const name of currentNames) {
                if (!next.has(name)) await tagUsecases.removeByName(noteId, name)
              }
            }
            set({ saveState: 'saved' })
            await projectNotes()
          } catch (err) {
            logError('note-save', err)
            set({ saveState: 'unsaved' })
          }
        })()
      },

      deleteNote: async (id) => {
        await noteUsecases.remove(asNoteId(id))
        set((state) => ({
          selectedNoteId: state.selectedNoteId === id ? null : state.selectedNoteId,
          currentNote: state.currentNote?.id === id ? null : state.currentNote,
        }))
        await projectNotes()
      },

      searchNotes: async (query) => {
        if (!query.trim()) return []
        const hits = await runtime.search.search({ q: query, limit: 20 })
        return hits.map((h) => ({ id: String(h.id), title: h.title, snippet: h.snippet }))
      },

      addTag: (noteId, name) => {
        void (async () => {
          await tagUsecases.addByName(asNoteId(noteId), name)
          await projectNotes()
          const { selectedNoteId } = get()
          if (selectedNoteId) get().selectNote(selectedNoteId)
        })()
      },

      removeTag: (noteId, name) => {
        void (async () => {
          await tagUsecases.removeByName(asNoteId(noteId), name)
          await projectNotes()
          const { selectedNoteId } = get()
          if (selectedNoteId) get().selectNote(selectedNoteId)
        })()
      },

      setTheme: (theme) => {
        if (theme === 'system') setupSystemListener()
        else cleanupSystemListener()
        applyThemeToDOM(theme)
        set({ theme })
        void runtime.settings.save({ theme })
      },

      setLanguage: (language) => {
        applyLanguageToDOM(language)
        set({ language })
        void runtime.settings.save({ language })
      },

      addToast: (message, options) => {
        const id = String(++nextToastId)
        const duration = options?.duration ?? 5000
        set((state) => ({
          toasts: [
            ...state.toasts,
            {
              id,
              message,
              ...(options?.action !== undefined ? { action: options.action } : {}),
            },
          ],
        }))
        const timer = setTimeout(() => {
          toastTimers.delete(id)
          set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
        }, duration)
        toastTimers.set(id, timer)
        return id
      },

      removeToast: (id) => {
        const timer = toastTimers.get(id)
        if (timer !== undefined) {
          clearTimeout(timer)
          toastTimers.delete(id)
        }
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
      },

      sidebarOpenAction: () => {
        runtime.prefs.set(SIDEBAR_OPEN_KEY, 'true')
        set({ sidebarOpen: true })
      },
      sidebarCloseAction: () => {
        runtime.prefs.set(SIDEBAR_OPEN_KEY, 'false')
        set({ sidebarOpen: false })
      },
      sidebarToggle: () =>
        set((s) => {
          const next = !s.sidebarOpen
          runtime.prefs.set(SIDEBAR_OPEN_KEY, String(next))
          return { sidebarOpen: next }
        }),
      sidebarSetWidth: (width) => {
        const clamped = Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, width))
        set({ sidebarWidth: clamped })
        runtime.prefs.set(SIDEBAR_WIDTH_KEY, String(clamped))
      },
      sidebarStartResize: () => set({ sidebarResizing: true }),
      sidebarStopResize: () => set({ sidebarResizing: false }),

      toggleFavorite: async (id) => {
        if (!runtime.system.toggleFavorite) return
        await runtime.system.toggleFavorite({ id: asNoteId(id) })
        await refreshFavorites()
      },

      pickWorkspace: async () => {
        if (!runtime.system.pickWorkspaceFolder) return
        const ref = await runtime.system.pickWorkspaceFolder()
        if (!ref) return
        await runtime.workspaces.open(ref)
        await refreshWorkspace()
        await get().reloadNotes()
        await refreshFavorites()
      },

      openWorkspace: async (id) => {
        await runtime.workspaces.open({ id: asWorkspaceId(id) })
        await refreshWorkspace()
        await get().reloadNotes()
        await refreshFavorites()
      },
    }
  })

  return store
}
