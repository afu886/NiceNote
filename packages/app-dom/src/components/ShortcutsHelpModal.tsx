import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { X } from 'lucide-react'

import { ICON_SM_CLASS } from '../lib/class-names'
import { formatShortcut, SHORTCUTS } from '../lib/shortcuts'

interface ShortcutsHelpModalProps {
  open: boolean
  onClose: () => void
}

export function ShortcutsHelpModal({ open, onClose }: ShortcutsHelpModalProps) {
  const { t } = useTranslation()

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const categories = {
    general: t('shortcuts.categoryGeneral'),
  }

  const grouped = SHORTCUTS.reduce<Record<string, typeof SHORTCUTS>>((acc, s) => {
    ;(acc[s.category] ??= []).push(s)
    return acc
  }, {})

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-label={t('shortcuts.title')}
        className="relative w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t('shortcuts.title')}</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:text-foreground"
            aria-label={t('shortcuts.close')}
          >
            <X className={ICON_SM_CLASS} />
          </button>
        </div>

        {Object.entries(grouped).map(([category, shortcuts]) => (
          <div key={category} className="mb-4 last:mb-0">
            <h3 className="mb-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">
              {categories[category as keyof typeof categories] ?? category}
            </h3>
            <div className="space-y-1">
              {shortcuts.map((shortcut) => (
                <div
                  key={shortcut.label}
                  className="flex items-center justify-between rounded-md px-2 py-1.5"
                >
                  <span className="text-sm">{t(shortcut.label as never)}</span>
                  <kbd className="rounded border border-border bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                    {formatShortcut(shortcut)}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
