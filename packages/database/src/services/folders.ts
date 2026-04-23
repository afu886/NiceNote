import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid/non-secure'

import type { Database } from '../db'
import { folders } from '../schema'

export interface FolderRow {
  id: string
  name: string
  parentId: string | null
  position: number
  createdAt: string
  updatedAt: string
}

export class FolderService {
  constructor(private readonly db: Database) {}

  async listAll(): Promise<FolderRow[]> {
    return (await this.db.select().from(folders).all()) as FolderRow[]
  }

  async getById(id: string): Promise<FolderRow | null> {
    return (
      ((await this.db.select().from(folders).where(eq(folders.id, id)).get()) as
        | FolderRow
        | undefined) ?? null
    )
  }

  async create(input: {
    name: string
    parentId?: string | null
    position?: number
  }): Promise<FolderRow> {
    const now = new Date().toISOString()
    const row: FolderRow = {
      id: nanoid(),
      name: input.name,
      parentId: input.parentId ?? null,
      position: input.position ?? 0,
      createdAt: now,
      updatedAt: now,
    }
    await this.db.insert(folders).values(row).run()
    return row
  }

  async update(
    id: string,
    patch: { name?: string; parentId?: string | null; position?: number }
  ): Promise<FolderRow | null> {
    const existing = await this.getById(id)
    if (!existing) return null

    const updated: Partial<FolderRow> = { updatedAt: new Date().toISOString() }
    if (patch.name !== undefined) updated.name = patch.name
    if (patch.parentId !== undefined) updated.parentId = patch.parentId
    if (patch.position !== undefined) updated.position = patch.position

    await this.db.update(folders).set(updated).where(eq(folders.id, id)).run()
    return { ...existing, ...updated }
  }

  async delete(id: string): Promise<void> {
    // Cascade deletes children + nullifies note folder references via FK constraints
    await this.db.delete(folders).where(eq(folders.id, id)).run()
  }
}
