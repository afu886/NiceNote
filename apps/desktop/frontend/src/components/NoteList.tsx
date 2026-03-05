import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'

import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { MoreHorizontal, Plus, Search, Star, Tag, Trash2, X } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'

import { cn } from '@nicenote/ui'

import type { NoteFile } from '../bindings/tauri'
import { AppService } from '../bindings/tauri'
import { useDesktopStore } from '../store/useDesktopStore'

// ============================================================
// NoteList：笔记列表面板
// ============================================================

export function NoteList() {
  const {
    notes,
    activeNote,
    currentView,
    selectedTag,
    favorites,
    tagColors,
    isLoading,
    openNote,
    createNote,
    deleteNote,
    toggleFavorite,
    setSelectedTag,
  } = useDesktopStore(
    useShallow((s) => ({
      notes: s.notes,
      activeNote: s.activeNote,
      currentView: s.currentView,
      selectedTag: s.selectedTag,
      favorites: s.favorites,
      tagColors: s.tagColors,
      isLoading: s.isLoading,
      openNote: s.openNote,
      createNote: s.createNote,
      deleteNote: s.deleteNote,
      toggleFavorite: s.toggleFavorite,
      setSelectedTag: s.setSelectedTag,
    }))
  )

  // 搜索状态（本地过滤，不走 IPC 搜索接口）
  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const deferredSearch = useDeferredValue(search)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (showSearch) searchInputRef.current?.focus()
  }, [showSearch])

  // 计算过滤后的笔记列表
  const filteredNotes = useMemo(() => {
    let result = notes

    // 收藏视图过滤
    if (currentView === 'favorites') {
      result = result.filter((n) => favorites.includes(n.path))
    }

    // 标签过滤
    if (selectedTag) {
      result = result.filter((n) => n.tags.includes(selectedTag))
    }

    // 搜索过滤（本地标题匹配）
    const q = deferredSearch.toLowerCase()
    if (q) {
      result = result.filter(
        (n) => n.title.toLowerCase().includes(q) || n.summary.toLowerCase().includes(q)
      )
    }

    return result
  }, [notes, currentView, selectedTag, favorites, deferredSearch])

  // 获取所有唯一标签（用于标签视图）
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    for (const note of notes) {
      for (const tag of note.tags) tagSet.add(tag)
    }
    return Array.from(tagSet).sort()
  }, [notes])

  const handleCreateNote = useCallback(() => {
    createNote()
  }, [createNote])

  const handleNoteClick = useCallback(
    (path: string) => {
      openNote(path)
    },
    [openNote]
  )

  const handleDeleteNote = useCallback(
    (path: string, e: React.MouseEvent) => {
      e.stopPropagation()
      if (window.confirm('确认删除这篇笔记？此操作不可撤销。')) {
        deleteNote(path)
      }
    },
    [deleteNote]
  )

  const handleToggleFavorite = useCallback(
    (path: string, e: React.MouseEvent) => {
      e.stopPropagation()
      toggleFavorite(path)
    },
    [toggleFavorite]
  )

  const handleTagClick = useCallback(
    (tag: string) => {
      setSelectedTag(tag)
    },
    [setSelectedTag]
  )

  // ---- 面板标题 ----
  const panelTitle =
    currentView === 'favorites'
      ? '收藏'
      : currentView === 'tags'
        ? '标签'
        : currentView === 'folder-tree'
          ? '目录'
          : '笔记'

  // ---- 标签视图 ----
  if (currentView === 'tags') {
    return (
      <div className="flex h-full flex-col">
        <PanelHeader title="标签" noteCount={allTags.length} onCreateNote={null} />
        <ul className="flex-1 overflow-y-auto p-2">
          {allTags.map((tag) => (
            <li key={tag}>
              <button
                onClick={() => handleTagClick(tag)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors',
                  selectedTag === tag
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                )}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: tagColors[tag] ?? '#94a3b8' }}
                />
                <span className="flex-1 truncate">{tag}</span>
                <span className="text-xs text-muted-foreground/60">
                  {notes.filter((n) => n.tags.includes(tag)).length}
                </span>
              </button>
            </li>
          ))}
          {allTags.length === 0 && (
            <li className="py-12 text-center text-sm text-muted-foreground">暂无标签</li>
          )}
        </ul>
      </div>
    )
  }

  // ---- 笔记列表视图（all / favorites）----
  return (
    <div className="flex h-full flex-col">
      {/* 面板头部 */}
      <PanelHeader
        title={panelTitle}
        noteCount={filteredNotes.length}
        onCreateNote={currentView !== 'favorites' ? handleCreateNote : null}
        onToggleSearch={() => {
          setShowSearch((v) => !v)
          setSearch('')
        }}
        showSearch={showSearch}
      />

      {/* 内联搜索框 */}
      <div
        className={cn(
          'grid transition-all duration-200 ease-out',
          showSearch ? 'grid-rows-1fr' : 'grid-rows-0fr'
        )}
      >
        <div className="overflow-hidden">
          <div className="px-3 pt-2 pb-1">
            <div className="relative">
              <Search className="absolute top-2.5 left-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                ref={searchInputRef}
                type="search"
                placeholder="搜索笔记..."
                aria-label="搜索笔记"
                className="h-8 w-full rounded-lg border-0 bg-accent py-1.5 pr-8 pl-8 text-sm outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-primary/40"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute top-2 right-2 rounded p-0.5 text-muted-foreground hover:text-foreground"
                  aria-label="清除搜索"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 标签过滤指示器 */}
      {selectedTag && (
        <div className="px-3 py-1.5">
          <button
            onClick={() => setSelectedTag(null)}
            className="flex items-center gap-1.5 rounded-md bg-accent px-2 py-1 text-xs text-foreground transition-colors hover:bg-accent/70"
          >
            <Tag className="h-3 w-3" />
            <span className="max-w-30 truncate">{selectedTag}</span>
            <X className="h-3 w-3 shrink-0" />
          </button>
        </div>
      )}

      {/* 笔记列表 */}
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          加载中...
        </div>
      ) : (
        <ul role="list" className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {filteredNotes.map((note) => (
            <NoteListItem
              key={note.path}
              note={note}
              isActive={activeNote?.path === note.path}
              isFavorite={favorites.includes(note.path)}
              tagColors={tagColors}
              onClick={() => handleNoteClick(note.path)}
              onDelete={(e) => handleDeleteNote(note.path, e)}
              onToggleFavorite={(e) => handleToggleFavorite(note.path, e)}
            />
          ))}
          {filteredNotes.length === 0 && (
            <li className="py-12 text-center text-sm text-muted-foreground">
              {deferredSearch
                ? '无匹配结果'
                : currentView === 'favorites'
                  ? '暂无收藏'
                  : '暂无笔记'}
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

// ============================================================
// 面板头部
// ============================================================

interface PanelHeaderProps {
  title: string
  noteCount: number
  onCreateNote: (() => void) | null
  onToggleSearch?: () => void
  showSearch?: boolean
}

function PanelHeader({
  title,
  noteCount,
  onCreateNote,
  onToggleSearch,
  showSearch,
}: PanelHeaderProps) {
  return (
    <div className="flex shrink-0 items-center justify-between px-4 py-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
          {noteCount}
        </span>
      </div>
      <div className="flex items-center gap-1">
        {onToggleSearch && (
          <button
            onClick={onToggleSearch}
            aria-label={showSearch ? '关闭搜索' : '搜索笔记'}
            className={cn(
              'rounded-md p-1.5 transition-colors',
              showSearch
                ? 'bg-accent text-foreground'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
            )}
          >
            <Search className="h-4 w-4" />
          </button>
        )}
        {onCreateNote && (
          <button
            onClick={onCreateNote}
            aria-label="新建笔记"
            title="新建笔记 (Ctrl+N)"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}

// ============================================================
// 笔记列表项
// ============================================================

interface NoteListItemProps {
  note: NoteFile
  isActive: boolean
  isFavorite: boolean
  tagColors: Record<string, string>
  onClick: () => void
  onDelete: (e: React.MouseEvent) => void
  onToggleFavorite: (e: React.MouseEvent) => void
}

const NoteListItem = memo(function NoteListItem({
  note,
  isActive,
  isFavorite,
  tagColors,
  onClick,
  onDelete,
  onToggleFavorite,
}: NoteListItemProps) {
  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }, [])

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  // 格式化相对时间
  const relativeTime = useMemo(() => {
    try {
      return formatDistanceToNow(new Date(note.updatedAt), {
        addSuffix: true,
        locale: zhCN,
      })
    } catch {
      return ''
    }
  }, [note.updatedAt])

  return (
    <>
      <li
        role="listitem"
        className={cn(
          'group relative flex flex-col rounded-lg p-3 transition-colors cursor-pointer',
          isActive ? 'bg-accent shadow-sm' : 'hover:bg-accent/50'
        )}
        onClick={onClick}
        onContextMenu={handleContextMenu}
      >
        {/* 标题 */}
        <div
          className={cn(
            'truncate pr-7 text-sm font-medium leading-snug',
            isActive ? 'text-foreground' : 'text-foreground/90'
          )}
        >
          {note.title || '无标题'}
        </div>

        {/* 摘要 */}
        {note.summary && (
          <p className="mt-0.5 line-clamp-2 pr-7 text-xs leading-relaxed text-muted-foreground/70">
            {note.summary}
          </p>
        )}

        {/* 底部元信息：时间 + 标签 */}
        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground/50 whitespace-nowrap">
            {relativeTime}
          </span>
          {note.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded px-1.5 py-0.5 text-[10px] leading-tight"
              style={{
                backgroundColor: tagColors[tag] ? `${tagColors[tag]}20` : 'var(--color-accent)',
                color: tagColors[tag] ?? 'var(--color-muted-foreground)',
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* 悬停操作按钮组 */}
        <div
          className={cn(
            'absolute top-2.5 right-2 flex items-center gap-0.5 transition-opacity',
            isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          )}
        >
          <button
            onClick={onToggleFavorite}
            aria-label={isFavorite ? '取消收藏' : '收藏'}
            className="rounded p-1 text-muted-foreground/60 transition-colors hover:text-yellow-500"
          >
            <Star className={cn('h-3.5 w-3.5', isFavorite && 'fill-yellow-400 text-yellow-400')} />
          </button>
          <button
            onClick={onDelete}
            aria-label="删除笔记"
            className="rounded p-1 text-muted-foreground/60 transition-colors hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </li>

      {/* 右键上下文菜单 */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          notePath={note.path}
          isFavorite={isFavorite}
          onClose={handleCloseContextMenu}
          onDelete={onDelete}
          onToggleFavorite={onToggleFavorite}
        />
      )}
    </>
  )
})

// ============================================================
// 右键上下文菜单
// ============================================================

interface ContextMenuProps {
  x: number
  y: number
  notePath: string
  isFavorite: boolean
  onClose: () => void
  onDelete: (e: React.MouseEvent) => void
  onToggleFavorite: (e: React.MouseEvent) => void
}

function ContextMenu({
  x,
  y,
  notePath,
  isFavorite,
  onClose,
  onDelete,
  onToggleFavorite,
}: ContextMenuProps) {
  // 点击外部关闭菜单
  useEffect(() => {
    const handler = () => onClose()
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  // 在文件管理器中显示文件
  const handleRevealInFinder = useCallback(() => {
    AppService.RevealInExplorer(notePath).catch((err) => {
      console.error('在文件管理器中显示失败:', err)
    })
    onClose()
  }, [notePath, onClose])

  // 调整菜单位置，防止超出视口
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x, y })

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect()
      const vw = window.innerWidth
      const vh = window.innerHeight
      setPos({
        x: x + rect.width > vw ? vw - rect.width - 8 : x,
        y: y + rect.height > vh ? vh - rect.height - 8 : y,
      })
    }
  }, [x, y])

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-40 rounded-lg border border-border bg-popover py-1 shadow-lg"
      style={{ left: pos.x, top: pos.y }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        onClick={(e) => {
          onToggleFavorite(e)
          onClose()
        }}
        className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-accent"
      >
        <Star className="h-3.5 w-3.5" />
        {isFavorite ? '取消收藏' : '加入收藏'}
      </button>
      <div className="my-1 h-px bg-border" />
      <button
        onClick={handleRevealInFinder}
        className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-accent"
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
        在文件管理器中显示
      </button>
      <div className="my-1 h-px bg-border" />
      <button
        onClick={(e) => {
          onDelete(e)
          onClose()
        }}
        className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-destructive transition-colors hover:bg-destructive/10"
      >
        <Trash2 className="h-3.5 w-3.5" />
        删除
      </button>
    </div>
  )
}
