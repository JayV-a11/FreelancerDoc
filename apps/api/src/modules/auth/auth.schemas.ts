import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  // 8 char minimum (NIST SP 800-63B); 128 char maximum to cap argon2 input
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters'),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be at most 255 characters'),
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  // No complexity constraints on login — we just verify what's stored
  password: z.string().min(1, 'Password is required'),
})

export type RegisterDto = z.infer<typeof registerSchema>
export type LoginDto = z.infer<typeof loginSchema>
