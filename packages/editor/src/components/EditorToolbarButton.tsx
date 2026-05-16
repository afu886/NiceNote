import { Toolbar } from '@topicly-ui/react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface EditorToolbarButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'type' | 'className' | 'style' | 'aria-label'
> {
  label: string
  shortcut?: string
  isMobile: boolean
  active: boolean
  disabled: boolean
  icon: ReactNode
}

/**
 * 编辑器工具栏按钮适配器（editor 专属）。
 *
 * 包 @topicly-ui/react 的 Toolbar.Button（保证参与 topicly roving 键盘导航）。
 * data-active-state → isSelected（topicly 设 aria-pressed，a11y 提升）；
 * !isMobile 时用原生 title 提示（不嵌 topicly Tooltip，避免 button 套 button 非法 HTML）。
 * 透传 rest（含 Dropdown 触发器注入的 onClick/aria-expanded）。
 */
export function EditorToolbarButton({
  label,
  shortcut,
  isMobile,
  active,
  disabled,
  icon,
  ...rest
}: EditorToolbarButtonProps) {
  return (
    <Toolbar.Button
      aria-label={label}
      isSelected={active}
      isDisabled={disabled}
      title={!isMobile ? label : undefined}
      {...(shortcut ? { 'aria-keyshortcuts': shortcut } : {})}
      {...rest}
    >
      {icon}
    </Toolbar.Button>
  )
}
