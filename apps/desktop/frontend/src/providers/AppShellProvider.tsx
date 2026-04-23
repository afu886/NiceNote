import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { useShallow } from 'zustand/react/shallow'

import type { AppShellContextValue, AppTagInfo } from '@nicenote/app-shell'
import { AppShellContext } from '@nicenote/app-shell'
import type { Language, Theme } from '@nicenote/shared'

import { AppService } from '../bindings/tauri'
import { useDesktopStore } from '../store/useDesktopStore'
import { useSidebarStore } from '../store/useSidebarStore'
import { useToastStore } from '../store/useToastStore'

// ============================================================
// Provider
// ============================================================

export function DesktopAppShellProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()

  const currentFolder = useDesktopStore((s) => s.currentFolder)
  const store = useDesktopStore(
    useShallow((s) => ({
      notes: s.notes,
      activeNote: s.activeNote,
      isLoading: s.isLoading,
      tagColors: s.tagColors,
      settings: s.settings,
      // actions
      openNote: s.openNote,
      saveNote: s.saveNote,
      renameNote: s.renameNote,
      createNote: s.createNote,
      deleteNote: s.deleteNote,
      saveSettings: s.saveSettings,
    }))
  )

  // 独立 stores
  const sidebar = useSidebarStore()
  const { toasts, addToast, removeToast } = useToastStore()

  const appNotes = useMemo<AppShellContextValue['notes']>(
    () =>
      store.notes.map((note) => ({
        id: note.path,
        title: note.title,
        summary: note.summary || null,
        tags: note.tags,
        updatedAt: note.updatedAt,
      })),
    [store.notes]
  )

  const currentNote = useMemo<AppShellContextValue['currentNote']>(() => {
    if (!store.activeNote) return null
    return {
      id: store.activeNote.path,
      title: store.activeNote.title,
      content: store.activeNote.content,
      tags: store.activeNote.tags,
      updatedAt: store.activeNote.updatedAt,
    }
  }, [store.activeNote])

  // 选中的笔记 ID
  const selectedNoteId = store.activeNote?.path ?? null

  // 标签信息
  const appTags: AppTagInfo[] = useMemo(() => {
    const tagCountMap = new Map<string, number>()
    for (const note of store.notes) {
      for (const tag of note.tags) {
        tagCountMap.set(tag, (tagCountMap.get(tag) ?? 0) + 1)
      }
    }
    return Array.from(tagCountMap.entries())
      .map(([name, count]) => ({
        name,
        color: store.tagColors[name],
        count,
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [store.notes, store.tagColors])

  // 选中笔记
  const selectNote = useCallback(
    (id: string | null) => {
      if (id) {
        store.openNote(id)
      }
    },
    [store.openNote]
  )

  // 更新笔记
  const updateNote = useCallback(
    (_id: string, patch: { title?: string; content?: string; tags?: string[] }) => {
      if (patch.title !== undefined) {
        store.renameNote(patch.title)
      }
      if (patch.content !== undefined || patch.tags !== undefined) {
        const activeNote = useDesktopStore.getState().activeNote
        if (!activeNote) return
        const content = patch.content ?? activeNote.content
        const tags = patch.tags ?? activeNote.tags
        store.saveNote(content, tags)
      }
    },
    [store.renameNote, store.saveNote]
  )

  // 创建笔记
  const handleCreateNote = useCallback(() => store.createNote(), [store.createNote])

  // 删除笔记
  const handleDeleteNote = useCallback(
    (id: string) => {
      if (window.confirm(t('noteList.confirmDelete'))) {
        return store.deleteNote(id)
      }
    },
    [store.deleteNote, t]
  )

  // 搜索
  const searchNotes = useCallback<AppShellContextValue['searchNotes']>(
    async (query) => {
      if (!query.trim() || !currentFolder) return []
      try {
        const results = await AppService.searchNotes(currentFolder, query)
        return results.slice(0, 20).map((result) => ({
          id: result.path,
          title: result.title,
          snippet: result.snippet,
        }))
      } catch (err) {
        console.error('搜索笔记失败:', err)
        return []
      }
    },
    [currentFolder]
  )

  // 主题和语言
  const setTheme = useCallback(
    (theme: Theme) => {
      store.saveSettings({ theme })
    },
    [store.saveSettings]
  )

  const setLanguage = useCallback(
    (lang: Language) => {
      store.saveSettings({ language: lang })
    },
    [store.saveSettings]
  )

  // 标签操作
  const noteTagActions = useMemo(
    () => ({
      addTag: (_noteId: string, tagName: string) => {
        const activeNote = useDesktopStore.getState().activeNote
        if (!activeNote) return
        if (!activeNote.tags.includes(tagName)) {
          store.saveNote(activeNote.content, [...activeNote.tags, tagName])
        }
      },
      removeTag: (_noteId: string, tagName: string) => {
        const activeNote = useDesktopStore.getState().activeNote
        if (!activeNote) return
        store.saveNote(
          activeNote.content,
          activeNote.tags.filter((t) => t !== tagName)
        )
      },
    }),
    [store.saveNote]
  )

  const value: AppShellContextValue = useMemo(
    () => ({
      notes: appNotes,
      selectedNoteId,
      isLoading: store.isLoading,
      currentNote,
      selectNote,
      createNote: handleCreateNote,
      deleteNote: handleDeleteNote,
      updateNote,
      sidebar,
      tags: appTags,
      noteTagActions,
      theme: store.settings.theme,
      setTheme,
      language: store.settings.language,
      setLanguage,
      toasts,
      addToast,
      removeToast,
      searchNotes,
    }),
    [
      appNotes,
      selectedNoteId,
      store.isLoading,
      currentNote,
      selectNote,
      handleCreateNote,
      handleDeleteNote,
      updateNote,
      sidebar,
      appTags,
      noteTagActions,
      store.settings.theme,
      setTheme,
      store.settings.language,
      setLanguage,
      toasts,
      addToast,
      removeToast,
      searchNotes,
    ]
  )

  return <AppShellContext.Provider value={value}>{children}</AppShellContext.Provider>
}
