import { Dropdown } from '@topicly-ui/react'
import { ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '../lib/cn'
import type { NoteToolbarItem } from '../preset-note/toolbar-config'

import { EditorToolbarButton } from './EditorToolbarButton'

const DROPDOWN_ITEM_CLASS =
  'flex w-full min-w-40 items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm'

export interface CommandDropdownOptionRenderState {
  key: string
  label: string
  shortcut?: string
  disabled: boolean
  active: boolean
  icon: ReactNode
  onSelect: () => void
}

interface DropdownItemLike {
  key: string
  label: ReactNode
  textValue: string
  isDisabled: boolean
}

/**
 * 把 options 经 resolveOption 映射为 topicly Dropdown 的数据驱动 items + 派发表。
 * 纯函数，便于单测（不依赖 DOM/React 渲染）。
 */
export function buildDropdownItems(
  options: readonly NoteToolbarItem[],
  resolveOption: (option: NoteToolbarItem) => CommandDropdownOptionRenderState | null
): { items: DropdownItemLike[]; actionByKey: Map<string, () => void> } {
  const items: DropdownItemLike[] = []
  const actionByKey = new Map<string, () => void>()
  for (const option of options) {
    const r = resolveOption(option)
    if (!r) continue
    actionByKey.set(r.key, r.onSelect)
    items.push({
      key: r.key,
      isDisabled: r.disabled,
      textValue: r.label,
      label: (
        <span className={cn(DROPDOWN_ITEM_CLASS, r.active && 'bg-accent text-accent-foreground')}>
          <span className="flex items-center gap-2">
            {r.icon}
            <span>{r.label}</span>
          </span>
          {r.shortcut ? (
            <span className="text-meta text-muted-foreground">{r.shortcut}</span>
          ) : null}
        </span>
      ),
    })
  }
  return { items, actionByKey }
}

export function CommandDropdownMenu({
  triggerLabel,
  triggerIcon,
  triggerActive,
  triggerDisabled,
  isMobile,
  options,
  resolveOption,
}: {
  triggerLabel: string
  triggerIcon: ReactNode
  triggerActive: boolean
  triggerDisabled: boolean
  isMobile: boolean
  options: readonly NoteToolbarItem[]
  resolveOption: (option: NoteToolbarItem) => CommandDropdownOptionRenderState | null
}) {
  const { items, actionByKey } = buildDropdownItems(options, resolveOption)

  return (
    <Dropdown
      items={items}
      placement="top-start"
      onAction={(key) => actionByKey.get(String(key))?.()}
    >
      <EditorToolbarButton
        label={triggerLabel}
        isMobile={isMobile}
        active={triggerActive}
        disabled={triggerDisabled}
        icon={
          <>
            {triggerIcon}
            <ChevronDown className="nn-editor-toolbar-icon opacity-70" />
          </>
        }
      />
    </Dropdown>
  )
}
