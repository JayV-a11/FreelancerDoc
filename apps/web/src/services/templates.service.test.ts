import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mocks ─────────────────────────────────────────────────────────
const { mockGet, mockPost, mockPatch, mockDelete } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPatch: vi.fn(),
  mockDelete: vi.fn(),
}))

vi.mock('@/lib/axios', () => ({
  api: { get: mockGet, post: mockPost, patch: mockPatch, delete: mockDelete },
}))

// ── Imports ───────────────────────────────────────────────────────────────
import {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from './templates.service'

// ── Fixtures ──────────────────────────────────────────────────────────────
const TEMPLATE = {
  id: 't1',
  userId: 'u1',
  name: 'Web Proposal',
  type: 'PROPOSAL' as const,
  content: { blocks: [] },
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
}

describe('templates.service', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('listTemplates', () => {
    it('calls GET /templates and returns array', async () => {
      mockGet.mockResolvedValueOnce({ data: [TEMPLATE] })

      const result = await listTemplates()

      expect(mockGet).toHaveBeenCalledWith('/templates')
      expect(result).toEqual([TEMPLATE])
    })
  })

  describe('getTemplate', () => {
    it('calls GET /templates/:id', async () => {
      mockGet.mockResolvedValueOnce({ data: TEMPLATE })

      const result = await getTemplate('t1')

      expect(mockGet).toHaveBeenCalledWith('/templates/t1')
      expect(result).toEqual(TEMPLATE)
    })
  })

  describe('createTemplate', () => {
    it('calls POST /templates with data', async () => {
      mockPost.mockResolvedValueOnce({ data: TEMPLATE })

      const result = await createTemplate({
        name: 'Web Proposal',
        type: 'PROPOSAL',
        content: { blocks: [] },
      })

      expect(mockPost).toHaveBeenCalledWith('/templates', {
        name: 'Web Proposal',
        type: 'PROPOSAL',
        content: { blocks: [] },
      })
      expect(result).toEqual(TEMPLATE)
    })
  })

  describe('updateTemplate', () => {
    it('calls PATCH /templates/:id with partial data', async () => {
      const updated = { ...TEMPLATE, name: 'Updated Proposal' }
      mockPatch.mockResolvedValueOnce({ data: updated })

      const result = await updateTemplate('t1', { name: 'Updated Proposal' })

      expect(mockPatch).toHaveBeenCalledWith('/templates/t1', { name: 'Updated Proposal' })
      expect(result).toEqual(updated)
    })
  })

  describe('deleteTemplate', () => {
    it('calls DELETE /templates/:id', async () => {
      mockDelete.mockResolvedValueOnce({})

      await deleteTemplate('t1')

      expect(mockDelete).toHaveBeenCalledWith('/templates/t1')
    })
  })
})
