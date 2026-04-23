import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mocks ─────────────────────────────────────────────────────────
const { mockGet, mockPatch, mockDelete } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPatch: vi.fn(),
  mockDelete: vi.fn(),
}))

vi.mock('@/lib/axios', () => ({
  api: { get: mockGet, patch: mockPatch, delete: mockDelete },
}))

// ── Imports ───────────────────────────────────────────────────────────────
import { getMe, updateProfile, changePassword, deleteAccount } from './users.service'

// ── Fixtures ──────────────────────────────────────────────────────────────
const FAKE_USER = {
  id: 'u1',
  email: 'alice@example.com',
  name: 'Alice',
  professionalName: 'Alice Freelancer',
  document: null,
  phone: null,
  address: null,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
}

describe('users.service', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('getMe', () => {
    it('calls GET /users/me and returns user', async () => {
      mockGet.mockResolvedValueOnce({ data: FAKE_USER })

      const result = await getMe()

      expect(mockGet).toHaveBeenCalledWith('/users/me')
      expect(result).toEqual(FAKE_USER)
    })
  })

  describe('updateProfile', () => {
    it('calls PATCH /users/me with the payload', async () => {
      const updated = { ...FAKE_USER, name: 'Alice Updated' }
      mockPatch.mockResolvedValueOnce({ data: updated })

      const result = await updateProfile({ name: 'Alice Updated' })

      expect(mockPatch).toHaveBeenCalledWith('/users/me', { name: 'Alice Updated' })
      expect(result).toEqual(updated)
    })
  })

  describe('changePassword', () => {
    it('calls PATCH /users/me/password and returns message', async () => {
      mockPatch.mockResolvedValueOnce({ data: { message: 'Password changed' } })

      const result = await changePassword({
        currentPassword: 'old',
        newPassword: 'newPass123',
      })

      expect(mockPatch).toHaveBeenCalledWith('/users/me/password', {
        currentPassword: 'old',
        newPassword: 'newPass123',
      })
      expect(result).toEqual({ message: 'Password changed' })
    })
  })

  describe('deleteAccount', () => {
    it('calls DELETE /users/me', async () => {
      mockDelete.mockResolvedValueOnce({})

      await deleteAccount()

      expect(mockDelete).toHaveBeenCalledWith('/users/me')
    })
  })
})
