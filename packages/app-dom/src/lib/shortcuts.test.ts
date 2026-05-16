import { describe, expect, it } from 'vitest'

import type { ShortcutDefinition } from './shortcuts'
import { formatShortcut, matchesShortcut, SHORTCUTS } from './shortcuts'

describe('matchesShortcut', () => {
  function makeEvent(overrides: Partial<KeyboardEvent>): KeyboardEvent {
    return {
      key: '',
      metaKey: false,
      ctrlKey: false,
      shiftKey: false,
      ...overrides,
    } as KeyboardEvent
  }

  it('匹配 meta 快捷键（metaKey）', () => {
    const shortcut: ShortcutDefinition = {
      key: 'k',
      meta: true,
      label: 'search',
      category: 'general',
    }
    expect(matchesShortcut(makeEvent({ key: 'k', metaKey: true }), shortcut)).toBe(true)
  })

  it('匹配 meta 快捷键（ctrlKey）', () => {
    const shortcut: ShortcutDefinition = {
      key: 'k',
      meta: true,
      label: 'search',
      category: 'general',
    }
    expect(matchesShortcut(makeEvent({ key: 'k', ctrlKey: true }), shortcut)).toBe(true)
  })

  it('meta 快捷键未按下 mod 键时不匹配', () => {
    const shortcut: ShortcutDefinition = {
      key: 'k',
      meta: true,
      label: 'search',
      category: 'general',
    }
    expect(matchesShortcut(makeEvent({ key: 'k' }), shortcut)).toBe(false)
  })

  it('非 meta 快捷键按下 mod 键时不匹配', () => {
    const shortcut: ShortcutDefinition = { key: '/', label: 'help', category: 'general' }
    expect(matchesShortcut(makeEvent({ key: '/', metaKey: true }), shortcut)).toBe(false)
  })

  it('匹配普通快捷键', () => {
    const shortcut: ShortcutDefinition = { key: '/', label: 'help', category: 'general' }
    expect(matchesShortcut(makeEvent({ key: '/' }), shortcut)).toBe(true)
  })

  it('shift 快捷键未按 shift 时不匹配', () => {
    const shortcut: ShortcutDefinition = {
      key: 'p',
      meta: true,
      shift: true,
      label: 'test',
      category: 'general',
    }
    expect(matchesShortcut(makeEvent({ key: 'p', metaKey: true }), shortcut)).toBe(false)
  })

  it('shift 快捷键按下 shift 时匹配', () => {
    const shortcut: ShortcutDefinition = {
      key: 'p',
      meta: true,
      shift: true,
      label: 'test',
      category: 'general',
    }
    expect(matchesShortcut(makeEvent({ key: 'p', metaKey: true, shiftKey: true }), shortcut)).toBe(
      true
    )
  })

  it('key 不匹配时返回 false', () => {
    const shortcut: ShortcutDefinition = {
      key: 'k',
      meta: true,
      label: 'search',
      category: 'general',
    }
    expect(matchesShortcut(makeEvent({ key: 'n', metaKey: true }), shortcut)).toBe(false)
  })
})

describe('formatShortcut', () => {
  it('格式化 meta 快捷键', () => {
    const shortcut: ShortcutDefinition = {
      key: 'k',
      meta: true,
      label: 'search',
      category: 'general',
    }
    const result = formatShortcut(shortcut)
    // 根据平台返回 ⌘K 或 Ctrl+K
    expect(result).toMatch(/K/)
  })

  it('格式化反斜杠键', () => {
    const shortcut: ShortcutDefinition = {
      key: '\\',
      meta: true,
      label: 'toggle',
      category: 'general',
    }
    const result = formatShortcut(shortcut)
    expect(result).toContain('\\')
  })

  it('格式化普通键', () => {
    const shortcut: ShortcutDefinition = { key: '/', label: 'help', category: 'general' }
    const result = formatShortcut(shortcut)
    expect(result).toBe('/')
  })
})

describe('SHORTCUTS', () => {
  it('包含搜索快捷键', () => {
    const search = SHORTCUTS.find((s) => s.key === 'k' && s.meta)
    expect(search).toBeDefined()
  })

  it('包含新建笔记快捷键', () => {
    const newNote = SHORTCUTS.find((s) => s.key === 'n' && s.meta)
    expect(newNote).toBeDefined()
  })

  it('所有快捷键都有 label 和 category', () => {
    for (const s of SHORTCUTS) {
      expect(s.label).toBeTruthy()
      expect(['general', 'editor']).toContain(s.category)
    }
  })
})
