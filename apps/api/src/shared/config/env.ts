import { z } from 'zod'

/**
 * Duration string accepted by @fastify/jwt (e.g. '15m', '1h', '7d').
 * Superset of what ms() accepts — we enforce the most common subset.
 */
const durationSchema = z
  .string()
  .regex(
    /^\d+[smhdwMy]$/,
    'Must be a duration string like "15m", "1h", "7d"',
  )

const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),

  // Database — Supabase / PostgreSQL
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  DIRECT_URL: z.string().url('DIRECT_URL must be a valid URL'),

  // Supabase
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  // Service role key is a Supabase-issued JWT — always starts with 'eyJ'
  SUPABASE_SERVICE_KEY: z
    .string()
    .min(1, 'SUPABASE_SERVICE_KEY is required')
    .refine(
      (v) => v.startsWith('eyJ'),
      'SUPABASE_SERVICE_KEY must be a valid Supabase service role JWT (should start with "eyJ")',
    ),

  // JWT — secrets must be at least 256 bits (32 chars) and all distinct
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters (256 bits)'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters (256 bits)'),

  // JWT token lifetimes — configurable per environment
  JWT_ACCESS_EXPIRY: durationSchema.default('15m'),
  JWT_REFRESH_EXPIRY: durationSchema.default('7d'),

  // Cookie signing secret — must be distinct from JWT secrets
  COOKIE_SECRET: z
    .string()
    .min(32, 'COOKIE_SECRET must be at least 32 characters'),

  // CORS — exact origin of the Vercel deployment (no trailing slash)
  ALLOWED_ORIGIN: z.string().url('ALLOWED_ORIGIN must be a valid URL'),

  // SMTP — all fields required (email module depends on all of them)
  SMTP_HOST: z.string().min(1, 'SMTP_HOST is required'),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().min(1, 'SMTP_USER is required'),
  SMTP_PASS: z.string().min(1, 'SMTP_PASS is required'),
  SMTP_FROM: z.string().email('SMTP_FROM must be a valid email address'),
})

export type Env = z.infer<typeof envSchema>

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    process.stderr.write('❌  Invalid environment variables — server will not start:\n')
    process.stderr.write(JSON.stringify(result.error.flatten().fieldErrors, null, 2))
    process.stderr.write('\n')
    process.exit(1)
  }

  const { JWT_SECRET, JWT_REFRESH_SECRET, COOKIE_SECRET } = result.data

  // Guard: all three secrets must be distinct.
  // Using the same value across secrets breaks key rotation and reduces security.
  const uniqueSecrets = new Set([JWT_SECRET, JWT_REFRESH_SECRET, COOKIE_SECRET])
  if (uniqueSecrets.size < 3) {
    process.stderr.write(
      '❌  JWT_SECRET, JWT_REFRESH_SECRET, and COOKIE_SECRET must all be different values\n',
    )
    process.exit(1)
  }

  return result.data
}

export const env = validateEnv()
