import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import type { FastifyInstance } from 'fastify'
import jwt from 'jsonwebtoken'

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
import { verifyPassword } from '@/shared/utils/hash'
import { buildApp } from '@/app'

// ── Fixtures ───────────────────────────────────────────────────────────────
const TEST_USER = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  email: 'test@example.com',
  name: 'Test User',
  passwordHash: '$argon2id$hashed',
  professionalName: null,
  document: null,
  phone: null,
  address: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  deletedAt: null,
}

/** Signs a refresh token using the test secret from test/setup.ts */
function makeRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId }, process.env['JWT_REFRESH_SECRET']!, { expiresIn: '7d' })
}

// ── Test Suite ─────────────────────────────────────────────────────────────
describe('Auth Routes', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildApp()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── POST /auth/register ──────────────────────────────────────────────────
  describe('POST /auth/register', () => {
    it('returns 201 with accessToken and user payload on success', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.user.create).mockResolvedValue(TEST_USER)

      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { email: 'test@example.com', password: 'SecureP@ss1', name: 'Test User' },
      })

      expect(response.statusCode).toBe(201)
      const body = response.json<{ accessToken: string; user: { id: string; email: string } }>()
      expect(typeof body.accessToken).toBe('string')
      expect(body.user.email).toBe('test@example.com')
      expect(body.user.id).toBe(TEST_USER.id)
    })

    it('sets httpOnly refresh_token cookie on success', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.user.create).mockResolvedValue(TEST_USER)

      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { email: 'test@example.com', password: 'SecureP@ss1', name: 'Test User' },
      })

      const setCookie = response.headers['set-cookie'] as string
      expect(setCookie).toBeDefined()
      expect(setCookie).toMatch(/refresh_token=/)
      expect(setCookie).toMatch(/HttpOnly/i)
    })

    it('access token contains correct sub, email, and role claims', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.user.create).mockResolvedValue(TEST_USER)

      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { email: 'test@example.com', password: 'SecureP@ss1', name: 'Test User' },
      })

      const { accessToken } = response.json<{ accessToken: string }>()
      // Decode without verifying signature to inspect the payload claims
      const payload = jwt.decode(accessToken) as { sub: string; email: string; role: string }

      // Each assertion kills the corresponding literal mutation in auth.routes.ts
      expect(payload.sub).toBe(TEST_USER.id)
      expect(payload.email).toBe(TEST_USER.email)
      expect(payload.role).toBe('authenticated')
    })

    it('does not expose passwordHash in the response', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.user.create).mockResolvedValue(TEST_USER)

      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { email: 'test@example.com', password: 'SecureP@ss1', name: 'Test User' },
      })

      const body = response.json<Record<string, unknown>>()
      expect(JSON.stringify(body)).not.toContain('passwordHash')
      expect(JSON.stringify(body)).not.toContain('password_hash')
    })

    it('returns 409 when email is already registered', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(TEST_USER)

      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { email: 'test@example.com', password: 'SecureP@ss1', name: 'Test User' },
      })

      expect(response.statusCode).toBe(409)
    })

    it('returns 422 for invalid email format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { email: 'not-an-email', password: 'SecureP@ss1', name: 'Test' },
      })

      expect(response.statusCode).toBe(422)
    })

    it('422 body includes specific Zod validation message', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { email: 'not-an-email', password: 'SecureP@ss1', name: 'Test' },
      })

      const body = response.json<{ message: string }>()
      expect(body.message).not.toBe('Validation failed')
      expect(body.message).toBe('Invalid email address')
    })

    it('refresh token cookie sub matches the registered user id', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.user.create).mockResolvedValue(TEST_USER)

      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { email: 'test@example.com', password: 'SecureP@ss1', name: 'Test User' },
      })

      const setCookie = response.headers['set-cookie'] as string
      const tokenMatch = setCookie.match(/refresh_token=([^;]+)/)
      expect(tokenMatch).not.toBeNull()
      const decoded = jwt.decode(tokenMatch![1]) as { sub: string }
      expect(decoded.sub).toBe(TEST_USER.id)
    })

    it('returns 422 for password shorter than 8 characters', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { email: 'test@example.com', password: 'short', name: 'Test' },
      })

      expect(response.statusCode).toBe(422)
    })

    it('returns 422 when name is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { email: 'test@example.com', password: 'SecureP@ss1' },
      })

      expect(response.statusCode).toBe(422)
    })
  })

  // ── POST /auth/login ─────────────────────────────────────────────────────
  describe('POST /auth/login', () => {
    it('returns 200 with accessToken on valid credentials', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(TEST_USER)
      vi.mocked(verifyPassword).mockResolvedValue(true)

      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'test@example.com', password: 'SecureP@ss1' },
      })

      expect(response.statusCode).toBe(200)
      expect(response.json<{ accessToken: string }>().accessToken).toBeDefined()
    })

    it('sets httpOnly refresh_token cookie on login', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(TEST_USER)
      vi.mocked(verifyPassword).mockResolvedValue(true)

      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'test@example.com', password: 'SecureP@ss1' },
      })

      const setCookie = response.headers['set-cookie'] as string
      expect(setCookie).toMatch(/refresh_token=/)
      expect(setCookie).toMatch(/HttpOnly/i)
    })

    it('returns 401 for wrong password', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(TEST_USER)
      vi.mocked(verifyPassword).mockResolvedValue(false)

      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'test@example.com', password: 'wrong' },
      })

      expect(response.statusCode).toBe(401)
      expect(response.json<{ message: string }>().message).toBe('Invalid email or password')
    })

    it('returns 401 for non-existent email with the same message as wrong password', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
      const resMissing = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'nobody@example.com', password: 'any' },
      })

      vi.mocked(prisma.user.findUnique).mockResolvedValue(TEST_USER)
      vi.mocked(verifyPassword).mockResolvedValue(false)
      const resWrong = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'test@example.com', password: 'wrong' },
      })

      expect(resMissing.statusCode).toBe(401)
      expect(resWrong.statusCode).toBe(401)
      expect(resMissing.json<{ message: string }>().message).toBe('Invalid email or password')
      expect(resMissing.json<{ message: string }>().message).toBe(
        resWrong.json<{ message: string }>().message,
      )
    })

    it('returns 422 for missing email field', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { password: 'SecureP@ss1' },
      })

      expect(response.statusCode).toBe(422)
    })

    it('422 body includes specific Zod validation message for login', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { password: 'SecureP@ss1' },
      })

      const body = response.json<{ message: string }>()
      expect(body.message).not.toBe('Validation failed')
      expect(body.message.length).toBeGreaterThan(0)
    })

    it('login response body includes user id, email and name', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(TEST_USER)
      vi.mocked(verifyPassword).mockResolvedValue(true)

      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'test@example.com', password: 'SecureP@ss1' },
      })

      const body = response.json<{ user: { id: string; email: string; name: string } }>()
      expect(body.user.id).toBe(TEST_USER.id)
      expect(body.user.email).toBe(TEST_USER.email)
      expect(body.user.name).toBe(TEST_USER.name)
    })

    it('login refresh token cookie sub matches the user id', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(TEST_USER)
      vi.mocked(verifyPassword).mockResolvedValue(true)

      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'test@example.com', password: 'SecureP@ss1' },
      })

      const setCookie = response.headers['set-cookie'] as string
      const tokenMatch = setCookie.match(/refresh_token=([^;]+)/)
      expect(tokenMatch).not.toBeNull()
      const decoded = jwt.decode(tokenMatch![1]) as { sub: string }
      expect(decoded.sub).toBe(TEST_USER.id)
    })

    it('access token contains correct sub, email and role claims', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(TEST_USER)
      vi.mocked(verifyPassword).mockResolvedValue(true)

      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'test@example.com', password: 'SecureP@ss1' },
      })

      const { accessToken } = response.json<{ accessToken: string }>()
      const payload = jwt.decode(accessToken) as { sub: string; email: string; role: string }
      expect(payload.sub).toBe(TEST_USER.id)
      expect(payload.email).toBe(TEST_USER.email)
      expect(payload.role).toBe('authenticated')
    })
  })

  // ── POST /auth/logout ────────────────────────────────────────────────────
  describe('POST /auth/logout', () => {
    it('returns 200 and clears the refresh cookie when authenticated', async () => {
      const accessToken = app.jwt.sign({
        sub: TEST_USER.id,
        email: TEST_USER.email,
        role: 'authenticated' as const,
      })

      const response = await app.inject({
        method: 'POST',
        url: '/auth/logout',
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      expect(response.statusCode).toBe(200)
      expect(response.json<{ message: string }>().message).toBe('Logged out successfully')
      // Set-Cookie header should clear the cookie (value empty or Max-Age=0)
      const setCookie = response.headers['set-cookie'] as string
      expect(setCookie).toBeDefined()
    })

    it('returns 401 when no Bearer token is provided', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/logout',
      })

      expect(response.statusCode).toBe(401)
    })

    it('returns 401 for an invalid/expired Bearer token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/logout',
        headers: { Authorization: 'Bearer totally.invalid.token' },
      })

      expect(response.statusCode).toBe(401)
    })
  })

  // ── POST /auth/refresh ───────────────────────────────────────────────────
  describe('POST /auth/refresh', () => {
    it('returns 200 with new accessToken for a valid refresh cookie', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(TEST_USER)
      const refreshToken = makeRefreshToken(TEST_USER.id)

      const response = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
        cookies: { refresh_token: refreshToken },
      })

      expect(response.statusCode).toBe(200)
      expect(response.json<{ accessToken: string }>().accessToken).toBeDefined()
    })

    it('new access token from refresh contains correct claims', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(TEST_USER)
      const refreshToken = makeRefreshToken(TEST_USER.id)

      const response = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
        cookies: { refresh_token: refreshToken },
      })

      const { accessToken } = response.json<{ accessToken: string }>()
      const payload = jwt.decode(accessToken) as { sub: string; email: string; role: string }
      expect(payload.sub).toBe(TEST_USER.id)
      expect(payload.email).toBe(TEST_USER.email)
      expect(payload.role).toBe('authenticated')
    })

    it('looks up user by id with correct where clause during refresh', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(TEST_USER)
      const refreshToken = makeRefreshToken(TEST_USER.id)

      await app.inject({
        method: 'POST',
        url: '/auth/refresh',
        cookies: { refresh_token: refreshToken },
      })

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: TEST_USER.id } })
    })

    it('rotates the refresh token (new cookie differs from old)', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(TEST_USER)
      const oldRefreshToken = makeRefreshToken(TEST_USER.id)

      const response = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
        cookies: { refresh_token: oldRefreshToken },
      })

      const setCookie = response.headers['set-cookie'] as string
      expect(setCookie).toMatch(/refresh_token=/)
      // The issued cookie value must differ from the one we sent
      expect(setCookie).not.toContain(oldRefreshToken)
    })

    it('returns 401 when no refresh cookie is present', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
      })

      expect(response.statusCode).toBe(401)
      expect(response.json<{ message: string }>().message).toBe('Refresh token missing')
    })

    it('returns 401 for a tampered / invalid refresh token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
        cookies: { refresh_token: 'header.payload.badsignature' },
      })

      expect(response.statusCode).toBe(401)
      expect(response.json<{ message: string }>().message).toBe(
        'Invalid or expired refresh token',
      )
    })

    it('returns 401 when the user no longer exists in the database', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
      const refreshToken = makeRefreshToken('deleted-user-id')

      const response = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
        cookies: { refresh_token: refreshToken },
      })

      expect(response.statusCode).toBe(401)
      expect(response.json<{ message: string }>().message).toBe('User not found')
    })
  })
})
