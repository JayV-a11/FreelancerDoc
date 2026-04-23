import { prisma } from '@/shared/config/prisma'
import { hashPassword, verifyPassword } from '@/shared/utils/hash'
import { ConflictError, UnauthorizedError } from '@/shared/errors'
import type { User } from '@prisma/client'
import type { RegisterDto, LoginDto } from './auth.schemas'

/** User object safe to return to callers — no secret or soft-delete fields. */
export type SafeUser = Omit<User, 'passwordHash' | 'deletedAt'>

/**
 * Dummy argon2id hash used for timing-safe rejection on the "user not found"
 * path of loginUser. Running verifyPassword against this hash ensures the
 * response time is indistinguishable from a real wrong-password attempt,
 * preventing timing-based email enumeration.
 *
 * The hash is syntactically valid argon2id — verifyPassword will return false.
 * If it throws for any reason, the .catch(() => false) handles it gracefully.
 *
 * To regenerate: npx tsx -e "
 *   import { hashPassword } from './src/shared/utils/hash';
 *   hashPassword('timing-dummy').then(console.log)"
 */
const DUMMY_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$dGltaW5nLWR1bW15c2FsdA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'

// ── Register ──────────────────────────────────────────────────────────────

export async function registerUser(data: RegisterDto): Promise<SafeUser> {
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  })
  if (existing) throw new ConflictError('Email already in use')

  const passwordHash = await hashPassword(data.password)
  const user = await prisma.user.create({
    data: { email: data.email, passwordHash, name: data.name },
  })

  const { passwordHash: _, deletedAt: __, ...safeUser } = user
  return safeUser
}

// ── Login ─────────────────────────────────────────────────────────────────

export async function loginUser(data: LoginDto): Promise<SafeUser> {
  const user = await prisma.user.findUnique({
    where: { email: data.email },
  })

  // Always run password verification regardless of whether the user exists.
  // This ensures consistent response timing, preventing timing-based email enumeration.
  // Rate limiting on this route provides the primary brute-force protection.
  const hashToVerify = user?.passwordHash ?? DUMMY_HASH
  const valid = await verifyPassword(hashToVerify, data.password).catch(() => false)

  // Treat soft-deleted accounts the same as non-existent (no information leakage)
  if (!user || user.deletedAt !== null || !valid) {
    throw new UnauthorizedError('Invalid email or password')
  }

  const { passwordHash: _, deletedAt: __, ...safeUser } = user
  return safeUser
}

// ── Lookup ────────────────────────────────────────────────────────────────

export async function getUserById(id: string): Promise<SafeUser | null> {
  const user = await prisma.user.findUnique({ where: { id } })
  if (!user || user.deletedAt !== null) return null

  const { passwordHash: _, deletedAt: __, ...safeUser } = user
  return safeUser
}
