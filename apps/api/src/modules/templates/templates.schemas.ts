import { z } from 'zod'

export const templateTypeSchema = z.enum(['PROPOSAL', 'CONTRACT'])

export const createTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be at most 255 characters'),
  type: templateTypeSchema,
  content: z.record(z.unknown()),
})

export const updateTemplateSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Name is required')
      .max(255, 'Name must be at most 255 characters')
      .optional(),
    type: templateTypeSchema.optional(),
    content: z.record(z.unknown()).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  })

export type CreateTemplateDto = z.infer<typeof createTemplateSchema>
export type UpdateTemplateDto = z.infer<typeof updateTemplateSchema>
