import { Check, Loader2 } from 'lucide-react'

import { cn } from '@nicenote/ui'

export type SaveState = 'saved' | 'saving' | 'unsaved'

export interface SaveStateIndicatorLabels {
  saved: string
  saving: string
  unsaved: string
}

export interface SaveStateIndicatorProps {
  state: SaveState
  labels: SaveStateIndicatorLabels
  className?: string
}

export function SaveStateIndicator({ state, labels, className }: SaveStateIndicatorProps) {
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs text-muted-foreground', className)}>
      {state === 'saving' && <Loader2 className="size-3 animate-spin" />}
      {state === 'saved' && <Check className="size-3" />}
      {state === 'saving' && labels.saving}
      {state === 'saved' && labels.saved}
      {state === 'unsaved' && labels.unsaved}
    </span>
  )
}
