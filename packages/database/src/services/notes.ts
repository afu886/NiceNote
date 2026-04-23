import { and, desc, eq, isNull, lt, or, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid/non-secure'

import { DEFAULT_NOTE_TITLE } from '@nicenote/shared'

import type { Database } from '../db'
import { notes, noteTags } from '../schema'

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export interface NoteRow {
  id: string
  title: string
  content: string | null
  summary: string | null
  folderId: string | null
  createdAt: string
  updatedAt: string
}

export type NoteListRow = Omit<NoteRow, 'content'>

export interface ListNotesOptions {
  folderId?: string | null
  cursor?: { updatedAt: string; id: string }
  limit?: number
}

export interface SearchNotesOptions {
  query: string
  limit?: number
}

// ──────────────────────────────────────────────────────────────────────────────
// Service
// ──────────────────────────────────────────────────────────────────────────────

export class NoteService {
  constructor(private readonly db: Database) {}

  async list(
    opts: ListNotesOptions = {}
  ): Promise<{ data: NoteListRow[]; nextCursor: string | null }> {
    const limit = opts.limit ?? 50

    const rows = await this.db
      .select({
        id: notes.id,
        title: notes.title,
        summary: notes.summary,
        folderId: notes.folderId,
        createdAt: notes.createdAt,
        updatedAt: notes.updatedAt,
      })
      .from(notes)
      .where(
        and(
          opts.folderId === null
            ? isNull(notes.folderId)
            : opts.folderId !== undefined
              ? eq(notes.folderId, opts.folderId)
              : undefined,
          opts.cursor
            ? or(
                lt(notes.updatedAt, opts.cursor.updatedAt),
                and(eq(notes.updatedAt, opts.cursor.updatedAt), lt(notes.id, opts.cursor.id))
              )
            : undefined
        )
      )
      .orderBy(desc(notes.updatedAt), desc(notes.id))
      .limit(limit + 1)
      .all()

    const hasMore = rows.length > limit
    const data = (hasMore ? rows.slice(0, limit) : rows) as NoteListRow[]
    const last = data.at(-1)
    const nextCursor = hasMore && last ? `${last.updatedAt}__${last.id}` : null

    return { data, nextCursor }
  }

  async getById(id: string): Promise<NoteRow | null> {
    return (
      ((await this.db.select().from(notes).where(eq(notes.id, id)).get()) as NoteRow | undefined) ??
      null
    )
  }

  async search(opts: SearchNotesOptions): Promise<NoteListRow[]> {
    const limit = opts.limit ?? 20
    // Escape special FTS5 characters
    const term = opts.query.replace(/['"*]/g, ' ').trim()
    if (!term) return []

    return (await this.db
      .select({
        id: notes.id,
        title: notes.title,
        summary: notes.summary,
        folderId: notes.folderId,
        createdAt: notes.createdAt,
        updatedAt: notes.updatedAt,
      })
      .from(notes)
      .where(
        sql`notes.id IN (
          SELECT id FROM notes_fts
          WHERE notes_fts MATCH ${term + '*'}
          ORDER BY rank
          LIMIT ${limit}
        )`
      )
      .all()) as NoteListRow[]
  }

  async create(input: {
    title?: string
    content?: string | null
    folderId?: string | null
  }): Promise<NoteRow> {
    const now = new Date().toISOString()
    const row: NoteRow = {
      id: nanoid(),
      title: input.title ?? DEFAULT_NOTE_TITLE,
      content: input.content ?? null,
      summary: null,
      folderId: input.folderId ?? null,
      createdAt: now,
      updatedAt: now,
    }
    await this.db.insert(notes).values(row).run()
    return row
  }

  async update(
    id: string,
    patch: {
      title?: string
      content?: string | null
      summary?: string | null
      folderId?: string | null
    }
  ): Promise<NoteRow | null> {
    const existing = await this.getById(id)
    if (!existing) return null

    const updated: Partial<NoteRow> = {
      updatedAt: new Date().toISOString(),
    }
    if (patch.title !== undefined) updated.title = patch.title
    if (patch.content !== undefined) updated.content = patch.content
    if (patch.summary !== undefined) updated.summary = patch.summary
    if (patch.folderId !== undefined) updated.folderId = patch.folderId

    await this.db.update(notes).set(updated).where(eq(notes.id, id)).run()
    return { ...existing, ...updated }
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(notes).where(eq(notes.id, id)).run()
  }

  /** Attach / detach tags (replaces the full tag set for the note). */
  async setTags(noteId: string, tagIds: string[]): Promise<void> {
    await this.db.delete(noteTags).where(eq(noteTags.noteId, noteId)).run()
    if (tagIds.length === 0) return
    await this.db
      .insert(noteTags)
      .values(tagIds.map((tagId) => ({ noteId, tagId })))
      .run()
  }
}
