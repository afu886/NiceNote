import { z } from 'zod'

const MAX_FOLDER_NAME_LENGTH = 200

export const folderSelectSchema = z
  .object({
    id: z.string(),
    name: z.string().max(MAX_FOLDER_NAME_LENGTH),
    parentId: z.string().nullable(),
    position: z.number().int(),
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict()

export const folderCreateSchema = z
  .object({
    name: z.string().min(1).max(MAX_FOLDER_NAME_LENGTH),
    parentId: z.string().nullable().optional(),
  })
  .strict()

export const folderUpdateSchema = z
  .object({
    name: z.string().min(1).max(MAX_FOLDER_NAME_LENGTH).optional(),
    parentId: z.string().nullable().optional(),
    position: z.number().int().min(0).optional(),
  })
  .strict()
  .refine(
    (input) =>
      input.name !== undefined || input.parentId !== undefined || input.position !== undefined,
    { message: 'At least one field must be provided for update' }
  )

export const folderIdParamSchema = z
  .object({
    id: z.string().min(1),
  })
  .strict()

export type FolderSelect = z.infer<typeof folderSelectSchema>
export type FolderCreateInput = z.infer<typeof folderCreateSchema>
export type FolderUpdateInput = z.infer<typeof folderUpdateSchema>
