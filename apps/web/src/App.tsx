import { lazy, Suspense, useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  EditorErrorBoundary,
  NotesSidebar,
  SearchDialog,
  ShortcutsHelpModal,
  Toasts,
  useAppShell,
  useGlobalShortcuts,
} from '@nicenote/app-shell'
import { useIsBreakpoint } from '@nicenote/ui'

import { ImportDialog } from './components/ImportDialog'
import { WebAppShellProvider } from './providers/AppShellProvider'

const NoteEditorPane = lazy(() =>
  import('@nicenote/app-shell').then((m) => ({ default: m.NoteEditorPane }))
)

function AppContent() {
  const { t } = useTranslation()

  const [searchOpen, setSearchOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const closeSearch = useCallback(() => setSearchOpen(false), [])
  const closeShortcuts = useCallback(() => setShortcutsOpen(false), [])
  const closeImport = useCallback(() => setImportOpen(false), [])

  const isMobile = useIsBreakpoint('max', 768)
  const { sidebar, tags, noteTagActions } = useAppShell()

  const shortcutActions = useMemo(
    () => ({
      onSearch: () => setSearchOpen((prev) => !prev),
      onNewNote: () => {},
      onToggleSidebar: () => sidebar.toggle(),
      onShowHelp: () => setShortcutsOpen((prev) => !prev),
    }),
    [sidebar]
  )

  useGlobalShortcuts(shortcutActions)

  const mobileOverlayOpen = isMobile && sidebar.isOpen
  const gridColumns = isMobile ? '0px 1fr' : sidebar.isOpen ? `${sidebar.width}px 1fr` : '48px 1fr'

  const handleShowShortcuts = useCallback(() => setShortcutsOpen(true), [])
  const handleImport = useCallback(() => setImportOpen(true), [])

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
        onImport={handleImport}
      />

      <EditorErrorBoundary>
        <Suspense
          fallback={
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              {t('editor.loadingEditor')}
            </div>
          }
        >
          <NoteEditorPane
            inert={mobileOverlayOpen}
            isMobile={isMobile}
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
      <ImportDialog open={importOpen} onClose={closeImport} />
      <Toasts />
    </div>
  )
}

export default function App() {
  return (
    <WebAppShellProvider>
      <AppContent />
    </WebAppShellProvider>
  )
}
