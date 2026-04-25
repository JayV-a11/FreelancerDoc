import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mocks ─────────────────────────────────────────────────────────
const { mockGet, mockPost, mockPatch, mockDelete } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPatch: vi.fn(),
  mockDelete: vi.fn(),
}))

vi.mock('@/lib/axios', () => ({
  api: {
    get: mockGet,
    post: mockPost,
    patch: mockPatch,
    delete: mockDelete,
    defaults: { baseURL: 'http://localhost:3001' },
  },
}))

// ── Imports ───────────────────────────────────────────────────────────────
import {
  listDocuments,
  getDocument,
  createDocument,
  updateDocument,
  changeDocumentStatus,
  deleteDocument,
  sendDocument,
} from './documents.service'

// ── Fixtures ──────────────────────────────────────────────────────────────
const DOC = {
  id: 'd1',
  userId: 'u1',
  templateId: null,
  title: 'Website Proposal',
  clientName: 'Acme Corp',
  clientEmail: 'acme@example.com',
  clientDocument: null,
  content: { blocks: [] },
  status: 'DRAFT' as const,
  totalValue: '1500.00',
  currency: 'BRL',
  validUntil: null,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
}

describe('documents.service', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('listDocuments', () => {
    it('calls GET /documents without params when no status given', async () => {
      mockGet.mockResolvedValueOnce({ data: [DOC] })

      const result = await listDocuments()

      expect(mockGet).toHaveBeenCalledWith('/documents', { params: undefined })
      expect(result).toEqual([DOC])
    })

    it('passes status as query param when provided', async () => {
      mockGet.mockResolvedValueOnce({ data: [DOC] })

      await listDocuments('DRAFT')

      expect(mockGet).toHaveBeenCalledWith('/documents', { params: { status: 'DRAFT' } })
    })
  })

  describe('getDocument', () => {
    it('calls GET /documents/:id', async () => {
      mockGet.mockResolvedValueOnce({ data: DOC })

      const result = await getDocument('d1')

      expect(mockGet).toHaveBeenCalledWith('/documents/d1')
      expect(result).toEqual(DOC)
    })
  })

  describe('createDocument', () => {
    it('calls POST /documents with data', async () => {
      mockPost.mockResolvedValueOnce({ data: DOC })

      const payload = {
        title: 'Website Proposal',
        clientName: 'Acme Corp',
        clientEmail: 'acme@example.com',
        content: { blocks: [] },
        totalValue: 1500,
        currency: 'BRL',
      }

      const result = await createDocument(payload)

      expect(mockPost).toHaveBeenCalledWith('/documents', payload)
      expect(result).toEqual(DOC)
    })
  })

  describe('updateDocument', () => {
    it('calls PATCH /documents/:id with partial data', async () => {
      const updated = { ...DOC, title: 'Updated Proposal' }
      mockPatch.mockResolvedValueOnce({ data: updated })

      const result = await updateDocument('d1', { title: 'Updated Proposal' })

      expect(mockPatch).toHaveBeenCalledWith('/documents/d1', { title: 'Updated Proposal' })
      expect(result).toEqual(updated)
    })
  })

  describe('changeDocumentStatus', () => {
    it('calls PATCH /documents/:id/status with status', async () => {
      const sent = { ...DOC, status: 'SENT' as const }
      mockPatch.mockResolvedValueOnce({ data: sent })

      const result = await changeDocumentStatus('d1', 'SENT')

      expect(mockPatch).toHaveBeenCalledWith('/documents/d1/status', { status: 'SENT' })
      expect(result).toEqual(sent)
    })
  })

  describe('deleteDocument', () => {
    it('calls DELETE /documents/:id', async () => {
      mockDelete.mockResolvedValueOnce({})

      await deleteDocument('d1')

      expect(mockDelete).toHaveBeenCalledWith('/documents/d1')
    })
  })

  describe('sendDocument', () => {
    it('calls POST /documents/:id/send with empty body by default', async () => {
      mockPost.mockResolvedValueOnce({ data: { message: 'Sent to acme@example.com' } })

      const result = await sendDocument('d1')

      expect(mockPost).toHaveBeenCalledWith('/documents/d1/send', {})
      expect(result).toEqual({ message: 'Sent to acme@example.com' })
    })

    it('includes recipientEmail when provided', async () => {
      mockPost.mockResolvedValueOnce({ data: { message: 'Sent to other@example.com' } })

      await sendDocument('d1', { recipientEmail: 'other@example.com' })

      expect(mockPost).toHaveBeenCalledWith('/documents/d1/send', {
        recipientEmail: 'other@example.com',
      })
    })

    it('includes locale and message when provided', async () => {
      mockPost.mockResolvedValueOnce({ data: { message: 'Sent' } })

      await sendDocument('d1', { recipientEmail: 'x@x.com', locale: 'pt-br', message: 'Olá!' })

      expect(mockPost).toHaveBeenCalledWith('/documents/d1/send', {
        recipientEmail: 'x@x.com',
        locale: 'pt-br',
        message: 'Olá!',
      })
    })
  })
})
