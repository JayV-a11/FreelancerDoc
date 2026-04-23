import { prisma } from '@/shared/config/prisma'
import { hashPassword, verifyPassword } from '@/shared/utils/hash'
import { NotFoundError, UnauthorizedError, ValidationError } from '@/shared/errors'
import type { User } from '@prisma/client'
import type { UpdateProfileDto, ChangePasswordDto } from './users.schemas'

/** User object safe to return — no password hash or soft-delete field. */
export type SafeUser = Omit<User, 'passwordHash' | 'deletedAt'>

// ── Helpers ────────────────────────────────────────────────────────────────

async function findActiveUser(id: string): Promise<User> {
  const user = await prisma.user.findUnique({ where: { id } })
  if (!user || user.deletedAt !== null) throw new NotFoundError('User')
  return user
}

function toSafeUser(user: User): SafeUser {
  const { passwordHash: _, deletedAt: __, ...safe } = user
  return safe
}

// ── getProfile ─────────────────────────────────────────────────────────────

export async function getProfile(userId: string): Promise<SafeUser> {
  const user = await findActiveUser(userId)
  return toSafeUser(user)
}

// ── updateProfile ──────────────────────────────────────────────────────────

export async function updateProfile(
  userId: string,
  data: UpdateProfileDto,
): Promise<SafeUser> {
  const updated = await prisma.user.update({
    where: { id: userId },
    data,
  })
  return toSafeUser(updated)
}

// ── changePassword ─────────────────────────────────────────────────────────

export async function changePassword(
  userId: string,
  dto: ChangePasswordDto,
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new UnauthorizedError('Invalid credentials')

  const valid = await verifyPassword(user.passwordHash, dto.currentPassword)
  if (!valid) throw new UnauthorizedError('Invalid credentials')

  if (dto.currentPassword === dto.newPassword) {
    throw new ValidationError('New password must differ from the current password')
  }

  const passwordHash = await hashPassword(dto.newPassword)
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  })
}

// ── softDeleteUser ─────────────────────────────────────────────────────────

export async function softDeleteUser(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { deletedAt: new Date() },
  })
}
