import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mocks ─────────────────────────────────────────────────────────
const { mockPost, mockSetAccessToken, mockClearAccessToken } = vi.hoisted(() => ({
  mockPost: vi.fn(),
  mockSetAccessToken: vi.fn(),
  mockClearAccessToken: vi.fn(),
}))

vi.mock('@/lib/axios', () => ({
  api: { post: mockPost },
  setAccessToken: mockSetAccessToken,
  clearAccessToken: mockClearAccessToken,
}))

// ── Imports ───────────────────────────────────────────────────────────────
import { login, register, logout } from './auth.service'

// ── Fixtures ──────────────────────────────────────────────────────────────
const AUTH_RESPONSE = {
  accessToken: 'access-token-123',
  user: { id: 'u1', email: 'test@example.com', name: 'Alice' },
}

describe('auth.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('login', () => {
    it('calls POST /auth/login with credentials', async () => {
      mockPost.mockResolvedValueOnce({ data: AUTH_RESPONSE })

      await login({ email: 'test@example.com', password: 'password123' })

      expect(mockPost).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'password123',
      })
    })

    it('stores the access token in memory', async () => {
      mockPost.mockResolvedValueOnce({ data: AUTH_RESPONSE })

      await login({ email: 'test@example.com', password: 'password123' })

      expect(mockSetAccessToken).toHaveBeenCalledWith('access-token-123')
    })

    it('returns the auth response', async () => {
      mockPost.mockResolvedValueOnce({ data: AUTH_RESPONSE })

      const result = await login({ email: 'test@example.com', password: 'password123' })

      expect(result).toEqual(AUTH_RESPONSE)
    })

    it('propagates errors from the API', async () => {
      mockPost.mockRejectedValueOnce(new Error('Network error'))

      await expect(
        login({ email: 'test@example.com', password: 'wrong' }),
      ).rejects.toThrow('Network error')
    })
  })

  describe('register', () => {
    it('calls POST /auth/register with user data', async () => {
      mockPost.mockResolvedValueOnce({ data: AUTH_RESPONSE })

      await register({ email: 'new@example.com', name: 'Bob', password: 'password123' })

      expect(mockPost).toHaveBeenCalledWith('/auth/register', {
        email: 'new@example.com',
        name: 'Bob',
        password: 'password123',
      })
    })

    it('stores the access token after registration', async () => {
      mockPost.mockResolvedValueOnce({ data: AUTH_RESPONSE })

      await register({ email: 'new@example.com', name: 'Bob', password: 'password123' })

      expect(mockSetAccessToken).toHaveBeenCalledWith('access-token-123')
    })
  })

  describe('logout', () => {
    it('calls POST /auth/logout', async () => {
      mockPost.mockResolvedValueOnce({ data: { message: 'ok' } })

      await logout()

      expect(mockPost).toHaveBeenCalledWith('/auth/logout')
    })

    it('clears the access token', async () => {
      mockPost.mockResolvedValueOnce({ data: { message: 'ok' } })

      await logout()

      expect(mockClearAccessToken).toHaveBeenCalled()
    })
  })
})
