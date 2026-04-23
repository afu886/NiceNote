import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { Locale } from 'date-fns'
import { formatDistanceToNow } from 'date-fns'
import { ChevronLeft, FileText, Search, SquarePen, Tag, Trash2, X } from 'lucide-react'
import type { ReactNode } from 'react'

import type { AppShellContextValue } from '../context'
import { useAppShell } from '../context'
import { useMinuteTicker } from '../hooks/useMinuteTicker'
import { ICON_SM_CLASS, ROW_WITH_ICON_CLASS } from '../lib/class-names'
import { getDateLocale } from '../lib/date-locale'

import { SettingsDropdown } from './SettingsDropdown'

type SidebarNote = AppShellContextValue['notes'][number]

// ============================================================
// 笔记列表项
// ============================================================

interface NoteListItemProps {
  note: SidebarNote
  isActive: boolean
  onSelect: (note: SidebarNote) => void
  onDelete: (id: string) => void
  renderActions?: ((noteId: string) => ReactNode) | undefined
  untitledLabel: string
  deleteLabel: string
  dateLocale: Locale
}

const NoteListItem = memo(function NoteListItem({
  note,
  isActive,
  onSelect,
  onDelete,
  renderActions,
  untitledLabel,
  deleteLabel,
  dateLocale,
}: NoteListItemProps) {
  useMinuteTicker()

  return (
    <li
      role="listitem"
      className={`group relative flex flex-col rounded-md p-3 transition-all ${
        isActive
          ? 'bg-accent shadow-sm'
          : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
      }`}
    >
      <button
        onClick={() => onSelect(note)}
        className="w-full cursor-pointer text-left outline-none"
      >
        <div className="truncate pr-8 font-medium text-muted-foreground">
          {note.title || untitledLabel}
        </div>
        {note.summary && (
          <p className="mt-0.5 line-clamp-2 pr-8 text-xs leading-relaxed text-muted-foreground/60">
            {note.summary}
          </p>
        )}
        <div className="mt-1">
          <span className="text-caption whitespace-nowrap opacity-50">
            {formatDistanceToNow(new Date(note.updatedAt), {
              addSuffix: true,
              locale: dateLocale,
            })}
          </span>
        </div>
      </button>

      {/* 操作按钮区域 */}
      <div
        className={`absolute top-3 right-3 flex items-center gap-0.5 transition-all ${
          isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100'
        }`}
      >
        {/* 调用方注入的列表项操作（如桌面端收藏星标） */}
        {renderActions?.(note.id)}
        <button
          aria-label={deleteLabel.replace('{{title}}', note.title || untitledLabel)}
          onClick={(e) => {
            e.stopPropagation()
            onDelete(note.id)
          }}
          className="shrink-0 rounded-md p-1.5 transition-all hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <Trash2 className={ICON_SM_CLASS} />
        </button>
      </div>
    </li>
  )
})

// ============================================================
// NotesSidebar 主组件
// ============================================================

type NavView = 'notes' | 'tags'

interface NotesSidebarProps {
  onShowShortcuts?: () => void
  onExportAll?: () => void
  onImport?: () => void
  renderNoteActions?: ((noteId: string) => ReactNode) | undefined
  isMobile?: boolean
}

export function NotesSidebar({
  onShowShortcuts,
  onExportAll,
  onImport,
  renderNoteActions,
  isMobile = false,
}: NotesSidebarProps) {
  const { t, i18n } = useTranslation()
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [showSearch, setShowSearch] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (showSearch) searchInputRef.current?.focus()
  }, [showSearch])

  const [navView, setNavView] = useState<NavView>('notes')
  const [tagFilterName, setTagFilterName] = useState<string | null>(null)

  const { notes, selectedNoteId, tags, sidebar, selectNote, createNote, deleteNote } = useAppShell()

  const dateLocale = useMemo(() => getDateLocale(i18n.language), [i18n.language])
  const untitledLabel = t('sidebar.untitled')
  const deleteLabel = t('sidebar.deleteNote', { title: '{{title}}' })

  const handleSelectNote = useCallback(
    (note: SidebarNote) => {
      selectNote(note.id)
      if (isMobile) sidebar.close()
    },
    [selectNote, isMobile, sidebar]
  )

  const handleDeleteNote = useCallback(
    (id: string) => {
      deleteNote(id)
    },
    [deleteNote]
  )

  const handleCreateNote = useCallback(async () => {
    await createNote()
    if (isMobile) sidebar.close()
  }, [createNote, isMobile, sidebar])

  // 点击标签：切换到笔记视图并按该标签过滤
  const handleTagClick = useCallback((tagName: string) => {
    setTagFilterName(tagName)
    setNavView('notes')
  }, [])

  // 切换到"所有笔记"：清除标签过滤
  const handleNavNotes = useCallback(() => {
    setNavView('notes')
    setTagFilterName(null)
  }, [])

  const filteredNotes = useMemo(() => {
    let result = notes
    if (tagFilterName) {
      result = result.filter((note) => note.tags.includes(tagFilterName))
    }
    const normalizedSearch = deferredSearch.toLowerCase()
    if (normalizedSearch) {
      result = result.filter((note) => note.title.toLowerCase().includes(normalizedSearch))
    }
    return result
  }, [notes, deferredSearch, tagFilterName])

  // 拖拽调整宽度
  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)
      sidebar.startResize()
    },
    [sidebar]
  )

  const handleResizePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!sidebar.isResizing) return
      sidebar.setWidth(e.clientX)
    },
    [sidebar]
  )

  const handleResizePointerUp = useCallback(() => {
    if (!sidebar.isResizing) return
    sidebar.stopResize()
  }, [sidebar])

  const activeTag = tagFilterName ? (tags.find((tag) => tag.name === tagFilterName) ?? null) : null

  // 左导航栏
  const leftNav = (
    <nav
      className="flex w-20 shrink-0 flex-col border-r border-border px-1.5 py-2"
      onClick={(e) => {
        if (e.target === e.currentTarget) selectNote(null)
      }}
    >
      {/* 导航按钮区域（可滚动） */}
      <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
        <button
          onClick={handleNavNotes}
          className={`flex shrink-0 flex-col items-center gap-1 rounded-md px-1 py-2.5 text-xs transition-colors ${
            navView === 'notes'
              ? 'bg-accent text-foreground'
              : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
          }`}
        >
          <FileText className={ICON_SM_CLASS} />
          <span className="text-center leading-tight">{t('nav.allNotes')}</span>
        </button>
        <button
          onClick={() => setNavView('tags')}
          className={`flex shrink-0 flex-col items-center gap-1 rounded-md px-1 py-2.5 text-xs transition-colors ${
            navView === 'tags'
              ? 'bg-accent text-foreground'
              : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
          }`}
        >
          <Tag className={ICON_SM_CLASS} />
          <span className="text-center leading-tight">{t('nav.allTags')}</span>
        </button>
      </div>

      {/* 设置按钮（始终固定在底部） */}
      <div className="shrink-0 flex justify-center pt-2">
        <SettingsDropdown
          {...(onShowShortcuts ? { onShowShortcuts } : {})}
          {...(onExportAll ? { onExportAll } : {})}
          {...(onImport ? { onImport } : {})}
        />
      </div>
    </nav>
  )

  // 笔记列表视图
  const notesPanel = (
    <>
      <div className="shrink-0">
        {/* 搜索框 */}
        <div
          className={`grid transition-grid duration-200 ease-out ${
            showSearch ? 'grid-rows-1fr' : 'grid-rows-0fr'
          }`}
        >
          <div className="overflow-hidden">
            <div
              className={`px-2 pt-2 pb-1 transition-transform-opacity duration-150 ease-out ${
                showSearch ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
              }`}
            >
              <div className="relative">
                <Search
                  className={`absolute top-2.5 left-2.5 ${ICON_SM_CLASS} text-muted-foreground`}
                />
                <input
                  ref={searchInputRef}
                  type="search"
                  placeholder={t('sidebar.searchNotes')}
                  aria-label={t('sidebar.searchNotesLabel')}
                  className="w-full py-2 pr-4 pl-9 text-sm outline-none"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
        {/* 标签过滤指示器 */}
        {activeTag && (
          <div className="px-2 pt-1.5 pb-1">
            <button
              onClick={() => {
                setTagFilterName(null)
              }}
              className="flex items-center gap-1 rounded-md bg-accent px-2 py-1 text-xs text-foreground transition-colors hover:bg-accent/70"
            >
              <Tag className="h-3 w-3" />
              <span className="max-w-20 truncate">{activeTag.name}</span>
              <X className="h-3 w-3 shrink-0" />
            </button>
          </div>
        )}
      </div>

      <ul
        role="list"
        className="flex-1 space-y-1 overflow-y-auto p-2"
        onClick={(e) => {
          if (e.target === e.currentTarget) selectNote(null)
        }}
      >
        {filteredNotes.map((note) => (
          <NoteListItem
            key={note.id}
            note={note}
            isActive={selectedNoteId === note.id}
            onSelect={handleSelectNote}
            onDelete={handleDeleteNote}
            renderActions={renderNoteActions}
            untitledLabel={untitledLabel}
            deleteLabel={deleteLabel}
            dateLocale={dateLocale}
          />
        ))}
        {filteredNotes.length === 0 && (
          <li className="py-12 text-center text-muted-foreground">
            <p className="text-sm">{t('sidebar.noNotesFound')}</p>
          </li>
        )}
      </ul>
    </>
  )

  // 标签列表视图
  const tagsPanel = (
    <ul role="list" className="flex-1 space-y-1 overflow-y-auto p-2">
      {tags.map((tag) => (
        <li key={tag.name} role="listitem">
          <button
            onClick={() => handleTagClick(tag.name)}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
          >
            {tag.color ? (
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: tag.color }}
              />
            ) : (
              <Tag className="h-3 w-3 shrink-0" />
            )}
            <span className="flex-1 truncate text-left">{tag.name}</span>
            <span className="text-xs text-muted-foreground/60">{tag.count}</span>
          </button>
        </li>
      ))}
      {tags.length === 0 && (
        <li className="py-12 text-center text-muted-foreground">
          <p className="text-sm">{t('nav.noTags')}</p>
        </li>
      )}
    </ul>
  )

  const sidebarContent = (
    <>
      {/* 标题栏 */}
      <div className="flex shrink-0 items-center justify-between p-4">
        <h1 className="text-xl font-semibold">Nicenote</h1>
        <div className={ROW_WITH_ICON_CLASS}>
          <button
            onClick={handleCreateNote}
            aria-label={t('sidebar.newNote')}
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
          >
            <SquarePen className={ICON_SM_CLASS} />
          </button>
          <button
            onClick={() => {
              setShowSearch((v) => !v)
              setSearch('')
            }}
            aria-label={t('sidebar.searchNotes')}
            className={`rounded-md p-2 transition-colors ${
              showSearch
                ? 'bg-accent text-foreground'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
            }`}
          >
            <Search className={ICON_SM_CLASS} />
          </button>
        </div>
      </div>

      {/* 双栏主体：左导航 + 右内容 */}
      <div className="flex flex-1 overflow-hidden">
        {leftNav}
        <div className="flex flex-1 flex-col overflow-hidden">
          {navView === 'notes' ? notesPanel : tagsPanel}
        </div>
      </div>
    </>
  )

  // 移动端
  if (isMobile) {
    return (
      <>
        {!sidebar.isOpen && (
          <button
            onClick={sidebar.open}
            aria-label={t('sidebar.openSidebar')}
            className="fixed top-4 left-4 z-50 rounded-md bg-background p-2 shadow-sm transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <FileText className="w-5 h-5" />
          </button>
        )}
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-muted transition-transform duration-300 ease-in-out ${
            sidebar.isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          style={{ width: 280 }}
        >
          {sidebarContent}
        </aside>
      </>
    )
  }

  // 桌面端
  return (
    <div className="relative h-full">
      <aside className="relative flex h-full flex-col overflow-hidden border-r border-border bg-muted">
        <div
          className={`flex flex-1 flex-col overflow-hidden transition-opacity duration-300 ${
            sidebar.isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
          style={{ minWidth: sidebar.width }}
        >
          {sidebarContent}
        </div>

        {sidebar.isOpen && (
          <div
            className={`absolute top-0 right-0 z-50 h-full cursor-col-resize bg-border transition-all duration-100 hover:bg-primary ${
              sidebar.isResizing ? 'w-0.75' : 'w-px hover:w-0.75'
            }`}
            style={{ right: sidebar.isResizing ? '-1.5px' : '-0.5px' }}
            onPointerDown={handleResizePointerDown}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
            onPointerCancel={handleResizePointerUp}
          />
        )}
      </aside>

      {/* Ant Design Pro 风格折叠按钮 */}
      <button
        onClick={sidebar.toggle}
        aria-label={sidebar.isOpen ? t('sidebar.closeSidebar') : t('sidebar.openSidebar')}
        style={{
          right: '-12px',
          boxShadow: '0 2px 8px -2px rgba(0,0,0,0.08), 0 1px 4px -1px rgba(0,0,0,0.05)',
        }}
        className="absolute bottom-8 z-50 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-border bg-background transition-shadow hover:shadow-toggle"
      >
        <ChevronLeft
          className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-300 ${sidebar.isOpen ? '' : 'rotate-180'}`}
        />
      </button>
    </div>
  )
}
