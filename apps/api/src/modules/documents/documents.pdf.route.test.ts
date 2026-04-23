import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import type { FastifyInstance } from 'fastify'

// ── Mocks ─────────────────────────────────────────────────────────────────
vi.mock('@/shared/config/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    document: {
      findFirst: vi.fn(),
    },
    documentVersion: {},
    $disconnect: vi.fn(),
  },
}))

vi.mock('@/modules/documents/pdf.service', () => ({
  generateDocumentPdf: vi.fn(),
}))

// ── Imports — after mocks ──────────────────────────────────────────────────
import { prisma } from '@/shared/config/prisma'
import { generateDocumentPdf } from '@/modules/documents/pdf.service'
import { buildApp } from '@/app'

// ── Fixtures ───────────────────────────────────────────────────────────────
const USER_ID = '550e8400-e29b-41d4-a716-446655440080'
const DOCUMENT_ID = '550e8400-e29b-41d4-a716-446655440081'

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

const FAKE_PDF_BUFFER = Buffer.from('%PDF-1.4 fake pdf content')

// ── Test Suite ─────────────────────────────────────────────────────────────
describe('Documents PDF Route', () => {
  let app: FastifyInstance
  let validToken: string

  beforeAll(async () => {
    app = await buildApp()

    validToken = app.jwt.sign({
      sub: USER_ID,
      email: 'freelancer@example.com',
      role: 'authenticated' as const,
    })
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── GET /documents/:id/pdf ─────────────────────────────────────────────
  describe('GET /documents/:id/pdf', () => {
    it('returns 200 with application/pdf content type', async () => {
      vi.mocked(prisma.document.findFirst).mockResolvedValue(
        DOCUMENT_WITH_VERSIONS as never,
      )
      vi.mocked(generateDocumentPdf).mockResolvedValue(FAKE_PDF_BUFFER)

      const response = await app.inject({
        method: 'GET',
        url: `/documents/${DOCUMENT_ID}/pdf`,
        headers: { Authorization: `Bearer ${validToken}` },
      })

      expect(response.statusCode).toBe(200)
      expect(response.headers['content-type']).toContain('application/pdf')
    })

    it('returns Content-Disposition attachment header with sanitized filename', async () => {
      vi.mocked(prisma.document.findFirst).mockResolvedValue(
        DOCUMENT_WITH_VERSIONS as never,
      )
      vi.mocked(generateDocumentPdf).mockResolvedValue(FAKE_PDF_BUFFER)

      const response = await app.inject({
        method: 'GET',
        url: `/documents/${DOCUMENT_ID}/pdf`,
        headers: { Authorization: `Bearer ${validToken}` },
      })

      expect(response.headers['content-disposition']).toContain('attachment')
      expect(response.headers['content-disposition']).toContain('.pdf')
    })

    it('returns the PDF bytes in the response body', async () => {
      vi.mocked(prisma.document.findFirst).mockResolvedValue(
        DOCUMENT_WITH_VERSIONS as never,
      )
      vi.mocked(generateDocumentPdf).mockResolvedValue(FAKE_PDF_BUFFER)

      const response = await app.inject({
        method: 'GET',
        url: `/documents/${DOCUMENT_ID}/pdf`,
        headers: { Authorization: `Bearer ${validToken}` },
      })

      expect(response.rawPayload).toBeInstanceOf(Buffer)
      expect(response.rawPayload.length).toBeGreaterThan(0)
    })

    it('returns 404 when document does not exist', async () => {
      vi.mocked(prisma.document.findFirst).mockResolvedValue(null)

      const response = await app.inject({
        method: 'GET',
        url: `/documents/non-existent/pdf`,
        headers: { Authorization: `Bearer ${validToken}` },
      })

      expect(response.statusCode).toBe(404)
    })

    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/documents/${DOCUMENT_ID}/pdf`,
      })

      expect(response.statusCode).toBe(401)
    })
  })
})
