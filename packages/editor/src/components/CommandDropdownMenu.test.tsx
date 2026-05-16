import { describe, expect, it, vi } from 'vitest'

import type { NoteToolbarItem } from '../preset-note/toolbar-config'

import { buildDropdownItems, type CommandDropdownOptionRenderState } from './CommandDropdownMenu'

const options = [
  { id: 'heading1', labelKey: 'heading1' },
  { id: 'heading2', labelKey: 'heading2' },
] as unknown as readonly NoteToolbarItem[]

describe('buildDropdownItems', () => {
  it('映射 options→items 并保留 key/textValue/disabled，onAction 触发对应 onSelect', () => {
    const h1 = vi.fn()
    const h2 = vi.fn()
    const resolve = (o: NoteToolbarItem): CommandDropdownOptionRenderState | null => {
      const id = (o as unknown as { id: string }).id
      if (id === 'heading1') {
        return {
          key: 'heading1',
          label: 'Heading 1',
          disabled: false,
          active: true,
          icon: null,
          onSelect: h1,
        }
      }
      return {
        key: 'heading2',
        label: 'Heading 2',
        disabled: true,
        active: false,
        icon: null,
        onSelect: h2,
        shortcut: 'Mod+Alt+2',
      }
    }

    const { items, actionByKey } = buildDropdownItems(options, resolve)
    expect(items.map((i) => i.key)).toEqual(['heading1', 'heading2'])
    expect(items.map((i) => i.textValue)).toEqual(['Heading 1', 'Heading 2'])
    expect(items.map((i) => i.isDisabled)).toEqual([false, true])

    actionByKey.get('heading1')?.()
    expect(h1).toHaveBeenCalledTimes(1)
    expect(h2).not.toHaveBeenCalled()
  })

  it('resolveOption 返回 null 的项被跳过', () => {
    const { items } = buildDropdownItems(options, () => null)
    expect(items).toHaveLength(0)
  })
})
