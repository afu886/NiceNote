import { useEffect, useRef } from 'react'

export interface GlobalShortcutActions {
  onSearch: () => void
  onNewNote: () => void
  onToggleSidebar: () => void
  onShowHelp: () => void
}

function isInputElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}

export function useGlobalShortcuts(actions: GlobalShortcutActions) {
  // 用 ref 持有最新回调，避免 actions 对象变化时重复注册/注销事件监听器
  const actionsRef = useRef(actions)
  actionsRef.current = actions

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      const { onSearch, onNewNote, onToggleSidebar, onShowHelp } = actionsRef.current

      // Cmd+K — 搜索（在输入框中也生效）
      if (mod && e.key === 'k') {
        e.preventDefault()
        onSearch()
        return
      }

      // Cmd+N — 新建笔记
      if (mod && e.key === 'n') {
        e.preventDefault()
        onNewNote()
        return
      }

      // Cmd+\ — 切换侧边栏
      if (mod && e.key === '\\') {
        e.preventDefault()
        onToggleSidebar()
        return
      }

      // / — 显示快捷键帮助（仅在非输入框中）
      if (e.key === '/' && !mod && !e.shiftKey && !isInputElement(e.target)) {
        e.preventDefault()
        onShowHelp()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])
}
