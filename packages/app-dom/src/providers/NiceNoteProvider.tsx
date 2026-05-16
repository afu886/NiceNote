import { useEffect, useMemo, useRef, useState } from 'react'

import { useStore } from 'zustand'

import type { AppRuntime } from '@nicenote/core'

import type { AppShellContextValue } from '../context'
import { AppShellContext } from '../context'
import { createAppStore } from '../state/app-store'

/**
 * NiceNote 统一 Provider（Web/Desktop 共用）。
 *
 * 接收注入的 AppRuntime，构建唯一视图 store，并以既有 AppShellContextValue 形态
 * 暴露给所有产品组件（NotesSidebar/NoteEditorPane/SettingsDropdown/...），
 * 取代 Web/DesktopAppShellProvider 两套手搓映射。
 */
export function NiceNoteProvider({
  runtime,
  children,
}: {
  runtime: AppRuntime
  children: React.ReactNode
}) {
  const [store] = useState(() => createAppStore(runtime))
  const state = useStore(store)
  const initedRef = useRef(false)

  const initFn = store.getState().init
  useEffect(() => {
    if (initedRef.current) return
    initedRef.current = true
    void initFn()
  }, [initFn])

  const value = useMemo<AppShellContextValue>(
    () => ({
      notes: state.notes,
      selectedNoteId: state.selectedNoteId,
      isLoading: state.isLoading,
      currentNote: state.currentNote,
      selectNote: state.selectNote,
      createNote: state.createNote,
      deleteNote: state.deleteNote,
      updateNote: state.updateNote,
      sidebar: {
        isOpen: state.sidebarOpen,
        width: state.sidebarWidth,
        isResizing: state.sidebarResizing,
        open: state.sidebarOpenAction,
        close: state.sidebarCloseAction,
        toggle: state.sidebarToggle,
        setWidth: state.sidebarSetWidth,
        startResize: state.sidebarStartResize,
        stopResize: state.sidebarStopResize,
      },
      tags: state.tags,
      noteTagActions: {
        addTag: state.addTag,
        removeTag: state.removeTag,
      },
      theme: state.theme,
      setTheme: state.setTheme,
      language: state.language,
      setLanguage: state.setLanguage,
      toasts: state.toasts,
      addToast: state.addToast,
      removeToast: state.removeToast,
      searchNotes: state.searchNotes,
      capabilities: state.capabilities,
      saveState: state.saveState,
      favorites: state.favorites,
      toggleFavorite: state.toggleFavorite,
      currentWorkspace: state.currentWorkspace,
      recentWorkspaces: state.recentWorkspaces,
      pickWorkspace: state.pickWorkspace,
      openWorkspace: state.openWorkspace,
      ...(runtime.system.importMarkdownFiles
        ? { importMarkdownFiles: runtime.system.importMarkdownFiles.bind(runtime.system) }
        : {}),
    }),
    [state, runtime]
  )

  return <AppShellContext.Provider value={value}>{children}</AppShellContext.Provider>
}
