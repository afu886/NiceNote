import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { Editor } from '@tiptap/react'
import { EditorContext, useEditor } from '@tiptap/react'

import type { EditorLabels } from '../core/labels'
import { DEFAULT_EDITOR_LABELS } from '../core/labels'
import {
  hasEditorMarkdownChanged,
  normalizeMarkdownContent,
  readEditorMarkdown,
  writeEditorMarkdown,
} from '../core/serialization'
import { createEditorSnapshotStore } from '../core/snapshot-store'
import { getNoteEditorStateSnapshot } from '../core/state'
import { useIsMobileBreakpoint } from '../hooks/useIsMobileBreakpoint'
import { NOTE_BEHAVIOR_POLICY } from '../preset-note/behavior-policy'
import { createMinimalExtensions } from '../preset-note/minimal-extensions'
import { isToggleSourceModeShortcut } from '../preset-note/shortcuts'

import { NicenoteEditorContent } from './EditorContent'
import { MinimalToolbar } from './Toolbar'

export interface NicenoteEditorProps {
  value?: string
  onChange?: (markdown: string) => void
  isSourceMode?: boolean
  onSourceModeChange?: (enabled: boolean) => void
  className?: string
  labels?: EditorLabels
  isMobile?: boolean
}

function useSourceModeState(props: {
  isSourceMode?: boolean | undefined
  onSourceModeChange?: ((enabled: boolean) => void) | undefined
}) {
  const { isSourceMode: controlledSourceMode, onSourceModeChange } = props
  const [internalSourceMode, setInternalSourceMode] = useState(
    NOTE_BEHAVIOR_POLICY.defaultSourceMode
  )

  const isControlled = controlledSourceMode !== undefined
  const isSourceMode = isControlled ? controlledSourceMode : internalSourceMode

  const setSourceMode = useCallback(
    (nextValue: boolean) => {
      onSourceModeChange?.(nextValue)
      if (!isControlled) {
        setInternalSourceMode(nextValue)
      }
    },
    [isControlled, onSourceModeChange]
  )

  return {
    isSourceMode,
    setSourceMode,
  }
}

export function NicenoteEditor({
  value,
  onChange,
  isSourceMode: controlledSourceMode,
  onSourceModeChange,
  className,
  labels,
  isMobile: isMobileProp,
}: NicenoteEditorProps) {
  const resolvedLabels = labels ?? DEFAULT_EDITOR_LABELS
  const initialMarkdown = useMemo(() => normalizeMarkdownContent(value), [value])
  const isMobileFromHook = useIsMobileBreakpoint()
  const isMobile = isMobileProp ?? isMobileFromHook
  const isApplyingExternalContent = useRef(false)
  const lastEmittedMarkdown = useRef(initialMarkdown)

  const [sourceValue, setSourceValue] = useState(initialMarkdown)
  const snapshotStore = useMemo(() => createEditorSnapshotStore(), [])

  const { isSourceMode, setSourceMode } = useSourceModeState({
    isSourceMode: controlledSourceMode,
    onSourceModeChange,
  })

  const placeholderText = resolvedLabels.content.editorPlaceholder
  const extensions = useMemo(
    () =>
      createMinimalExtensions({
        placeholder: placeholderText,
      }),
    [placeholderText]
  )

  const updateSnapshot = useCallback(
    (nextEditor: Editor | null) => {
      if (!nextEditor) return
      snapshotStore.set(getNoteEditorStateSnapshot(nextEditor))
    },
    [snapshotStore]
  )

  const editor = useEditor({
    immediatelyRender: NOTE_BEHAVIOR_POLICY.immediatelyRender,
    extensions,
    content: '',
    editorProps: {
      attributes: {
        class: 'nn-editor-prosemirror',
        autocomplete: 'off',
        autocorrect: 'off',
        autocapitalize: 'off',
      },
    },
    onCreate: ({ editor: createdEditor }) => {
      isApplyingExternalContent.current = true
      writeEditorMarkdown(createdEditor, initialMarkdown)
      setSourceValue(initialMarkdown)
      lastEmittedMarkdown.current = initialMarkdown
      updateSnapshot(createdEditor)
      isApplyingExternalContent.current = false
    },
    onUpdate: ({ editor: nextEditor }) => {
      updateSnapshot(nextEditor)
      const markdown = readEditorMarkdown(nextEditor)
      setSourceValue(markdown)

      if (isApplyingExternalContent.current) {
        return
      }

      lastEmittedMarkdown.current = markdown
      onChange?.(markdown)
    },
    onSelectionUpdate: ({ editor: nextEditor }) => {
      updateSnapshot(nextEditor)
    },
  })

  useEffect(() => {
    if (!editor) return

    if (!hasEditorMarkdownChanged(editor, initialMarkdown)) {
      setSourceValue(initialMarkdown)
      return
    }

    if (lastEmittedMarkdown.current === initialMarkdown) {
      setSourceValue(initialMarkdown)
      return
    }

    isApplyingExternalContent.current = true
    writeEditorMarkdown(editor, initialMarkdown)
    setSourceValue(initialMarkdown)
    updateSnapshot(editor)
    isApplyingExternalContent.current = false
  }, [editor, initialMarkdown, updateSnapshot])

  useEffect(() => {
    if (!editor || !isSourceMode) return
    setSourceValue(readEditorMarkdown(editor))
  }, [editor, isSourceMode])

  const toggleSourceMode = useCallback(() => {
    if (!NOTE_BEHAVIOR_POLICY.sourceModeEnabled) return
    setSourceMode(!isSourceMode)
  }, [isSourceMode, setSourceMode])

  const commitSourceValue = useCallback(() => {
    if (!editor) return
    const nextMarkdown = normalizeMarkdownContent(sourceValue)
    writeEditorMarkdown(editor, nextMarkdown)
    setSourceValue(nextMarkdown)
    updateSnapshot(editor)
  }, [editor, sourceValue, updateSnapshot])

  const handleContainerKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (!NOTE_BEHAVIOR_POLICY.sourceModeEnabled) return
      if (!isToggleSourceModeShortcut(event.nativeEvent)) return
      event.preventDefault()
      toggleSourceMode()
    },
    [toggleSourceMode]
  )

  return (
    <section
      className={`nn-editor-shell ${className ?? ''}`.trim()}
      onKeyDown={handleContainerKeyDown}
    >
      <EditorContext.Provider value={{ editor }}>
        <MinimalToolbar
          editor={editor}
          snapshotStore={snapshotStore}
          isSourceMode={isSourceMode}
          isMobile={isMobile}
          onToggleSourceMode={toggleSourceMode}
          toolbarLabels={resolvedLabels.toolbar}
          translateValidationError={resolvedLabels.translateValidationError}
        />
        <NicenoteEditorContent
          editor={editor}
          isSourceMode={isSourceMode}
          sourceValue={sourceValue}
          onSourceChange={setSourceValue}
          onSourceBlur={commitSourceValue}
          ariaLabel={resolvedLabels.content.sourceLabel}
          sourcePlaceholder={resolvedLabels.content.sourcePlaceholder}
        />
      </EditorContext.Provider>
    </section>
  )
}
