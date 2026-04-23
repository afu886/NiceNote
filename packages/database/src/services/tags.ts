import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid/non-secure'

import type { Database } from '../db'
import { noteTags, tags } from '../schema'

export interface TagRow {
  id: string
  name: string
  color: string | null
  createdAt: string
}

export class TagService {
  constructor(private readonly db: Database) {}

  async listAll(): Promise<TagRow[]> {
    return (await this.db.select().from(tags).all()) as TagRow[]
  }

  async getById(id: string): Promise<TagRow | null> {
    return (
      ((await this.db.select().from(tags).where(eq(tags.id, id)).get()) as TagRow | undefined) ??
      null
    )
  }

  /** Returns all tags attached to a given note. */
  async listByNote(noteId: string): Promise<TagRow[]> {
    return (await this.db
      .select({ id: tags.id, name: tags.name, color: tags.color, createdAt: tags.createdAt })
      .from(tags)
      .innerJoin(noteTags, eq(tags.id, noteTags.tagId))
      .where(eq(noteTags.noteId, noteId))
      .all()) as TagRow[]
  }

  async create(input: { name: string; color?: string | null }): Promise<TagRow> {
    const row: TagRow = {
      id: nanoid(),
      name: input.name,
      color: input.color ?? null,
      createdAt: new Date().toISOString(),
    }
    await this.db.insert(tags).values(row).run()
    return row
  }

  async update(
    id: string,
    patch: { name?: string; color?: string | null }
  ): Promise<TagRow | null> {
    const existing = await this.getById(id)
    if (!existing) return null

    const updated: Partial<TagRow> = {}
    if (patch.name !== undefined) updated.name = patch.name
    if (patch.color !== undefined) updated.color = patch.color

    await this.db.update(tags).set(updated).where(eq(tags.id, id)).run()
    return { ...existing, ...updated }
  }

  async delete(id: string): Promise<void> {
    // noteTags rows cascade-delete via FK
    await this.db.delete(tags).where(eq(tags.id, id)).run()
  }
}
