import { useEffect, useState } from 'react'

import type { Editor } from '@tiptap/react'
import { Button, Input, Popover } from '@topicly-ui/react'
import { Link2, Link2Off } from 'lucide-react'

import type { LinkValidationErrorKey } from '@nicenote/shared'
import { getLinkValidationError } from '@nicenote/shared'

import { clearLink, setLinkHref } from '../core/commands'
import type { NoteEditorStateSnapshot } from '../core/state'

import { EditorToolbarButton } from './EditorToolbarButton'

function getLinkIcon(linkActive: boolean) {
  const LinkIcon = linkActive ? Link2Off : Link2
  return <LinkIcon className="nn-editor-toolbar-icon" />
}

export function LinkToolbarButton({
  editor,
  snapshot,
  isSourceMode,
  isMobile,
  label,
  shortcut,
  cancelLabel = 'Cancel',
  applyLabel = 'Apply',
  translateValidationError,
}: {
  editor: Editor | null
  snapshot: NoteEditorStateSnapshot
  isSourceMode: boolean
  isMobile: boolean
  label: string
  shortcut?: string
  cancelLabel?: string | undefined
  applyLabel?: string | undefined
  translateValidationError?: ((key: LinkValidationErrorKey) => string) | undefined
}) {
  const [open, setOpen] = useState(false)
  const [hrefInput, setHrefInput] = useState('https://')
  const linkActive = snapshot.marks.link
  const disabled = !editor || isSourceMode
  const validationErrorKey = getLinkValidationError(hrefInput)
  const validationError = validationErrorKey
    ? (translateValidationError?.(validationErrorKey) ?? validationErrorKey)
    : null

  useEffect(() => {
    if (!open || !editor) return
    const currentHref = editor.getAttributes('link').href
    setHrefInput(typeof currentHref === 'string' && currentHref.trim() ? currentHref : 'https://')
  }, [open, editor])

  // 链接已激活：直接清除分支，保留 Toolbar.Button（参与键盘 roving 导航）
  if (linkActive) {
    return (
      <EditorToolbarButton
        label={label}
        isMobile={isMobile}
        active
        disabled={disabled}
        onClick={() => clearLink(editor)}
        icon={getLinkIcon(true)}
        {...(shortcut ? { shortcut } : {})}
      />
    )
  }

  const commit = () => {
    if (!editor || validationErrorKey) return
    setLinkHref(editor, hrefInput.trim())
    setOpen(false)
  }

  return (
    <Popover.Root isOpen={open} onOpenChange={setOpen} placement="top-start">
      <Popover.Trigger aria-label={label} disabled={disabled} title={!isMobile ? label : undefined}>
        {getLinkIcon(false)}
      </Popover.Trigger>
      <Popover.Content className="z-popover w-80 space-y-3 p-3">
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault()
            commit()
          }}
        >
          <Input
            type="url"
            value={hrefInput}
            onValueChange={setHrefInput}
            placeholder="https://example.com"
            autoFocus
            isInvalid={Boolean(validationError)}
          />
          <div className="min-h-5 text-xs text-destructive" aria-live="polite">
            {validationError ?? ''}
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onPress={() => setOpen(false)}>
              {cancelLabel}
            </Button>
            <Button variant="primary" isDisabled={Boolean(validationErrorKey)} onPress={commit}>
              {applyLabel}
            </Button>
          </div>
        </form>
      </Popover.Content>
    </Popover.Root>
  )
}
