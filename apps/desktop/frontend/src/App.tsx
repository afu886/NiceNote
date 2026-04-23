import { lazy, memo, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Star } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'

import {
  EditorErrorBoundary,
  NotesSidebar,
  SearchDialog,
  ShortcutsHelpModal,
  Toasts,
  useAppShell,
  useGlobalShortcuts,
} from '@nicenote/app-shell'

import { WelcomePage } from './components/WelcomePage'
import { useTauriEvents } from './hooks/useTauriEvents'
import { DesktopAppShellProvider } from './providers/AppShellProvider'
import { useDesktopStore } from './store/useDesktopStore'

// 懒加载编辑器
const NoteEditorPane = lazy(() =>
  import('@nicenote/app-shell').then((m) => ({ default: m.NoteEditorPane }))
)

const FavoriteButton = memo(function FavoriteButton({ path }: { path: string }) {
  const isFavorite = useDesktopStore((s) => s.favorites.includes(path))
  const toggleFavorite = useDesktopStore((s) => s.toggleFavorite)

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        toggleFavorite(path)
      }}
      aria-label={isFavorite ? '取消收藏' : '收藏'}
      className="rounded p-1 text-muted-foreground/60 transition-colors hover:text-yellow-500"
    >
      <Star className={`h-3.5 w-3.5 ${isFavorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
    </button>
  )
})

function AppContent() {
  const { t } = useTranslation()

  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const closeShortcuts = useCallback(() => setShortcutsOpen(false), [])

  const { sidebar, tags, noteTagActions } = useAppShell()

  const { createNote, saveState } = useDesktopStore(
    useShallow((s) => ({
      createNote: s.createNote,
      saveState: s.saveState,
    }))
  )

  const handleCloseSearch = useCallback(() => setSearchOpen(false), [setSearchOpen])

  const shortcutActions = useMemo(
    () => ({
      onSearch: () => setSearchOpen(true),
      onNewNote: () => createNote(),
      onToggleSidebar: () => sidebar.toggle(),
      onShowHelp: () => setShortcutsOpen((prev) => !prev),
    }),
    [setSearchOpen, createNote, sidebar]
  )

  useGlobalShortcuts(shortcutActions)

  const handleShowShortcuts = useCallback(() => setShortcutsOpen(true), [])
  const renderNoteActions = useCallback((noteId: string) => <FavoriteButton path={noteId} />, [])

  const gridColumns = sidebar.isOpen ? `${sidebar.width}px 1fr` : '48px 1fr'

  return (
    <div
      className="grid h-screen"
      style={{
        gridTemplateColumns: gridColumns,
        transition: 'grid-template-columns 300ms ease-in-out',
      }}
    >
      <NotesSidebar
        isMobile={false}
        onShowShortcuts={handleShowShortcuts}
        renderNoteActions={renderNoteActions}
      />

      <EditorErrorBoundary>
        <Suspense
          fallback={
            <div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
              {t('editor.loadingEditor')}
            </div>
          }
        >
          <NoteEditorPane
            isMobile={false}
            saveState={saveState}
            tags={tags}
            noteTagActions={noteTagActions}
          />
        </Suspense>
      </EditorErrorBoundary>

      <SearchDialog open={searchOpen} onClose={handleCloseSearch} />
      <ShortcutsHelpModal open={shortcutsOpen} onClose={closeShortcuts} />
      <Toasts />
    </div>
  )
}

export default function App() {
  const { currentFolder, loadSettings, loadFavorites, loadTagColors } = useDesktopStore(
    useShallow((s) => ({
      currentFolder: s.currentFolder,
      loadSettings: s.loadSettings,
      loadFavorites: s.loadFavorites,
      loadTagColors: s.loadTagColors,
    }))
  )

  // 启动时加载设置、收藏和标签颜色
  useEffect(() => {
    loadSettings()
    loadFavorites()
    loadTagColors()
  }, [loadSettings, loadFavorites, loadTagColors])

  // 注册 Tauri 文件监听事件
  useTauriEvents()

  // 未打开文件夹时显示欢迎页
  if (!currentFolder) {
    return <WelcomePage />
  }

  return (
    <DesktopAppShellProvider>
      <AppContent />
    </DesktopAppShellProvider>
  )
}
