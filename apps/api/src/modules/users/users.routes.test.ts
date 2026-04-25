import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import type { FastifyInstance } from 'fastify'

// ── Mocks ─────────────────────────────────────────────────────────────────
vi.mock('@/shared/config/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $disconnect: vi.fn(),
  },
}))

vi.mock('@/shared/utils/hash', () => ({
  hashPassword: vi.fn().mockResolvedValue('$argon2id$new_hash'),
  verifyPassword: vi.fn().mockResolvedValue(true),
}))

// ── Imports — after mocks ──────────────────────────────────────────────────
import { prisma } from '@/shared/config/prisma'
import { verifyPassword } from '@/shared/utils/hash'
import { buildApp } from '@/app'

// ── Fixtures ───────────────────────────────────────────────────────────────
const TEST_USER = {
  id: '550e8400-e29b-41d4-a716-446655440020',
  email: 'profile@example.com',
  name: 'Profile User',
  passwordHash: '$argon2id$existing',
  professionalName: null,
  document: null,
  phone: null,
  address: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  deletedAt: null,
}

// ── Test Suite ─────────────────────────────────────────────────────────────
describe('Users Routes', () => {
  let app: FastifyInstance
  let validToken: string

  beforeAll(async () => {
    app = await buildApp()

    // Sign a valid access token for the test user
    validToken = app.jwt.sign({
      sub: TEST_USER.id,
      email: TEST_USER.email,
      role: 'authenticated' as const,
    })
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── GET /users/me ──────────────────────────────────────────────────────
  describe('GET /users/me', () => {
    it('returns 200 with the authenticated user profile', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(TEST_USER)

      const response = await app.inject({
        method: 'GET',
        url: '/users/me',
        headers: { Authorization: `Bearer ${validToken}` },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json<{ id: string; email: string; name: string }>()
      expect(body.id).toBe(TEST_USER.id)
      expect(body.email).toBe(TEST_USER.email)
      expect(body.name).toBe(TEST_USER.name)
    })

    it('never exposes passwordHash in the response', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(TEST_USER)

      const response = await app.inject({
        method: 'GET',
        url: '/users/me',
        headers: { Authorization: `Bearer ${validToken}` },
      })

      expect(JSON.stringify(response.json())).not.toContain('passwordHash')
      expect(JSON.stringify(response.json())).not.toContain('password_hash')
    })

    it('returns 401 without a Bearer token', async () => {
      const response = await app.inject({ method: 'GET', url: '/users/me' })
      expect(response.statusCode).toBe(401)
    })

    it('returns 401 with an invalid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/users/me',
        headers: { Authorization: 'Bearer invalid.token.here' },
      })
      expect(response.statusCode).toBe(401)
    })

    it('returns 404 when authenticated user has been deleted', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...TEST_USER,
        deletedAt: new Date('2026-02-01'),
      })

      const response = await app.inject({
        method: 'GET',
        url: '/users/me',
        headers: { Authorization: `Bearer ${validToken}` },
      })

      expect(response.statusCode).toBe(404)
    })
  })

  // ── PATCH /users/me ────────────────────────────────────────────────────
  describe('PATCH /users/me', () => {
    it('returns 200 with updated profile', async () => {
      const updated = {
        ...TEST_USER,
        name: 'Updated Name',
        professionalName: 'Freelance Dev',
      }
      vi.mocked(prisma.user.update).mockResolvedValue(updated)

      const response = await app.inject({
        method: 'PATCH',
        url: '/users/me',
        headers: { Authorization: `Bearer ${validToken}` },
        payload: { name: 'Updated Name', professionalName: 'Freelance Dev' },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json<{ name: string; professionalName: string }>()
      expect(body.name).toBe('Updated Name')
      expect(body.professionalName).toBe('Freelance Dev')
    })

    it('accepts partial updates — only sends provided fields', async () => {
      vi.mocked(prisma.user.update).mockResolvedValue({
        ...TEST_USER,
        phone: '+351 912 000 000',
      })

      const response = await app.inject({
        method: 'PATCH',
        url: '/users/me',
        headers: { Authorization: `Bearer ${validToken}` },
        payload: { phone: '+351 912 000 000' },
      })

      expect(response.statusCode).toBe(200)
    })

    it('returns 422 for unknown fields in the payload', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/users/me',
        headers: { Authorization: `Bearer ${validToken}` },
        payload: { email: 'newemail@example.com' }, // email is not updatable here
      })

      expect(response.statusCode).toBe(422)
    })

    it('422 body includes specific Zod message, not generic fallback', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/users/me',
        headers: { Authorization: `Bearer ${validToken}` },
        payload: { name: '' }, // triggers min(1) error
      })

      const body = response.json<{ message: string }>()
      expect(body.message).not.toBe('Validation failed')
      expect(body.message).toBe('Name cannot be empty')
    })

    it('returns 422 when name is an empty string', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/users/me',
        headers: { Authorization: `Bearer ${validToken}` },
        payload: { name: '' },
      })

      expect(response.statusCode).toBe(422)
    })

    it('returns 422 when no updatable fields are provided', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/users/me',
        headers: { Authorization: `Bearer ${validToken}` },
        payload: {},
      })

      expect(response.statusCode).toBe(422)
    })

    it('returns 401 without a token', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/users/me',
        payload: { name: 'Test' },
      })
      expect(response.statusCode).toBe(401)
    })
  })

  // ── PATCH /users/me/password ───────────────────────────────────────────
  describe('PATCH /users/me/password', () => {
    it('returns 200 on successful password change', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(TEST_USER)
      vi.mocked(verifyPassword).mockResolvedValue(true)
      vi.mocked(prisma.user.update).mockResolvedValue(TEST_USER)

      const response = await app.inject({
        method: 'PATCH',
        url: '/users/me/password',
        headers: { Authorization: `Bearer ${validToken}` },
        payload: { currentPassword: 'OldP@ss1', newPassword: 'NewP@ss2!' },
      })

      expect(response.statusCode).toBe(200)
      expect(response.json<{ message: string }>().message).toBe('Password updated successfully')
    })

    it('returns 401 when currentPassword is incorrect', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(TEST_USER)
      vi.mocked(verifyPassword).mockResolvedValue(false)

      const response = await app.inject({
        method: 'PATCH',
        url: '/users/me/password',
        headers: { Authorization: `Bearer ${validToken}` },
        payload: { currentPassword: 'WrongOld', newPassword: 'NewP@ss2!' },
      })

      expect(response.statusCode).toBe(401)
    })

    it('returns 422 when newPassword is the same as currentPassword', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(TEST_USER)
      vi.mocked(verifyPassword).mockResolvedValue(true)

      const response = await app.inject({
        method: 'PATCH',
        url: '/users/me/password',
        headers: { Authorization: `Bearer ${validToken}` },
        payload: { currentPassword: 'SameP@ss1!', newPassword: 'SameP@ss1!' },
      })

      expect(response.statusCode).toBe(422)
    })

    it('returns 422 for newPassword shorter than 8 characters', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/users/me/password',
        headers: { Authorization: `Bearer ${validToken}` },
        payload: { currentPassword: 'OldP@ss1', newPassword: 'short' },
      })

      expect(response.statusCode).toBe(422)
    })

    it('returns 422 when currentPassword is missing', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/users/me/password',
        headers: { Authorization: `Bearer ${validToken}` },
        payload: { newPassword: 'NewP@ss2!' },
      })

      expect(response.statusCode).toBe(422)
    })

    it('422 body includes specific Zod message for missing currentPassword', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/users/me/password',
        headers: { Authorization: `Bearer ${validToken}` },
        payload: { currentPassword: '', newPassword: 'NewP@ss2!' }, // empty triggers min(1)
      })

      const body = response.json<{ message: string }>()
      expect(body.message).not.toBe('Validation failed')
      expect(body.message).toBe('Current password is required')
    })

    it('returns 401 without a Bearer token', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/users/me/password',
        payload: { currentPassword: 'OldP@ss1', newPassword: 'NewP@ss2!' },
      })
      expect(response.statusCode).toBe(401)
    })
  })

  // ── DELETE /users/me ───────────────────────────────────────────────────
  describe('DELETE /users/me', () => {
    it('returns 204 and soft-deletes the account', async () => {
      vi.mocked(prisma.user.update).mockResolvedValue({
        ...TEST_USER,
        deletedAt: new Date(),
      })

      const response = await app.inject({
        method: 'DELETE',
        url: '/users/me',
        headers: { Authorization: `Bearer ${validToken}` },
      })

      expect(response.statusCode).toBe(204)
      // 204 must have no body
      expect(response.body).toBe('')
    })

    it('sets deletedAt on the correct user record', async () => {
      vi.mocked(prisma.user.update).mockResolvedValue({
        ...TEST_USER,
        deletedAt: new Date(),
      })

      await app.inject({
        method: 'DELETE',
        url: '/users/me',
        headers: { Authorization: `Bearer ${validToken}` },
      })

      const updateCall = vi.mocked(prisma.user.update).mock.calls[0]?.[0]
      expect(updateCall?.where.id).toBe(TEST_USER.id)
      expect(updateCall?.data.deletedAt).toBeInstanceOf(Date)
    })

    it('returns 401 without a Bearer token', async () => {
      const response = await app.inject({ method: 'DELETE', url: '/users/me' })
      expect(response.statusCode).toBe(401)
    })
  })
})
