import { lazy, memo, Suspense, useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Star } from 'lucide-react'

import type { AppRuntime } from '@nicenote/core'
import { useIsBreakpoint } from '@nicenote/ui'

import { EditorErrorBoundary } from './components/ErrorBoundary'
import { NotesSidebar } from './components/NotesSidebar'
import { SearchDialog } from './components/SearchDialog'
import { ShortcutsHelpModal } from './components/ShortcutsHelpModal'
import { Toasts } from './components/Toasts'
import { WorkspaceGate } from './components/WorkspaceGate'
import { ImportDialog } from './dialogs/ImportDialog'
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts'
import { NiceNoteProvider } from './providers/NiceNoteProvider'
import { useAppShell } from './context'

const NoteEditorPane = lazy(() =>
  import('./components/NoteEditorPane').then((m) => ({ default: m.NoteEditorPane }))
)

const FavoriteButton = memo(function FavoriteButton({ noteId }: { noteId: string }) {
  const { favorites, toggleFavorite } = useAppShell()
  const isFavorite = favorites.includes(noteId)
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        toggleFavorite(noteId)
      }}
      aria-label={isFavorite ? '取消收藏' : '收藏'}
      className="rounded p-1 text-muted-foreground/60 transition-colors hover:text-yellow-500"
    >
      <Star className={`h-3.5 w-3.5 ${isFavorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
    </button>
  )
})

function AppShell() {
  const { t } = useTranslation()
  const { sidebar, tags, noteTagActions, capabilities, saveState, currentWorkspace, createNote } =
    useAppShell()

  const [searchOpen, setSearchOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const closeSearch = useCallback(() => setSearchOpen(false), [])
  const closeShortcuts = useCallback(() => setShortcutsOpen(false), [])
  const closeImport = useCallback(() => setImportOpen(false), [])

  const isMobile = useIsBreakpoint('max', 768)

  const shortcutActions = useMemo(
    () => ({
      onSearch: () => setSearchOpen((prev) => !prev),
      onNewNote: () => {
        void createNote()
      },
      onToggleSidebar: () => sidebar.toggle(),
      onShowHelp: () => setShortcutsOpen((prev) => !prev),
    }),
    [sidebar, createNote]
  )
  useGlobalShortcuts(shortcutActions)

  const handleShowShortcuts = useCallback(() => setShortcutsOpen(true), [])
  const handleImport = useCallback(() => setImportOpen(true), [])

  const favoritesEnabled = capabilities.favorites === 'available'
  const importEnabled = capabilities.importExport === 'available'
  const needsWorkspace =
    capabilities.pickWorkspaceFolder !== 'unsupported' && currentWorkspace === null

  const renderNoteActions = useCallback((noteId: string) => <FavoriteButton noteId={noteId} />, [])

  if (needsWorkspace) {
    return <WorkspaceGate />
  }

  const mobileOverlayOpen = isMobile && sidebar.isOpen
  const gridColumns = isMobile ? '0px 1fr' : sidebar.isOpen ? `${sidebar.width}px 1fr` : '48px 1fr'

  return (
    <div
      className="grid h-screen"
      style={{
        gridTemplateColumns: gridColumns,
        transition: 'grid-template-columns 300ms ease-in-out',
      }}
    >
      <NotesSidebar
        isMobile={isMobile}
        onShowShortcuts={handleShowShortcuts}
        {...(importEnabled ? { onImport: handleImport } : {})}
        {...(favoritesEnabled ? { renderNoteActions } : {})}
      />

      <EditorErrorBoundary>
        <Suspense
          fallback={
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              {t('editor.loadingEditor')}
            </div>
          }
        >
          <NoteEditorPane
            inert={mobileOverlayOpen}
            isMobile={isMobile}
            saveState={saveState}
            tags={tags}
            noteTagActions={noteTagActions}
          />
        </Suspense>
      </EditorErrorBoundary>

      {mobileOverlayOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20"
          onClick={sidebar.close}
          aria-hidden="true"
        />
      )}

      <SearchDialog open={searchOpen} onClose={closeSearch} />
      <ShortcutsHelpModal open={shortcutsOpen} onClose={closeShortcuts} />
      {importEnabled && <ImportDialog open={importOpen} onClose={closeImport} />}
      <Toasts />
    </div>
  )
}

/**
 * Web/Desktop 唯一共享的 React DOM 产品界面入口。
 * 宿主只需注入平台 AppRuntime：<NiceNoteApp runtime={runtime} />。
 */
export function NiceNoteApp({ runtime }: { runtime: AppRuntime }) {
  return (
    <NiceNoteProvider runtime={runtime}>
      <AppShell />
    </NiceNoteProvider>
  )
}
