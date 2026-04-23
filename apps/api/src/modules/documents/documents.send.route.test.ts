import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import type { FastifyInstance } from 'fastify'

// ── Mocks ─────────────────────────────────────────────────────────────────
vi.mock('@/shared/utils/email.service', () => ({
  sendDocumentByEmail: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/shared/config/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    document: { findFirst: vi.fn() },
    documentVersion: { aggregate: vi.fn() },
    $disconnect: vi.fn(),
  },
}))

vi.mock('@/modules/documents/pdf.service', () => ({
  generateDocumentPdf: vi.fn().mockResolvedValue(Buffer.from('%PDF fake')),
}))

// ── Imports — after mocks ──────────────────────────────────────────────────
import { prisma } from '@/shared/config/prisma'
import { sendDocumentByEmail } from '@/shared/utils/email.service'
import { buildApp } from '@/app'

// ── Fixtures ───────────────────────────────────────────────────────────────
const USER_ID = '550e8400-e29b-41d4-a716-446655440090'
const DOCUMENT_ID = '550e8400-e29b-41d4-a716-446655440091'

const DOCUMENT_WITH_VERSIONS = {
  id: DOCUMENT_ID,
  userId: USER_ID,
  templateId: null,
  title: 'Website Proposal',
  clientName: 'Acme Corp',
  clientEmail: 'acme@example.com',
  clientDocument: null,
  content: { blocks: [] },
  status: 'DRAFT',
  totalValue: '1500.00',
  currency: 'BRL',
  validUntil: null,
  createdAt: new Date('2026-01-01').toISOString(),
  updatedAt: new Date('2026-01-01').toISOString(),
  versions: [],
}

const USER_PROFILE = {
  id: USER_ID,
  email: 'alice@example.com',
  name: 'Alice Freelancer',
  passwordHash: '$argon2id$hash',
  professionalName: null,
  document: null,
  phone: null,
  address: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  deletedAt: null,
}

describe('Documents Send Email Route', () => {
  let app: FastifyInstance
  let validToken: string

  beforeAll(async () => {
    app = await buildApp()
    validToken = app.jwt.sign({
      sub: USER_ID,
      email: 'alice@example.com',
      role: 'authenticated' as const,
    })
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.document.findFirst).mockResolvedValue(DOCUMENT_WITH_VERSIONS as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(USER_PROFILE as never)
    vi.mocked(sendDocumentByEmail).mockResolvedValue(undefined)
  })

  describe('POST /documents/:id/send', () => {
    it('returns 200 with success message when email is sent', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/documents/${DOCUMENT_ID}/send`,
        headers: { Authorization: `Bearer ${validToken}` },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json<{ message: string }>()
      expect(body.message).toBeDefined()
    })

    it('returns 200 and sends to document clientEmail by default', async () => {
      await app.inject({
        method: 'POST',
        url: `/documents/${DOCUMENT_ID}/send`,
        headers: { Authorization: `Bearer ${validToken}` },
      })

      expect(sendDocumentByEmail).toHaveBeenCalledOnce()
      const call = vi.mocked(sendDocumentByEmail).mock.calls[0][0]
      expect(call.to).toBe('acme@example.com')
    })

    it('returns 200 and sends to override email when provided', async () => {
      await app.inject({
        method: 'POST',
        url: `/documents/${DOCUMENT_ID}/send`,
        headers: { Authorization: `Bearer ${validToken}` },
        payload: { recipientEmail: 'other@example.com' },
      })

      const call = vi.mocked(sendDocumentByEmail).mock.calls[0][0]
      expect(call.to).toBe('other@example.com')
    })

    it('returns 422 when recipientEmail is present but invalid', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/documents/${DOCUMENT_ID}/send`,
        headers: { Authorization: `Bearer ${validToken}` },
        payload: { recipientEmail: 'not-an-email' },
      })

      expect(response.statusCode).toBe(422)
    })

    it('returns 404 when document does not exist', async () => {
      vi.mocked(prisma.document.findFirst).mockResolvedValue(null)

      const response = await app.inject({
        method: 'POST',
        url: `/documents/non-existent/send`,
        headers: { Authorization: `Bearer ${validToken}` },
      })

      expect(response.statusCode).toBe(404)
    })

    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/documents/${DOCUMENT_ID}/send`,
      })

      expect(response.statusCode).toBe(401)
    })
  })
})
