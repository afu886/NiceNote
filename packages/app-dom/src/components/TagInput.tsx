import { memo, useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Plus } from 'lucide-react'

import { ICON_SM_CLASS } from '../lib/class-names'
import type { AppTagInfo, NoteTagActions } from '../types'

import { TagPill } from './TagPill'

interface TagInputProps {
  noteId: string
  /** 当前笔记的标签名列表 */
  noteTags: string[]
  availableTags: AppTagInfo[]
  noteTagActions: NoteTagActions
}

export const TagInput = memo(function TagInput({
  noteId,
  noteTags,
  availableTags,
  noteTagActions,
}: TagInputProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const noteTagSet = useMemo(() => new Set(noteTags), [noteTags])

  // 构建标签颜色映射，避免渲染时重复遍历
  const colorMap = useMemo(() => {
    const map: Record<string, string | undefined> = {}
    for (const tag of availableTags) {
      map[tag.name] = tag.color
    }
    return map
  }, [availableTags])

  const filteredTags = useMemo(() => {
    const lower = search.toLowerCase()
    return availableTags.filter(
      (tag) => !noteTagSet.has(tag.name) && tag.name.toLowerCase().includes(lower)
    )
  }, [availableTags, noteTagSet, search])

  const showCreateOption = useMemo(() => {
    if (!search.trim()) return false
    return !availableTags.some((tag) => tag.name.toLowerCase() === search.toLowerCase().trim())
  }, [availableTags, search])

  const handleAddExisting = useCallback(
    (tagName: string) => {
      noteTagActions.addTag(noteId, tagName)
      setSearch('')
      setIsOpen(false)
    },
    [noteId, noteTagActions]
  )

  const handleCreateAndAdd = useCallback(() => {
    const name = search.trim()
    if (!name) return
    noteTagActions.addTag(noteId, name)
    setSearch('')
    setIsOpen(false)
  }, [search, noteId, noteTagActions])

  const handleRemove = useCallback(
    (tagName: string) => {
      noteTagActions.removeTag(noteId, tagName)
    },
    [noteId, noteTagActions]
  )

  const handleOpen = useCallback(() => {
    setIsOpen(true)
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [])

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {noteTags.map((tagName) => (
        <TagPill
          key={tagName}
          label={tagName}
          color={colorMap[tagName] ?? null}
          onRemove={() => handleRemove(tagName)}
          removeLabel={t('tag.removeTag', { name: tagName })}
          className="bg-muted px-2.5"
        />
      ))}

      {isOpen ? (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onBlur={() => {
              // 延迟关闭，允许点击下拉列表项
              setTimeout(() => setIsOpen(false), 200)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setSearch('')
                setIsOpen(false)
              } else if (e.key === 'Enter' && showCreateOption) {
                handleCreateAndAdd()
              } else if (e.key === 'Enter' && filteredTags.length > 0 && filteredTags[0]) {
                handleAddExisting(filteredTags[0].name)
              }
            }}
            placeholder={t('tag.searchOrCreate')}
            className="w-36 rounded-md border border-border bg-background px-2 py-0.5 text-xs outline-none"
          />
          {(filteredTags.length > 0 || showCreateOption) && (
            <div className="absolute top-full left-0 z-50 mt-1 max-h-40 w-48 overflow-y-auto rounded-md border border-border bg-popover shadow-md">
              {filteredTags.map((tag) => (
                <button
                  key={tag.name}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleAddExisting(tag.name)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-accent"
                >
                  {tag.color && (
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                  )}
                  {tag.name}
                </button>
              ))}
              {showCreateOption && (
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleCreateAndAdd}
                  className="flex w-full items-center gap-2 border-t border-border px-3 py-1.5 text-left text-xs text-primary hover:bg-accent"
                >
                  <Plus className="h-3 w-3" />
                  {t('tag.createTag', { name: search.trim() })}
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={handleOpen}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <Plus className={ICON_SM_CLASS} />
          {t('tag.addTag')}
        </button>
      )}
    </div>
  )
})
