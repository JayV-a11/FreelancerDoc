import { z } from 'zod'

/**
 * Client-side environment variable validation.
 * Only NEXT_PUBLIC_ variables are available here (embedded at build time).
 * Never put secrets in NEXT_PUBLIC_ variables.
 */
const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z
    .string()
    .url('NEXT_PUBLIC_API_URL must be a valid URL')
    .default('http://localhost:3001'),
})

function validateEnv() {
  const result = envSchema.safeParse({
    NEXT_PUBLIC_API_URL: process.env['NEXT_PUBLIC_API_URL'],
  })

  if (!result.success) {
    throw new Error(
      `Invalid environment variables:\n${JSON.stringify(result.error.flatten().fieldErrors, null, 2)}`,
    )
  }

  return result.data
}

export const env = validateEnv()
