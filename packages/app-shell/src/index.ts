// Context
export type { AppShellContextValue } from './context'
export { AppShellContext, useAppShell } from './context'

// Types
export type {
  AppTagInfo,
  NoteTagActions,
  SidebarState,
  Toast,
  ToastAction,
  ToastOptions,
} from './types'

// Components
export { EditorErrorBoundary, ErrorBoundary } from './components/ErrorBoundary'
export type { HighlightSnippetProps } from './components/HighlightSnippet'
export { HighlightSnippet } from './components/HighlightSnippet'
export { NoteEditorPane } from './components/NoteEditorPane'
export { NotesSidebar } from './components/NotesSidebar'
export type {
  SaveState,
  SaveStateIndicatorLabels,
  SaveStateIndicatorProps,
} from './components/SaveStateIndicator'
export { SaveStateIndicator } from './components/SaveStateIndicator'
export { SearchDialog } from './components/SearchDialog'
export { SettingsDropdown } from './components/SettingsDropdown'
export { ShortcutsHelpModal } from './components/ShortcutsHelpModal'
export { TagInput } from './components/TagInput'
export type { TagPillProps } from './components/TagPill'
export { TagPill } from './components/TagPill'
export { Toasts } from './components/Toasts'

// Hooks
export type { GlobalShortcutActions } from './hooks/useGlobalShortcuts'
export { useGlobalShortcuts } from './hooks/useGlobalShortcuts'
export { useMinuteTicker } from './hooks/useMinuteTicker'

// i18n
export { initI18n } from './i18n'
export { default as i18n } from './i18n'

// Stores
export type { SidebarStore } from './store/create-sidebar-store'
export { createSidebarStore } from './store/create-sidebar-store'
export type { ToastStore } from './store/create-toast-store'
export { createToastStore } from './store/create-toast-store'

// Lib
export { applyLanguageToDOM } from './lib/apply-language'
export { applyThemeToDOM } from './lib/apply-theme'
export {
  ICON_BUTTON_CLASS,
  ICON_MD_CLASS,
  ICON_SM_CLASS,
  ROW_WITH_ICON_CLASS,
} from './lib/class-names'
export { getDateLocale } from './lib/date-locale'
export type { ShortcutDefinition } from './lib/shortcuts'
export { formatShortcut, matchesShortcut, MOD_KEY_LABEL, SHORTCUTS } from './lib/shortcuts'
