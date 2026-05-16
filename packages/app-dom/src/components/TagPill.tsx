import { X } from 'lucide-react'

import { cn } from '@nicenote/ui'

export interface TagPillProps {
  /** 标签显示文本 */
  label: string
  /** 可选：标签颜色（hex） */
  color?: string | null
  /** 可选：移除按钮回调，不提供则不显示移除按钮 */
  onRemove?: () => void
  /** 移除按钮 aria-label */
  removeLabel?: string
  /** 额外 className */
  className?: string
}

export function TagPill({ label, color, onRemove, removeLabel, className }: TagPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs',
        !color && 'bg-accent text-accent-foreground',
        className
      )}
      style={
        color
          ? { backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`, color }
          : undefined
      }
    >
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="ml-0.5 rounded-full p-0.5 opacity-60 transition-opacity hover:opacity-100"
          aria-label={removeLabel ?? `移除 ${label}`}
        >
          <X className="size-3" />
        </button>
      )}
    </span>
  )
}
