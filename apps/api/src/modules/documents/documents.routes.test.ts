import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import type { FastifyInstance } from 'fastify'

// ── Mocks ─────────────────────────────────────────────────────────────────
vi.mock('@/shared/config/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    document: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    documentVersion: {
      create: vi.fn(),
      aggregate: vi.fn(),
    },
    $transaction: vi.fn(),
    $disconnect: vi.fn(),
  },
}))

// ── Imports — after mocks ──────────────────────────────────────────────────
import { prisma } from '@/shared/config/prisma'
import { buildApp } from '@/app'

// ── Fixtures ───────────────────────────────────────────────────────────────
const USER_ID = '550e8400-e29b-41d4-a716-446655440060'
const DOCUMENT_ID = '550e8400-e29b-41d4-a716-446655440061'

const DOCUMENT = {
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
}

const DOCUMENT_WITH_VERSIONS = {
  ...DOCUMENT,
  versions: [
    {
      id: '550e8400-e29b-41d4-a716-446655440062',
      documentId: DOCUMENT_ID,
      content: { blocks: [] },
      version: 1,
      createdAt: new Date('2026-01-01').toISOString(),
    },
  ],
}

const VALID_CREATE_BODY = {
  title: 'Website Proposal',
  clientName: 'Acme Corp',
  clientEmail: 'acme@example.com',
  content: { blocks: [] },
  totalValue: 1500,
}

// ── Test Suite ─────────────────────────────────────────────────────────────
describe('Documents Routes', () => {
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
    // Route the $transaction callback through the same mock instance
    vi.mocked(prisma.$transaction).mockImplementation(
      async (cb: (tx: typeof prisma) => Promise<unknown>) => cb(prisma as unknown as typeof prisma),
    )
  })

  // ── GET /documents ─────────────────────────────────────────────────────
  describe('GET /documents', () => {
    it('returns 200 with an array of documents', async () => {
      vi.mocked(prisma.document.findMany).mockResolvedValue([DOCUMENT] as never)

      const response = await app.inject({
        method: 'GET',
        url: '/documents',
        headers: { Authorization: `Bearer ${validToken}` },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json<{ id: string }[]>()
      expect(body).toHaveLength(1)
      expect(body[0].id).toBe(DOCUMENT_ID)
    })

    it('returns 200 filtered by status query param', async () => {
      vi.mocked(prisma.document.findMany).mockResolvedValue([DOCUMENT] as never)

      const response = await app.inject({
        method: 'GET',
        url: '/documents?status=DRAFT',
        headers: { Authorization: `Bearer ${validToken}` },
      })

      expect(response.statusCode).toBe(200)
    })

    it('returns 422 for invalid status query param', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/documents?status=INVALID',
        headers: { Authorization: `Bearer ${validToken}` },
      })

      expect(response.statusCode).toBe(422)
    })

    it('returns 401 without authentication', async () => {
      const response = await app.inject({ method: 'GET', url: '/documents' })
      expect(response.statusCode).toBe(401)
    })
  })

  // ── POST /documents ────────────────────────────────────────────────────
  describe('POST /documents', () => {
    it('returns 201 with the created document', async () => {
      vi.mocked(prisma.document.create).mockResolvedValue(DOCUMENT as never)
      vi.mocked(prisma.documentVersion.create).mockResolvedValue({} as never)

      const response = await app.inject({
        method: 'POST',
        url: '/documents',
        headers: { Authorization: `Bearer ${validToken}` },
        payload: VALID_CREATE_BODY,
      })

      expect(response.statusCode).toBe(201)
      const body = response.json<{ id: string; status: string }>()
      expect(body.id).toBe(DOCUMENT_ID)
      expect(body.status).toBe('DRAFT')
    })

    it('returns 422 when title is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/documents',
        headers: { Authorization: `Bearer ${validToken}` },
        payload: { ...VALID_CREATE_BODY, title: undefined },
      })

      expect(response.statusCode).toBe(422)
    })

    it('returns 422 when clientEmail is invalid', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/documents',
        headers: { Authorization: `Bearer ${validToken}` },
        payload: { ...VALID_CREATE_BODY, clientEmail: 'not-an-email' },
      })

      expect(response.statusCode).toBe(422)
    })

    it('returns 422 when totalValue is not positive', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/documents',
        headers: { Authorization: `Bearer ${validToken}` },
        payload: { ...VALID_CREATE_BODY, totalValue: -50 },
      })

      expect(response.statusCode).toBe(422)
    })

    it('returns 422 when content is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/documents',
        headers: { Authorization: `Bearer ${validToken}` },
        payload: { ...VALID_CREATE_BODY, content: undefined },
      })

      expect(response.statusCode).toBe(422)
    })

    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/documents',
        payload: VALID_CREATE_BODY,
      })
      expect(response.statusCode).toBe(401)
    })
  })

  // ── GET /documents/:id ─────────────────────────────────────────────────
  describe('GET /documents/:id', () => {
    it('returns 200 with document and versions', async () => {
      vi.mocked(prisma.document.findFirst).mockResolvedValue(
        DOCUMENT_WITH_VERSIONS as never,
      )

      const response = await app.inject({
        method: 'GET',
        url: `/documents/${DOCUMENT_ID}`,
        headers: { Authorization: `Bearer ${validToken}` },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json<{ id: string; versions: unknown[] }>()
      expect(body.id).toBe(DOCUMENT_ID)
      expect(body.versions).toHaveLength(1)
    })

    it('returns 404 when document does not exist', async () => {
      vi.mocked(prisma.document.findFirst).mockResolvedValue(null)

      const response = await app.inject({
        method: 'GET',
        url: `/documents/non-existent`,
        headers: { Authorization: `Bearer ${validToken}` },
      })

      expect(response.statusCode).toBe(404)
    })

    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/documents/${DOCUMENT_ID}`,
      })
      expect(response.statusCode).toBe(401)
    })
  })

  // ── PATCH /documents/:id ───────────────────────────────────────────────
  describe('PATCH /documents/:id', () => {
    it('returns 200 with the updated document', async () => {
      vi.mocked(prisma.document.findFirst).mockResolvedValue(DOCUMENT as never)
      const updated = { ...DOCUMENT, title: 'Updated Title' }
      vi.mocked(prisma.document.update).mockResolvedValue(updated as never)

      const response = await app.inject({
        method: 'PATCH',
        url: `/documents/${DOCUMENT_ID}`,
        headers: { Authorization: `Bearer ${validToken}` },
        payload: { title: 'Updated Title' },
      })

      expect(response.statusCode).toBe(200)
      expect(response.json<{ title: string }>().title).toBe('Updated Title')
    })

    it('returns 404 when document does not exist', async () => {
      vi.mocked(prisma.document.findFirst).mockResolvedValue(null)

      const response = await app.inject({
        method: 'PATCH',
        url: `/documents/non-existent`,
        headers: { Authorization: `Bearer ${validToken}` },
        payload: { title: 'Updated' },
      })

      expect(response.statusCode).toBe(404)
    })

    it('returns 422 when body is empty', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/documents/${DOCUMENT_ID}`,
        headers: { Authorization: `Bearer ${validToken}` },
        payload: {},
      })

      expect(response.statusCode).toBe(422)
    })

    it('returns 422 when totalValue is zero', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/documents/${DOCUMENT_ID}`,
        headers: { Authorization: `Bearer ${validToken}` },
        payload: { totalValue: 0 },
      })

      expect(response.statusCode).toBe(422)
    })

    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/documents/${DOCUMENT_ID}`,
        payload: { title: 'Updated' },
      })
      expect(response.statusCode).toBe(401)
    })
  })

  // ── PATCH /documents/:id/status ────────────────────────────────────────
  describe('PATCH /documents/:id/status', () => {
    it('returns 200 with the updated status', async () => {
      vi.mocked(prisma.document.findFirst).mockResolvedValue(DOCUMENT as never)
      const updated = { ...DOCUMENT, status: 'SENT' }
      vi.mocked(prisma.document.update).mockResolvedValue(updated as never)

      const response = await app.inject({
        method: 'PATCH',
        url: `/documents/${DOCUMENT_ID}/status`,
        headers: { Authorization: `Bearer ${validToken}` },
        payload: { status: 'SENT' },
      })

      expect(response.statusCode).toBe(200)
      expect(response.json<{ status: string }>().status).toBe('SENT')
    })

    it('returns 422 for an invalid status value', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/documents/${DOCUMENT_ID}/status`,
        headers: { Authorization: `Bearer ${validToken}` },
        payload: { status: 'INVALID' },
      })

      expect(response.statusCode).toBe(422)
    })

    it('returns 422 for an invalid transition', async () => {
      vi.mocked(prisma.document.findFirst).mockResolvedValue(DOCUMENT as never)

      const response = await app.inject({
        method: 'PATCH',
        url: `/documents/${DOCUMENT_ID}/status`,
        headers: { Authorization: `Bearer ${validToken}` },
        payload: { status: 'ACCEPTED' }, // DRAFT → ACCEPTED is invalid
      })

      expect(response.statusCode).toBe(422)
    })

    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/documents/${DOCUMENT_ID}/status`,
        payload: { status: 'SENT' },
      })
      expect(response.statusCode).toBe(401)
    })
  })

  // ── DELETE /documents/:id ──────────────────────────────────────────────
  describe('DELETE /documents/:id', () => {
    it('returns 204 with no body', async () => {
      vi.mocked(prisma.document.findFirst).mockResolvedValue(DOCUMENT as never)
      vi.mocked(prisma.document.delete).mockResolvedValue(DOCUMENT as never)

      const response = await app.inject({
        method: 'DELETE',
        url: `/documents/${DOCUMENT_ID}`,
        headers: { Authorization: `Bearer ${validToken}` },
      })

      expect(response.statusCode).toBe(204)
      expect(response.body).toBe('')
    })

    it('returns 404 when document does not exist', async () => {
      vi.mocked(prisma.document.findFirst).mockResolvedValue(null)

      const response = await app.inject({
        method: 'DELETE',
        url: `/documents/non-existent`,
        headers: { Authorization: `Bearer ${validToken}` },
      })

      expect(response.statusCode).toBe(404)
    })

    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/documents/${DOCUMENT_ID}`,
      })
      expect(response.statusCode).toBe(401)
    })
  })
})
