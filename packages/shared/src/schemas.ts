import { z } from 'zod'

z.config({ jitless: true })

const isoDateTimeSchema = z.string().datetime({ offset: true })

const MAX_TITLE_LENGTH = 500
const MAX_CONTENT_LENGTH = 100_000

export const noteSelectSchema = z
  .object({
    id: z.string(),
    title: z.string().max(MAX_TITLE_LENGTH),
    content: z.string().max(MAX_CONTENT_LENGTH).nullable(),
    folderId: z.string().nullable(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict()

export const noteListItemSchema = noteSelectSchema.omit({ content: true }).extend({
  summary: z.string().nullable(),
})

export const noteInsertSchema = z
  .object({
    id: z.string().optional(),
    title: z.string().max(MAX_TITLE_LENGTH).optional(),
    content: z.string().max(MAX_CONTENT_LENGTH).nullable().optional(),
    createdAt: isoDateTimeSchema.optional(),
    updatedAt: isoDateTimeSchema.optional(),
  })
  .strict()

export const noteCreateSchema = z
  .object({
    title: z.string().max(MAX_TITLE_LENGTH).optional(),
    content: z.string().max(MAX_CONTENT_LENGTH).nullable().optional(),
    folderId: z.string().nullable().optional(),
  })
  .strict()

export const noteUpdateSchema = z
  .object({
    title: z.string().max(MAX_TITLE_LENGTH).optional(),
    content: z.string().max(MAX_CONTENT_LENGTH).nullable().optional(),
    folderId: z.string().nullable().optional(),
  })
  .strict()
  .refine(
    (input) =>
      input.title !== undefined || input.content !== undefined || input.folderId !== undefined,
    { message: 'At least one field must be provided for update' }
  )

export const noteIdParamSchema = z
  .object({
    id: z.string().min(1),
  })
  .strict()

export const noteListQuerySchema = z.object({
  cursor: z.string().datetime({ offset: true }).optional(),
  cursorId: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  folderId: z.string().min(1).optional(),
  tagId: z.string().min(1).optional(),
})

export type NoteSelect = z.infer<typeof noteSelectSchema>
export type NoteListItem = z.infer<typeof noteListItemSchema>
export type NoteInsert = z.infer<typeof noteInsertSchema>
export type NoteCreateInput = z.infer<typeof noteCreateSchema>
export type NoteUpdateInput = z.infer<typeof noteUpdateSchema>
export type NoteListQuery = z.infer<typeof noteListQuerySchema>

export interface NoteListResult {
  data: NoteListItem[]
  nextCursor: string | null
  nextCursorId: string | null
}

export const noteSearchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
})

export type NoteSearchQuery = z.infer<typeof noteSearchQuerySchema>

export const noteSearchResultSchema = noteListItemSchema.extend({
  snippet: z.string(),
})

export type NoteSearchResult = z.infer<typeof noteSearchResultSchema>
