import type { ReactNode } from 'react'

import { EditorToolbarButton } from './EditorToolbarButton'

export function ActionToolbarButton({
  label,
  shortcut,
  isMobile,
  active,
  disabled,
  onClick,
  icon,
}: {
  label: string
  shortcut?: string
  isMobile: boolean
  active: boolean
  disabled: boolean
  onClick: () => void
  icon: ReactNode
}) {
  return (
    <EditorToolbarButton
      label={label}
      isMobile={isMobile}
      active={active}
      disabled={disabled}
      onClick={onClick}
      icon={icon}
      {...(shortcut ? { shortcut } : {})}
    />
  )
}
