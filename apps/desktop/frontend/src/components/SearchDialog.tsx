import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { FileText, Loader2, Search, X } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'

import { cn } from '@nicenote/ui'

import type { SearchResult } from '../bindings/tauri'
import { useDesktopStore } from '../store/useDesktopStore'

// ============================================================
// SearchDialog：全局搜索对话框
// ============================================================

interface SearchDialogProps {
  open: boolean
  onClose: () => void
}

export function SearchDialog({ open, onClose }: SearchDialogProps) {
  // 未打开时不渲染，避免不必要的 DOM 和事件监听
  if (!open) return null
  return <SearchDialogInner onClose={onClose} />
}

// ============================================================
// 内部组件（仅在 open=true 时挂载）
// ============================================================

function SearchDialogInner({ onClose }: { onClose: () => void }) {
  const { search, searchQuery, searchResults, isSearching, openNote } = useDesktopStore(
    useShallow((s) => ({
      search: s.search,
      searchQuery: s.searchQuery,
      searchResults: s.searchResults,
      isSearching: s.isSearching,
      openNote: s.openNote,
    }))
  )

  const [query, setQuery] = useState(searchQuery)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  // 防抖定时器
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 自动聚焦输入框
  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [])

  // 防抖触发搜索（300ms）
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      search(query)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, search])

  // 搜索结果变化时重置选中索引
  useEffect(() => {
    setSelectedIndex(0)
  }, [searchResults])

  // 防止选中索引越界
  const safeIndex = searchResults.length > 0 ? Math.min(selectedIndex, searchResults.length - 1) : 0

  // 选中并打开笔记
  const handleSelect = useCallback(
    (result: SearchResult) => {
      openNote(result.path)
      onClose()
    },
    [openNote, onClose]
  )

  // 键盘导航
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (searchResults.length === 0) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => (prev + 1) % searchResults.length)
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length)
          break
        case 'Enter':
          e.preventDefault()
          if (searchResults[safeIndex]) {
            handleSelect(searchResults[safeIndex])
          }
          break
      }
    },
    [searchResults, safeIndex, handleSelect]
  )

  // Escape 关闭
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

  const hasResults = searchResults.length > 0
  const hasQuery = query.trim().length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-28">
      {/* 遮罩层 */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 对话框主体 */}
      <div
        role="dialog"
        aria-label="搜索笔记"
        aria-modal="true"
        className="relative w-full max-w-xl rounded-2xl border border-border bg-background shadow-2xl"
        onKeyDown={handleKeyDown}
      >
        {/* 搜索输入框 */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
          {isSearching ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
          ) : (
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <input
            ref={inputRef}
            type="text"
            placeholder="搜索笔记..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
          />
          <div className="flex items-center gap-2">
            {query && (
              <button
                onClick={() => {
                  setQuery('')
                  search('')
                }}
                className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="清除搜索"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <kbd className="rounded border border-border px-1.5 py-0.5 text-xs text-muted-foreground/60">
              ESC
            </kbd>
          </div>
        </div>

        {/* 搜索结果区 */}
        <div className="max-h-96 overflow-y-auto p-2">
          {/* 无查询时的提示 */}
          {!hasQuery && (
            <div className="py-10 text-center text-sm text-muted-foreground/60">
              输入关键词搜索笔记内容和标题
            </div>
          )}

          {/* 搜索中 */}
          {isSearching && hasQuery && (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              搜索中...
            </div>
          )}

          {/* 无结果 */}
          {!isSearching && hasQuery && !hasResults && (
            <div className="py-10 text-center text-sm text-muted-foreground/60">
              未找到匹配"<span className="font-medium text-foreground">{query}</span>"的笔记
            </div>
          )}

          {/* 搜索结果列表 */}
          {hasResults &&
            searchResults.map((result, index) => (
              <SearchResultItem
                key={result.path}
                result={result}
                query={query}
                isSelected={index === safeIndex}
                onClick={() => handleSelect(result)}
              />
            ))}
        </div>

        {/* 底部状态栏 */}
        {hasResults && (
          <div className="flex items-center justify-between border-t border-border px-4 py-2">
            <span className="text-xs text-muted-foreground/50">
              找到 {searchResults.length} 条结果
            </span>
            <div className="flex items-center gap-3 text-xs text-muted-foreground/50">
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border px-1 py-0.5 text-[10px]">↑↓</kbd>
                导航
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border px-1 py-0.5 text-[10px]">↵</kbd>
                打开
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// 搜索结果项
// ============================================================

interface SearchResultItemProps {
  result: SearchResult
  query: string
  isSelected: boolean
  onClick: () => void
}

function SearchResultItem({ result, query, isSelected, onClick }: SearchResultItemProps) {
  const relativeTime = useMemo(() => {
    try {
      return formatDistanceToNow(new Date(result.updatedAt), {
        addSuffix: true,
        locale: zhCN,
      })
    } catch {
      return ''
    }
  }, [result.updatedAt])

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
        isSelected ? 'bg-accent' : 'hover:bg-accent/50'
      )}
    >
      <FileText
        className={cn(
          'mt-0.5 h-4 w-4 shrink-0',
          isSelected ? 'text-primary' : 'text-muted-foreground'
        )}
      />
      <div className="min-w-0 flex-1">
        {/* 标题 */}
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium text-foreground">
            {result.title || '无标题'}
          </span>
          <span className="shrink-0 text-[10px] text-muted-foreground/50">{relativeTime}</span>
        </div>

        {/* 安全高亮片段（纯 React 渲染，不使用 dangerouslySetInnerHTML） */}
        {result.snippet && (
          <p
            className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground/70
              [&_mark]:rounded [&_mark]:bg-yellow-200 [&_mark]:px-0.5 [&_mark]:text-foreground
              dark:[&_mark]:bg-yellow-500/30 dark:[&_mark]:text-foreground"
          >
            <HighlightSnippet text={result.snippet} query={query} />
          </p>
        )}

        {/* 标签 */}
        {result.tags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {result.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground/70"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
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
