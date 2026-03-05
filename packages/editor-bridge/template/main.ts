/**
 * NiceNote editor WebView bundle entry
 *
 * Runs inside react-native-webview as a self-contained page.
 * Communicates with the host RN app via window.ReactNativeWebView.postMessage
 * and window.addEventListener('message', ...) / document.addEventListener('message', ...).
 */

import { Editor } from '@tiptap/core'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import Typography from '@tiptap/extension-typography'
import { Markdown } from '@tiptap/markdown'
import StarterKit from '@tiptap/starter-kit'

import type { BridgeMessage, EditorCommand, EditorEvent } from '../src/types'

// ──────────────────────────────────────────────────────────────────────────────
// Messenger — sends events back to the RN host
// ──────────────────────────────────────────────────────────────────────────────

interface WindowWithRN extends Window {
  ReactNativeWebView?: { postMessage: (msg: string) => void }
}

function emit(event: EditorEvent): void {
  const msg: BridgeMessage<EditorEvent> = { source: 'nicenote-editor', data: event }
  const payload = JSON.stringify(msg)

  if (typeof window !== 'undefined' && (window as WindowWithRN).ReactNativeWebView) {
    ;(window as WindowWithRN).ReactNativeWebView.postMessage(payload)
  } else {
    // Fallback for dev / desktop iframe environments
    window.parent.postMessage(payload, '*')
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Editor
// ──────────────────────────────────────────────────────────────────────────────

const editor = new Editor({
  element: document.getElementById('app')!,
  extensions: [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: { openOnClick: false },
    }),
    Markdown.configure({ html: false, transformPastedText: true }),
    Placeholder.configure({ placeholder: 'Start writing…' }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Typography,
  ],
  editorProps: {
    attributes: { spellcheck: 'true' },
  },
  onUpdate({ editor }) {
    const content = editor.storage.markdown.getMarkdown()
    emit({ type: 'CONTENT_CHANGED', payload: content })
  },
  onFocus() {
    emit({ type: 'FOCUS_CHANGED', payload: true })
  },
  onBlur() {
    emit({ type: 'FOCUS_CHANGED', payload: false })
  },
  onCreate() {
    emit({ type: 'READY' })
  },
})

// ──────────────────────────────────────────────────────────────────────────────
// Command handler — receives messages from the RN host
// ──────────────────────────────────────────────────────────────────────────────

function handleCommand(cmd: EditorCommand): void {
  switch (cmd.type) {
    case 'SET_CONTENT':
      editor.commands.setContent(cmd.payload, false)
      break
    case 'GET_CONTENT':
      emit({ type: 'CONTENT_CHANGED', payload: editor.storage.markdown.getMarkdown() })
      break
    case 'TOGGLE_SOURCE_MODE':
      // Reserved for future raw-markdown toggle
      break
    case 'SET_EDITABLE':
      editor.setEditable(cmd.payload)
      break
    case 'FOCUS':
      editor.commands.focus()
      break
    case 'BLUR':
      editor.commands.blur()
      break
  }
}

// RN WebView posts to the window
;(window as WindowWithRN).onmessage = (event: MessageEvent) => {
  // Android: document, iOS/macOS: window
  try {
    const msg = JSON.parse(event.data) as BridgeMessage<EditorCommand>
    if (msg.source === 'nicenote-editor') handleCommand(msg.data)
  } catch {
    // ignore non-JSON messages
  }
}
document.addEventListener('message', (event) => {
  try {
    const msg = JSON.parse((event as MessageEvent).data) as BridgeMessage<EditorCommand>
    if (msg.source === 'nicenote-editor') handleCommand(msg.data)
  } catch {
    // ignore
  }
})

// Propagate system theme changes to CSS via color-scheme media
// (the CSS already handles this via @media prefers-color-scheme)
