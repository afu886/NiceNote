import type { NoteId, Tag, TagDraft, TagId, TagPatch, TagRepository } from '@nicenote/core'
import { asTagId } from '@nicenote/core'
import type { TagSelect } from '@nicenote/shared'

const TAGS_STORAGE_KEY = 'nicenote-tags'
const NOTE_TAGS_STORAGE_KEY = 'nicenote-note-tags'

function loadTags(): TagSelect[] {
  try {
    const raw = localStorage.getItem(TAGS_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as TagSelect[]) : []
  } catch {
    return []
  }
}

function saveTags(tags: TagSelect[]): void {
  localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(tags))
}

function loadNoteTags(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(NOTE_TAGS_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, string[]>) : {}
  } catch {
    return {}
  }
}

function saveNoteTags(map: Record<string, string[]>): void {
  localStorage.setItem(NOTE_TAGS_STORAGE_KEY, JSON.stringify(map))
}

function toTag(t: TagSelect): Tag {
  return { id: asTagId(t.id), name: t.name, createdAt: t.createdAt }
}

/**
 * 关系型标签仓储（Web localStorage：nicenote-tags + nicenote-note-tags）。
 * color 不在标签模型内（归 settings 域），此处只承载关系。
 */
export class CoreLocalStorageTagRepository implements TagRepository {
  async listTags(): Promise<Tag[]> {
    return loadTags().map(toTag)
  }

  async createTag(draft: TagDraft): Promise<Tag> {
    const tag: TagSelect = {
      id: crypto.randomUUID(),
      name: draft.name.trim(),
      color: null,
      createdAt: new Date().toISOString(),
    }
    saveTags([...loadTags(), tag])
    return toTag(tag)
  }

  async updateTag(id: TagId, patch: TagPatch): Promise<Tag> {
    const tags = loadTags()
    const idx = tags.findIndex((t) => t.id === id)
    if (idx === -1) throw new Error(`标签不存在: ${id}`)
    const existing = tags[idx]!
    const updated: TagSelect = {
      ...existing,
      name: patch.name ?? existing.name,
    }
    tags[idx] = updated
    saveTags(tags)
    return toTag(updated)
  }

  async deleteTag(id: TagId): Promise<void> {
    saveTags(loadTags().filter((t) => t.id !== id))
    const map = loadNoteTags()
    for (const noteId of Object.keys(map)) {
      map[noteId] = (map[noteId] ?? []).filter((tid) => tid !== id)
    }
    saveNoteTags(map)
  }

  async tagsOf(noteId: NoteId): Promise<Tag[]> {
    const ids = new Set(loadNoteTags()[noteId] ?? [])
    return loadTags()
      .filter((t) => ids.has(t.id))
      .map(toTag)
  }

  async attach(noteId: NoteId, tagId: TagId): Promise<void> {
    const map = loadNoteTags()
    const existing = map[noteId] ?? []
    if (existing.includes(tagId)) return
    map[noteId] = [...existing, tagId]
    saveNoteTags(map)
  }

  async detach(noteId: NoteId, tagId: TagId): Promise<void> {
    const map = loadNoteTags()
    map[noteId] = (map[noteId] ?? []).filter((tid) => tid !== tagId)
    saveNoteTags(map)
  }
}

export function makeCoreTagRepo(): TagRepository {
  return new CoreLocalStorageTagRepository()
}

export function resetWebTags(): void {
  localStorage.removeItem(TAGS_STORAGE_KEY)
  localStorage.removeItem(NOTE_TAGS_STORAGE_KEY)
}
