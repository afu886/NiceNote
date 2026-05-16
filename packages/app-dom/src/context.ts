import { createContext, useContext } from 'react'

import type { SaveState, SystemCapabilities, Workspace } from '@nicenote/core'
import type { Language, Theme } from '@nicenote/shared'

import type { AppTagInfo, NoteTagActions, SidebarState, Toast, ToastOptions } from './types'

// ============================================================
// AppShell Context — 仅保留两端共享核心能力
// ============================================================

export interface AppShellContextValue {
  // ---- 笔记列表 ----
  notes: Array<{
    id: string
    title: string
    summary: string | null
    tags: string[]
    updatedAt: string
  }>
  selectedNoteId: string | null
  isLoading: boolean

  // ---- 当前笔记 ----
  currentNote: {
    id: string
    title: string
    content: string | null
    tags: string[]
    updatedAt: string
  } | null

  // ---- 笔记操作 ----
  selectNote: (id: string | null) => void
  createNote: () => void | Promise<void>
  deleteNote: (id: string) => void
  updateNote: (id: string, patch: { title?: string; content?: string; tags?: string[] }) => void

  // ---- 侧边栏 ----
  sidebar: SidebarState

  // ---- 标签 ----
  tags: AppTagInfo[]
  noteTagActions: NoteTagActions

  // ---- 主题 ----
  theme: Theme
  setTheme: (theme: Theme) => void

  // ---- 语言 ----
  language: Language
  setLanguage: (lang: Language) => void

  // ---- Toast ----
  toasts: Toast[]
  addToast: (message: string, options?: ToastOptions) => string
  removeToast: (id: string) => void

  // ---- 搜索 ----
  searchNotes: (query: string) => Promise<
    Array<{
      id: string
      title: string
      snippet: string
    }>
  >

  // ---- 能力发现 & 统一产品能力（由 NiceNoteApp 消费，平台只走能力位）----
  capabilities: SystemCapabilities
  saveState: SaveState
  favorites: string[]
  toggleFavorite: (id: string) => void
  currentWorkspace: Workspace | null
  recentWorkspaces: Workspace[]
  pickWorkspace: () => void | Promise<void>
  openWorkspace: (id: string) => void | Promise<void>
  /** importExport 能力 available 时提供（导入 Markdown 文件，返回成功数量） */
  importMarkdownFiles?: (files: File[]) => Promise<number>
}

export const AppShellContext = createContext<AppShellContextValue | null>(null)

/** 获取 AppShell Context，必须在 AppShellProvider 内使用 */
export function useAppShell(): AppShellContextValue {
  const ctx = useContext(AppShellContext)
  if (!ctx) {
    throw new Error('useAppShell 必须在 AppShellProvider 内使用')
  }
  return ctx
}
