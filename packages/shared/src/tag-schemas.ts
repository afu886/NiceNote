import { z } from 'zod'

const isoDateTimeSchema = z.string().datetime({ offset: true })

const MAX_TAG_NAME_LENGTH = 50
const TAG_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/

export const tagSelectSchema = z
  .object({
    id: z.string(),
    name: z.string().max(MAX_TAG_NAME_LENGTH),
    color: z.string().regex(TAG_COLOR_REGEX).nullable(),
    createdAt: isoDateTimeSchema,
  })
  .strict()

export const tagCreateSchema = z
  .object({
    name: z.string().min(1).max(MAX_TAG_NAME_LENGTH),
    color: z.string().regex(TAG_COLOR_REGEX).nullable().optional(),
  })
  .strict()

export const tagUpdateSchema = z
  .object({
    name: z.string().min(1).max(MAX_TAG_NAME_LENGTH).optional(),
    color: z.string().regex(TAG_COLOR_REGEX).nullable().optional(),
  })
  .strict()
  .refine((input) => input.name !== undefined || input.color !== undefined, {
    message: 'At least one field must be provided for update',
  })

export const tagIdParamSchema = z
  .object({
    id: z.string().min(1),
  })
  .strict()

export const noteTagParamSchema = z
  .object({
    id: z.string().min(1),
    tagId: z.string().min(1),
  })
  .strict()

export type TagSelect = z.infer<typeof tagSelectSchema>
export type TagCreateInput = z.infer<typeof tagCreateSchema>
export type TagUpdateInput = z.infer<typeof tagUpdateSchema>
