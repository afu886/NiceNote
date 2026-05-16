import { isMac } from '@nicenote/shared'

export interface ShortcutDefinition {
  key: string
  meta?: boolean
  shift?: boolean
  label: string
  category: 'general' | 'editor'
}

export const MOD_KEY_LABEL = isMac() ? '\u2318' : 'Ctrl'

export const SHORTCUTS: ShortcutDefinition[] = [
  { key: 'k', meta: true, label: 'shortcuts.search', category: 'general' },
  { key: 'n', meta: true, label: 'shortcuts.newNote', category: 'general' },
  { key: 's', meta: true, label: 'shortcuts.forceSave', category: 'general' },
  { key: '\\', meta: true, label: 'shortcuts.toggleSidebar', category: 'general' },
  { key: '/', label: 'shortcuts.showHelp', category: 'general' },
]

export function matchesShortcut(e: KeyboardEvent, shortcut: ShortcutDefinition): boolean {
  const modPressed = e.metaKey || e.ctrlKey
  if (shortcut.meta && !modPressed) return false
  if (!shortcut.meta && modPressed) return false
  if (shortcut.shift && !e.shiftKey) return false
  return e.key === shortcut.key
}

export function formatShortcut(shortcut: ShortcutDefinition): string {
  const mac = isMac()
  const parts: string[] = []
  if (shortcut.meta) parts.push(MOD_KEY_LABEL)
  if (shortcut.shift) parts.push('Shift')
  parts.push(shortcut.key === '\\' ? '\\' : shortcut.key.toUpperCase())
  return parts.join(mac ? '' : '+')
}
