/** 标签信息 */
export interface AppTagInfo {
  name: string
  color?: string | undefined
  count: number
}

// ============================================================
// Toast
// ============================================================

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface Toast {
  id: string
  message: string
  action?: ToastAction
}

export interface ToastOptions {
  action?: ToastAction
  duration?: number
}

// ============================================================
// 侧边栏
// ============================================================

export interface SidebarState {
  isOpen: boolean
  width: number
  isResizing: boolean
  open: () => void
  close: () => void
  toggle: () => void
  setWidth: (width: number) => void
  startResize: () => void
  stopResize: () => void
}

// ============================================================
// 标签操作
// ============================================================

export interface NoteTagActions {
  addTag: (noteId: string, tagName: string) => void
  removeTag: (noteId: string, tagName: string) => void
}
