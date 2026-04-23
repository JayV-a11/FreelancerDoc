import { z } from 'zod'

export const documentStatusSchema = z.enum([
  'DRAFT',
  'SENT',
  'ACCEPTED',
  'REJECTED',
  'EXPIRED',
])

export const createDocumentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be at most 255 characters'),
  clientName: z
    .string()
    .min(1, 'Client name is required')
    .max(255, 'Client name must be at most 255 characters'),
  clientEmail: z
    .string()
    .email('Client email must be a valid email')
    .max(255, 'Client email must be at most 255 characters'),
  clientDocument: z.string().max(20).nullable().optional(),
  content: z.record(z.unknown()),
  totalValue: z.number().positive('Total value must be positive'),
  currency: z.string().length(3, 'Currency must be a 3-character ISO code').default('BRL'),
  validUntil: z.string().datetime({ offset: true }).nullable().optional(),
  templateId: z.string().uuid('Template ID must be a valid UUID').nullable().optional(),
})

export const updateDocumentSchema = z
  .object({
    title: z
      .string()
      .min(1, 'Title is required')
      .max(255, 'Title must be at most 255 characters')
      .optional(),
    clientName: z
      .string()
      .min(1, 'Client name is required')
      .max(255, 'Client name must be at most 255 characters')
      .optional(),
    clientEmail: z
      .string()
      .email('Client email must be a valid email')
      .max(255)
      .optional(),
    clientDocument: z.string().max(20).nullable().optional(),
    content: z.record(z.unknown()).optional(),
    totalValue: z.number().positive('Total value must be positive').optional(),
    currency: z.string().length(3).optional(),
    validUntil: z.string().datetime({ offset: true }).nullable().optional(),
    templateId: z.string().uuid().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  })

export const changeStatusSchema = z.object({
  status: documentStatusSchema,
})

export const listDocumentsQuerySchema = z.object({
  status: documentStatusSchema.optional(),
})

export type CreateDocumentDto = z.infer<typeof createDocumentSchema>
export type UpdateDocumentDto = z.infer<typeof updateDocumentSchema>
export type ChangeStatusDto = z.infer<typeof changeStatusSchema>
export type DocumentStatus = z.infer<typeof documentStatusSchema>
