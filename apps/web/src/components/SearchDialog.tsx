import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { FileText, Search, X } from 'lucide-react'

import type { NoteSearchResult } from '@nicenote/shared'

import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useNoteStore } from '../store/useNoteStore'

interface SearchDialogProps {
  open: boolean
  onClose: () => void
}

export function SearchDialog({ open, onClose }: SearchDialogProps) {
  if (!open) return null
  return <SearchDialogInner onClose={onClose} />
}

function SearchDialogInner({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 300)
  const search = useNoteStore((s) => s.search)
  const results = useMemo<NoteSearchResult[]>(
    () => (debouncedQuery.length > 0 ? search(debouncedQuery) : []),
    [debouncedQuery, search]
  )
  const isFetching = false
  const inputRef = useRef<HTMLInputElement>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const selectNote = useNoteStore((s) => s.selectNote)

  // Clamp selectedIndex to valid range when results change
  const safeIndex = results && results.length > 0 ? Math.min(selectedIndex, results.length - 1) : 0

  // Auto-focus on mount
  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [])

  const handleSelect = useCallback(
    (result: NoteSearchResult) => {
      selectNote(result.id)
      onClose()
    },
    [selectNote, onClose]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!results || results.length === 0) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => (prev + 1) % results.length)
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => (prev - 1 + results.length) % results.length)
          break
        case 'Enter':
          e.preventDefault()
          if (results[safeIndex]) {
            handleSelect(results[safeIndex])
          }
          break
      }
    },
    [results, safeIndex, handleSelect]
  )

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-32">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />

      {/* Dialog */}
      <div
        role="dialog"
        aria-label={t('search.title')}
        className="relative w-full max-w-lg rounded-xl border border-border bg-background shadow-2xl"
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            placeholder={t('search.placeholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="rounded p-0.5 text-muted-foreground hover:text-foreground"
              aria-label={t('search.clear')}
            >
              <X className="size-3.5" />
            </button>
          )}
          <kbd className="hidden rounded border border-border px-1.5 py-0.5 text-xs text-muted-foreground sm:inline-block">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2">
          {isFetching && debouncedQuery.length > 0 && (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              {t('search.searching')}
            </div>
          )}

          {!isFetching && debouncedQuery.length > 0 && results && results.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {t('search.noResults')}
            </div>
          )}

          {results &&
            results.length > 0 &&
            results.map((result, index) => (
              <button
                key={result.id}
                onClick={() => handleSelect(result)}
                className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                  index === safeIndex ? 'bg-accent' : 'hover:bg-accent/50'
                }`}
              >
                <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {result.title || t('sidebar.untitled')}
                  </div>
                  {result.snippet && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      <HighlightSnippet text={result.snippet} query={debouncedQuery} />
                    </p>
                  )}
                </div>
              </button>
            ))}

          {debouncedQuery.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">{t('search.hint')}</div>
          )}
        </div>
      </div>
    </div>
  )
}

// 安全高亮组件：在 snippet 中查找 query 并用 <mark> 渲染，不使用 dangerouslySetInnerHTML
function HighlightSnippet({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark>{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}
