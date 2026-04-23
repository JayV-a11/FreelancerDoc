import { z } from 'zod'

/** Fields a user may update on their profile (email is intentionally excluded). */
export const updateProfileSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Name cannot be empty')
      .max(255, 'Name must be at most 255 characters')
      .optional(),
    professionalName: z
      .string()
      .max(255, 'Professional name must be at most 255 characters')
      .nullable()
      .optional(),
    document: z
      .string()
      .max(20, 'Document must be at most 20 characters')
      .nullable()
      .optional(),
    phone: z
      .string()
      .max(30, 'Phone must be at most 30 characters')
      .nullable()
      .optional(),
    address: z.string().nullable().optional(),
  })
  // At least one field must be provided — an empty PATCH is a no-op and signals a client error.
  .refine(
    (data) => Object.keys(data).length > 0,
    'At least one field must be provided for update',
  )

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .max(128, 'New password must be at most 128 characters'),
})

export type UpdateProfileDto = z.infer<typeof updateProfileSchema>
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>
