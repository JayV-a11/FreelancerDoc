import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ConflictError, UnauthorizedError } from '@/shared/errors'

// ── Mocks — hoisted before any imports ────────────────────────────────────
vi.mock('@/shared/config/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    $disconnect: vi.fn(),
  },
}))

vi.mock('@/shared/utils/hash', () => ({
  hashPassword: vi.fn().mockResolvedValue('$argon2id$hashed'),
  verifyPassword: vi.fn().mockResolvedValue(true),
}))

// ── Imports — after mocks are registered ──────────────────────────────────
import { prisma } from '@/shared/config/prisma'
import { hashPassword, verifyPassword } from '@/shared/utils/hash'
import { registerUser, loginUser, getUserById } from './auth.service'

// ── Fixtures ───────────────────────────────────────────────────────────────
const MOCK_USER = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'alice@example.com',
  name: 'Alice',
  passwordHash: '$argon2id$hashed',
  professionalName: null,
  document: null,
  phone: null,
  address: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  deletedAt: null,
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('registerUser', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates user and returns data without passwordHash or deletedAt', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.user.create).mockResolvedValue(MOCK_USER)

    const result = await registerUser({
      email: 'alice@example.com',
      password: 'SecureP@ss1',
      name: 'Alice',
    })

    expect(result).not.toHaveProperty('passwordHash')
    expect(result).not.toHaveProperty('deletedAt')
    expect(result.id).toBe(MOCK_USER.id)
    expect(result.email).toBe(MOCK_USER.email)
    expect(result.name).toBe(MOCK_USER.name)
  })

  it('hashes the password before persisting — never stores plain text', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.user.create).mockResolvedValue(MOCK_USER)

    await registerUser({
      email: 'alice@example.com',
      password: 'SecureP@ss1',
      name: 'Alice',
    })

    expect(hashPassword).toHaveBeenCalledWith('SecureP@ss1')
    const createCall = vi.mocked(prisma.user.create).mock.calls[0]?.[0]
    expect(createCall?.data.passwordHash).toBe('$argon2id$hashed')
    expect(createCall?.data.passwordHash).not.toBe('SecureP@ss1')
  })

  it('throws ConflictError when email is already registered', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER)

    await expect(
      registerUser({ email: 'alice@example.com', password: 'SecureP@ss1', name: 'Alice' }),
    ).rejects.toThrow(ConflictError)
  })

  it('ConflictError message identifies the conflict clearly', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER)

    await expect(
      registerUser({ email: 'alice@example.com', password: 'SecureP@ss1', name: 'Alice' }),
    ).rejects.toThrow('Email already in use')
  })
})

describe('loginUser', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns safe user for valid credentials', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER)
    vi.mocked(verifyPassword).mockResolvedValue(true)

    const result = await loginUser({ email: 'alice@example.com', password: 'SecureP@ss1' })

    expect(result).not.toHaveProperty('passwordHash')
    expect(result).not.toHaveProperty('deletedAt')
    expect(result.id).toBe(MOCK_USER.id)
    expect(result.email).toBe(MOCK_USER.email)
  })

  it('throws UnauthorizedError for wrong password', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER)
    vi.mocked(verifyPassword).mockResolvedValue(false)

    await expect(
      loginUser({ email: 'alice@example.com', password: 'wrong' }),
    ).rejects.toThrow(UnauthorizedError)
  })

  it('throws UnauthorizedError for non-existent email', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    await expect(
      loginUser({ email: 'nobody@example.com', password: 'any' }),
    ).rejects.toThrow(UnauthorizedError)
  })

  it('returns the same error message for missing email and wrong password (no enumeration)', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    const missingUserErr = await loginUser({
      email: 'nobody@example.com',
      password: 'any',
    }).catch((e: Error) => e)

    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER)
    vi.mocked(verifyPassword).mockResolvedValue(false)
    const wrongPassErr = await loginUser({
      email: 'alice@example.com',
      password: 'wrong',
    }).catch((e: Error) => e)

    expect((missingUserErr as Error).message).toBe((wrongPassErr as Error).message)
    expect((missingUserErr as Error).message).toBe('Invalid email or password')
  })

  it('calls verifyPassword even when user does not exist (timing attack prevention)', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    vi.mocked(verifyPassword).mockResolvedValue(false)

    await loginUser({ email: 'nobody@example.com', password: 'any' }).catch(() => {})

    // verifyPassword must always run — skipping it leaks timing information.
    // It must also be called with a valid argon2id hash string, not an empty
    // string, so the argon2 computation actually runs for timing protection.
    expect(verifyPassword).toHaveBeenCalledOnce()
    expect(verifyPassword).toHaveBeenCalledWith(
      expect.stringMatching(/^\$argon2id/),
      'any',
    )
  })

  it('treats soft-deleted users as non-existent', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...MOCK_USER,
      deletedAt: new Date('2026-01-15'),
    })

    await expect(
      loginUser({ email: 'alice@example.com', password: 'SecureP@ss1' }),
    ).rejects.toThrow(UnauthorizedError)
  })

  it('rejects login when the stored password hash is corrupted or unparseable', async () => {
    // A corrupted hash means verifyPassword throws — we must still return
    // UnauthorizedError, never let the exception bubble up to the caller.
    // This kills the `.catch(() => false)` → `.catch(() => true)` mutation.
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...MOCK_USER,
      passwordHash: 'corrupted-hash-value',
    })
    vi.mocked(verifyPassword).mockRejectedValue(new Error('Invalid hash format'))

    await expect(
      loginUser({ email: 'alice@example.com', password: 'SecureP@ss1' }),
    ).rejects.toThrow(UnauthorizedError)
  })
})

describe('getUserById', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns safe user when found', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER)

    const result = await getUserById(MOCK_USER.id)

    expect(result).not.toBeNull()
    expect(result).not.toHaveProperty('passwordHash')
    expect(result?.id).toBe(MOCK_USER.id)
  })

  it('returns null when user not found', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    const result = await getUserById('non-existent-id')

    expect(result).toBeNull()
  })

  it('returns null for soft-deleted users', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...MOCK_USER,
      deletedAt: new Date('2026-01-15'),
    })

    const result = await getUserById(MOCK_USER.id)

    expect(result).toBeNull()
  })
})
