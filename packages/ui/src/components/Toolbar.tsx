import { forwardRef, useCallback, useEffect, useRef, useState } from 'react'

import { useComposedRef } from '../hooks/useComposedRef'
import { cn } from '../lib/utils'

type BaseProps = React.HTMLAttributes<HTMLDivElement>

interface ToolbarProps extends BaseProps {
  variant?: 'floating' | 'fixed'
}

const useToolbarNavigation = (toolbarRef: React.RefObject<HTMLDivElement | null>) => {
  const [items, setItems] = useState<HTMLElement[]>([])
  const [selectedIndex, setSelectedIndex] = useState<number>(-1)

  const collectItems = useCallback(() => {
    if (!toolbarRef.current) return []
    return Array.from(
      toolbarRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [role="button"]:not([disabled]), [tabindex="0"]:not([disabled])'
      )
    )
  }, [toolbarRef])

  useEffect(() => {
    const toolbar = toolbarRef.current
    if (!toolbar) return

    const updateItems = () => setItems(collectItems())

    updateItems()
    const observer = new MutationObserver(updateItems)
    observer.observe(toolbar, { childList: true, subtree: true })

    return () => observer.disconnect()
  }, [collectItems, toolbarRef])

  useEffect(() => {
    const toolbar = toolbarRef.current
    if (!toolbar) return

    const handleKeyboardNavigation = (event: KeyboardEvent) => {
      if (!items.length) return

      const moveNext = () =>
        setSelectedIndex((currentIndex) => {
          if (currentIndex === -1) return 0
          return (currentIndex + 1) % items.length
        })

      const movePrev = () =>
        setSelectedIndex((currentIndex) => {
          if (currentIndex === -1) return items.length - 1
          return (currentIndex - 1 + items.length) % items.length
        })

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault()
          movePrev()
          break
        case 'ArrowRight':
          event.preventDefault()
          moveNext()
          break
        case 'Home':
          event.preventDefault()
          setSelectedIndex(0)
          break
        case 'End':
          event.preventDefault()
          setSelectedIndex(items.length - 1)
          break
        case 'Enter':
          if (event.isComposing) return
          event.preventDefault()
          if (selectedIndex !== -1 && items[selectedIndex]) {
            items[selectedIndex].click()
          }
          break
        default:
          break
      }
    }

    toolbar.addEventListener('keydown', handleKeyboardNavigation, true)

    return () => {
      toolbar.removeEventListener('keydown', handleKeyboardNavigation, true)
    }
  }, [items, selectedIndex, toolbarRef])

  useEffect(() => {
    const toolbar = toolbarRef.current
    if (!toolbar) return

    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement
      if (toolbar.contains(target)) target.setAttribute('data-focus-visible', 'true')
    }

    const handleBlur = (e: FocusEvent) => {
      const target = e.target as HTMLElement
      if (toolbar.contains(target)) target.removeAttribute('data-focus-visible')
    }

    toolbar.addEventListener('focus', handleFocus, true)
    toolbar.addEventListener('blur', handleBlur, true)

    return () => {
      toolbar.removeEventListener('focus', handleFocus, true)
      toolbar.removeEventListener('blur', handleBlur, true)
    }
  }, [toolbarRef])

  useEffect(() => {
    if (selectedIndex !== -1 && items[selectedIndex]) {
      items[selectedIndex].focus()
    }
  }, [selectedIndex, items])
}

export const Toolbar = forwardRef<HTMLDivElement, ToolbarProps>(
  ({ children, className, variant = 'fixed', ...props }, ref) => {
    const toolbarRef = useRef<HTMLDivElement>(null)
    const composedRef = useComposedRef(toolbarRef, ref)
    useToolbarNavigation(toolbarRef)

    return (
      <div
        ref={composedRef}
        role="toolbar"
        aria-label="Formatting toolbar"
        data-variant={variant}
        className={cn(
          'tiptap-toolbar flex min-h-11 items-center gap-1 border-b border-border bg-background px-2',
          variant === 'floating' && 'rounded-xl border shadow-lg',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
Toolbar.displayName = 'Toolbar'

type ToolbarGroupProps = BaseProps & {
  ref?: React.Ref<HTMLDivElement>
}

export function ToolbarGroup({ children, className, ref, ...props }: ToolbarGroupProps) {
  return (
    <div
      ref={ref}
      role="group"
      className={cn('tiptap-toolbar-group flex items-center gap-0.5', className)}
      {...props}
    >
      {children}
    </div>
  )
}

interface SeparatorProps {
  ref?: React.Ref<HTMLDivElement>
}

export function Separator({ ref }: SeparatorProps) {
  return <div ref={ref} role="separator" aria-orientation="vertical" className="w-2 shrink-0" />
}
