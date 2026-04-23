import { invoke } from '@tauri-apps/api/core'

import type { Settings } from '@nicenote/shared'

export type { Settings } from '@nicenote/shared'

// ============================================================
// 数据类型
// ============================================================

export interface NoteFile {
  path: string
  title: string
  summary: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface NoteContent extends NoteFile {
  content: string
  rawContent: string
}

export interface FolderNode {
  path: string
  name: string
  children: FolderNode[]
  noteCount: number
}

export interface SearchResult {
  path: string
  title: string
  snippet: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

// ============================================================
// AppService IPC 方法（Tauri invoke，字符串命令名）
// ============================================================

export const AppService = {
  openFolderDialog: (): Promise<string> => invoke('open_folder_dialog'),

  getRecentFolders: (): Promise<string[]> => invoke('get_recent_folders'),

  addRecentFolder: (path: string): Promise<void> => invoke('add_recent_folder', { path }),

  revealInExplorer: (path: string): Promise<void> => invoke('reveal_in_explorer', { path }),

  listNotes: (folderPath: string): Promise<NoteFile[]> => invoke('list_notes', { folderPath }),

  getNoteContent: (path: string): Promise<NoteContent> => invoke('get_note_content', { path }),

  saveNote: (path: string, content: string, tags: string[]): Promise<void> =>
    invoke('save_note', { path, content, tags }),

  createNote: (folderPath: string): Promise<NoteFile> => invoke('create_note', { folderPath }),

  renameNote: (oldPath: string, newTitle: string): Promise<NoteFile> =>
    invoke('rename_note', { oldPath, newTitle }),

  deleteNote: (path: string): Promise<void> => invoke('delete_note', { path }),

  searchNotes: (folderPath: string, query: string): Promise<SearchResult[]> =>
    invoke('search_notes', { folderPath, query }),

  getFolderTree: (rootPath: string): Promise<FolderNode> => invoke('get_folder_tree', { rootPath }),

  watchFolder: (folderPath: string): Promise<void> => invoke('watch_folder', { folderPath }),

  getSettings: (): Promise<Settings> => invoke('get_settings'),

  saveSettings: (settings: Settings): Promise<void> => invoke('save_settings', { settings }),

  getTagColors: (): Promise<Record<string, string>> => invoke('get_tag_colors'),

  setTagColor: (tag: string, color: string): Promise<void> =>
    invoke('set_tag_color', { tag, color }),

  getFavorites: (): Promise<string[]> => invoke('get_favorites'),

  toggleFavorite: (path: string): Promise<void> => invoke('toggle_favorite', { path }),
}
