import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NotFoundError, UnauthorizedError, ValidationError } from '@/shared/errors'

// ── Mocks ─────────────────────────────────────────────────────────────────
vi.mock('@/shared/config/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $disconnect: vi.fn(),
  },
}))

vi.mock('@/shared/utils/hash', () => ({
  hashPassword: vi.fn().mockResolvedValue('$argon2id$new_hash'),
  verifyPassword: vi.fn(),
}))

// ── Imports — after mocks ──────────────────────────────────────────────────
import { prisma } from '@/shared/config/prisma'
import { verifyPassword, hashPassword } from '@/shared/utils/hash'
import {
  getProfile,
  updateProfile,
  changePassword,
  softDeleteUser,
} from './users.service'

// ── Fixtures ───────────────────────────────────────────────────────────────
const BASE_USER = {
  id: '550e8400-e29b-41d4-a716-446655440010',
  email: 'alice@example.com',
  name: 'Alice',
  passwordHash: '$argon2id$existing',
  professionalName: null,
  document: null,
  phone: null,
  address: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  deletedAt: null,
}

// ── getProfile ─────────────────────────────────────────────────────────────
describe('getProfile', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns safe user without passwordHash or deletedAt', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(BASE_USER)

    const result = await getProfile(BASE_USER.id)

    expect(result).not.toHaveProperty('passwordHash')
    expect(result).not.toHaveProperty('deletedAt')
    expect(result.id).toBe(BASE_USER.id)
    expect(result.email).toBe(BASE_USER.email)
  })

  it('looks up user with correct where clause', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(BASE_USER)

    await getProfile(BASE_USER.id)

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: BASE_USER.id } })
  })

  it('throws NotFoundError when user does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    await expect(getProfile('non-existent-id')).rejects.toThrow(NotFoundError)
  })

  it('error message identifies the User resource', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    await expect(getProfile('non-existent-id')).rejects.toThrow('User not found')
  })

  it('throws NotFoundError for soft-deleted users', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...BASE_USER,
      deletedAt: new Date('2026-02-01'),
    })

    await expect(getProfile(BASE_USER.id)).rejects.toThrow(NotFoundError)
  })
})

// ── updateProfile ──────────────────────────────────────────────────────────
describe('updateProfile', () => {
  beforeEach(() => vi.clearAllMocks())

  it('updates and returns safe profile', async () => {
    const updated = { ...BASE_USER, name: 'Alice Updated', professionalName: 'Dev' }
    vi.mocked(prisma.user.update).mockResolvedValue(updated)

    const result = await updateProfile(BASE_USER.id, {
      name: 'Alice Updated',
      professionalName: 'Dev',
    })

    expect(result.name).toBe('Alice Updated')
    expect(result.professionalName).toBe('Dev')
    expect(result).not.toHaveProperty('passwordHash')
  })

  it('only passes provided fields to prisma (partial update)', async () => {
    const updated = { ...BASE_USER, phone: '+351 912 345 678' }
    vi.mocked(prisma.user.update).mockResolvedValue(updated)

    await updateProfile(BASE_USER.id, { phone: '+351 912 345 678' })

    const updateCall = vi.mocked(prisma.user.update).mock.calls[0]?.[0]
    expect(updateCall?.data).toEqual({ phone: '+351 912 345 678' })
    // Must NOT include fields that were not provided
    expect(updateCall?.data).not.toHaveProperty('name')
    expect(updateCall?.data).not.toHaveProperty('email')
  })

  it('passes the correct userId as the where clause', async () => {
    vi.mocked(prisma.user.update).mockResolvedValue(BASE_USER)

    await updateProfile(BASE_USER.id, { name: 'New Name' })

    const updateCall = vi.mocked(prisma.user.update).mock.calls[0]?.[0]
    expect(updateCall?.where.id).toBe(BASE_USER.id)
  })
})

// ── changePassword ─────────────────────────────────────────────────────────
describe('changePassword', () => {
  beforeEach(() => vi.clearAllMocks())

  it('hashes the new password and updates the record', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(BASE_USER)
    vi.mocked(verifyPassword).mockResolvedValue(true)
    vi.mocked(prisma.user.update).mockResolvedValue(BASE_USER)

    await changePassword(BASE_USER.id, {
      currentPassword: 'OldP@ss1',
      newPassword: 'NewP@ss2',
    })

    expect(hashPassword).toHaveBeenCalledWith('NewP@ss2')
    const updateCall = vi.mocked(prisma.user.update).mock.calls[0]?.[0]
    expect(updateCall?.data.passwordHash).toBe('$argon2id$new_hash')
    // Must never store the plain-text password
    expect(updateCall?.data.passwordHash).not.toBe('NewP@ss2')
  })

  it('looks up user with correct where clause before verifying password', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(BASE_USER)
    vi.mocked(verifyPassword).mockResolvedValue(true)
    vi.mocked(prisma.user.update).mockResolvedValue(BASE_USER)

    await changePassword(BASE_USER.id, {
      currentPassword: 'OldP@ss1',
      newPassword: 'NewP@ss2',
    })

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: BASE_USER.id } })
  })

  it('updates the record with the correct user id in where clause', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(BASE_USER)
    vi.mocked(verifyPassword).mockResolvedValue(true)
    vi.mocked(prisma.user.update).mockResolvedValue(BASE_USER)

    await changePassword(BASE_USER.id, {
      currentPassword: 'OldP@ss1',
      newPassword: 'NewP@ss2',
    })

    const updateCall = vi.mocked(prisma.user.update).mock.calls[0]?.[0]
    expect(updateCall?.where.id).toBe(BASE_USER.id)
  })

  it('verifies the current password against the stored hash', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(BASE_USER)
    vi.mocked(verifyPassword).mockResolvedValue(true)
    vi.mocked(prisma.user.update).mockResolvedValue(BASE_USER)

    await changePassword(BASE_USER.id, {
      currentPassword: 'OldP@ss1',
      newPassword: 'NewP@ss2',
    })

    expect(verifyPassword).toHaveBeenCalledWith(BASE_USER.passwordHash, 'OldP@ss1')
  })

  it('throws UnauthorizedError when currentPassword is wrong', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(BASE_USER)
    vi.mocked(verifyPassword).mockResolvedValue(false)

    await expect(
      changePassword(BASE_USER.id, {
        currentPassword: 'WrongOld',
        newPassword: 'NewP@ss2',
      }),
    ).rejects.toThrow(UnauthorizedError)
  })

  it('error message for wrong password is "Invalid credentials"', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(BASE_USER)
    vi.mocked(verifyPassword).mockResolvedValue(false)

    await expect(
      changePassword(BASE_USER.id, { currentPassword: 'WrongOld', newPassword: 'NewP@ss2' }),
    ).rejects.toThrow('Invalid credentials')
  })

  it('throws UnauthorizedError when user not found', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    await expect(
      changePassword('unknown-id', {
        currentPassword: 'OldP@ss1',
        newPassword: 'NewP@ss2',
      }),
    ).rejects.toThrow(UnauthorizedError)
  })

  it('error message for missing user is "Invalid credentials"', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    await expect(
      changePassword('unknown-id', { currentPassword: 'OldP@ss1', newPassword: 'NewP@ss2' }),
    ).rejects.toThrow('Invalid credentials')
  })

  it('throws ValidationError when new password equals current password', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(BASE_USER)
    vi.mocked(verifyPassword).mockResolvedValue(true)

    await expect(
      changePassword(BASE_USER.id, {
        currentPassword: 'SameP@ss1',
        newPassword: 'SameP@ss1',
      }),
    ).rejects.toThrow(ValidationError)
  })

  it('error message specifies new password must differ', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(BASE_USER)
    vi.mocked(verifyPassword).mockResolvedValue(true)

    await expect(
      changePassword(BASE_USER.id, { currentPassword: 'SameP@ss1', newPassword: 'SameP@ss1' }),
    ).rejects.toThrow('New password must differ from the current password')
  })

  it('never updates the record if currentPassword verification fails', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(BASE_USER)
    vi.mocked(verifyPassword).mockResolvedValue(false)

    await changePassword(BASE_USER.id, {
      currentPassword: 'Wrong',
      newPassword: 'NewP@ss2',
    }).catch(() => {})

    expect(prisma.user.update).not.toHaveBeenCalled()
  })
})

// ── softDeleteUser ─────────────────────────────────────────────────────────
describe('softDeleteUser', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sets deletedAt to current timestamp (soft delete, not hard delete)', async () => {
    vi.mocked(prisma.user.update).mockResolvedValue({
      ...BASE_USER,
      deletedAt: new Date(),
    })

    await softDeleteUser(BASE_USER.id)

    const updateCall = vi.mocked(prisma.user.update).mock.calls[0]?.[0]
    // Must set deletedAt to a Date, not remove the record
    expect(updateCall?.data.deletedAt).toBeInstanceOf(Date)
    expect(updateCall?.where.id).toBe(BASE_USER.id)
  })

  it('does NOT call prisma.user.delete (only soft-deletes)', async () => {
    vi.mocked(prisma.user.update).mockResolvedValue({
      ...BASE_USER,
      deletedAt: new Date(),
    })

    await softDeleteUser(BASE_USER.id)

    // Ensure hard delete is never called
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((prisma.user as any).delete).toBeUndefined()
  })
})
