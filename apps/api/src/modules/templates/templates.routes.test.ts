import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import type { FastifyInstance } from 'fastify'

// ── Mocks ─────────────────────────────────────────────────────────────────
vi.mock('@/shared/config/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    template: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $disconnect: vi.fn(),
  },
}))

// ── Imports — after mocks ──────────────────────────────────────────────────
import { prisma } from '@/shared/config/prisma'
import { buildApp } from '@/app'

// ── Fixtures ───────────────────────────────────────────────────────────────
const USER_ID = '550e8400-e29b-41d4-a716-446655440040'
const TEMPLATE_ID = '550e8400-e29b-41d4-a716-446655440041'

const TEMPLATE = {
  id: TEMPLATE_ID,
  userId: USER_ID,
  name: 'My Proposal',
  type: 'PROPOSAL',
  content: { blocks: [{ type: 'text', value: 'Dear {{client_name}},' }] },
  createdAt: new Date('2026-01-01').toISOString(),
  updatedAt: new Date('2026-01-01').toISOString(),
}

// ── Test Suite ─────────────────────────────────────────────────────────────
describe('Templates Routes', () => {
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

  // ── GET /templates ─────────────────────────────────────────────────────
  describe('GET /templates', () => {
    it('returns 200 with an array of templates', async () => {
      vi.mocked(prisma.template.findMany).mockResolvedValue([TEMPLATE] as never)

      const response = await app.inject({
        method: 'GET',
        url: '/templates',
        headers: { Authorization: `Bearer ${validToken}` },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json<{ id: string }[]>()
      expect(body).toHaveLength(1)
      expect(body[0].id).toBe(TEMPLATE_ID)
    })

    it('returns 200 with an empty array when user has no templates', async () => {
      vi.mocked(prisma.template.findMany).mockResolvedValue([])

      const response = await app.inject({
        method: 'GET',
        url: '/templates',
        headers: { Authorization: `Bearer ${validToken}` },
      })

      expect(response.statusCode).toBe(200)
      expect(response.json()).toEqual([])
    })

    it('returns 401 without authentication', async () => {
      const response = await app.inject({ method: 'GET', url: '/templates' })
      expect(response.statusCode).toBe(401)
    })
  })

  // ── POST /templates ────────────────────────────────────────────────────
  describe('POST /templates', () => {
    it('returns 201 with the created template', async () => {
      vi.mocked(prisma.template.create).mockResolvedValue(TEMPLATE as never)

      const response = await app.inject({
        method: 'POST',
        url: '/templates',
        headers: { Authorization: `Bearer ${validToken}` },
        payload: {
          name: 'My Proposal',
          type: 'PROPOSAL',
          content: { blocks: [] },
        },
      })

      expect(response.statusCode).toBe(201)
      const body = response.json<{ id: string; type: string }>()
      expect(body.id).toBe(TEMPLATE_ID)
      expect(body.type).toBe('PROPOSAL')
    })

    it('returns 201 with CONTRACT type', async () => {
      const contractTemplate = { ...TEMPLATE, type: 'CONTRACT' }
      vi.mocked(prisma.template.create).mockResolvedValue(contractTemplate as never)

      const response = await app.inject({
        method: 'POST',
        url: '/templates',
        headers: { Authorization: `Bearer ${validToken}` },
        payload: {
          name: 'Service Contract',
          type: 'CONTRACT',
          content: { body: 'Terms and conditions...' },
        },
      })

      expect(response.statusCode).toBe(201)
      expect(response.json<{ type: string }>().type).toBe('CONTRACT')
    })

    it('returns 422 when name is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/templates',
        headers: { Authorization: `Bearer ${validToken}` },
        payload: { type: 'PROPOSAL', content: {} },
      })

      expect(response.statusCode).toBe(422)
    })

    it('returns 422 when type is invalid', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/templates',
        headers: { Authorization: `Bearer ${validToken}` },
        payload: { name: 'Test', type: 'INVOICE', content: {} },
      })

      expect(response.statusCode).toBe(422)
    })

    it('returns 422 when content is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/templates',
        headers: { Authorization: `Bearer ${validToken}` },
        payload: { name: 'Test', type: 'PROPOSAL' },
      })

      expect(response.statusCode).toBe(422)
    })

    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/templates',
        payload: { name: 'Test', type: 'PROPOSAL', content: {} },
      })
      expect(response.statusCode).toBe(401)
    })
  })

  // ── GET /templates/:id ─────────────────────────────────────────────────
  describe('GET /templates/:id', () => {
    it('returns 200 with the template', async () => {
      vi.mocked(prisma.template.findFirst).mockResolvedValue(TEMPLATE as never)

      const response = await app.inject({
        method: 'GET',
        url: `/templates/${TEMPLATE_ID}`,
        headers: { Authorization: `Bearer ${validToken}` },
      })

      expect(response.statusCode).toBe(200)
      expect(response.json<{ id: string }>().id).toBe(TEMPLATE_ID)
    })

    it('returns 404 when template does not exist', async () => {
      vi.mocked(prisma.template.findFirst).mockResolvedValue(null)

      const response = await app.inject({
        method: 'GET',
        url: `/templates/non-existent-id`,
        headers: { Authorization: `Bearer ${validToken}` },
      })

      expect(response.statusCode).toBe(404)
    })

    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/templates/${TEMPLATE_ID}`,
      })
      expect(response.statusCode).toBe(401)
    })
  })

  // ── PATCH /templates/:id ───────────────────────────────────────────────
  describe('PATCH /templates/:id', () => {
    it('returns 200 with the updated template', async () => {
      const updated = { ...TEMPLATE, name: 'Updated Proposal' }
      vi.mocked(prisma.template.findFirst).mockResolvedValue(TEMPLATE as never)
      vi.mocked(prisma.template.update).mockResolvedValue(updated as never)

      const response = await app.inject({
        method: 'PATCH',
        url: `/templates/${TEMPLATE_ID}`,
        headers: { Authorization: `Bearer ${validToken}` },
        payload: { name: 'Updated Proposal' },
      })

      expect(response.statusCode).toBe(200)
      expect(response.json<{ name: string }>().name).toBe('Updated Proposal')
    })

    it('returns 404 when template does not exist', async () => {
      vi.mocked(prisma.template.findFirst).mockResolvedValue(null)

      const response = await app.inject({
        method: 'PATCH',
        url: `/templates/non-existent-id`,
        headers: { Authorization: `Bearer ${validToken}` },
        payload: { name: 'Updated' },
      })

      expect(response.statusCode).toBe(404)
    })

    it('returns 422 when body is empty', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/templates/${TEMPLATE_ID}`,
        headers: { Authorization: `Bearer ${validToken}` },
        payload: {},
      })

      expect(response.statusCode).toBe(422)
    })

    it('returns 422 when type is invalid', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/templates/${TEMPLATE_ID}`,
        headers: { Authorization: `Bearer ${validToken}` },
        payload: { type: 'INVALID_TYPE' },
      })

      expect(response.statusCode).toBe(422)
    })

    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/templates/${TEMPLATE_ID}`,
        payload: { name: 'Updated' },
      })
      expect(response.statusCode).toBe(401)
    })
  })

  // ── DELETE /templates/:id ──────────────────────────────────────────────
  describe('DELETE /templates/:id', () => {
    it('returns 204 with no body', async () => {
      vi.mocked(prisma.template.findFirst).mockResolvedValue(TEMPLATE as never)
      vi.mocked(prisma.template.delete).mockResolvedValue(TEMPLATE as never)

      const response = await app.inject({
        method: 'DELETE',
        url: `/templates/${TEMPLATE_ID}`,
        headers: { Authorization: `Bearer ${validToken}` },
      })

      expect(response.statusCode).toBe(204)
      expect(response.body).toBe('')
    })

    it('returns 404 when template does not exist', async () => {
      vi.mocked(prisma.template.findFirst).mockResolvedValue(null)

      const response = await app.inject({
        method: 'DELETE',
        url: `/templates/non-existent-id`,
        headers: { Authorization: `Bearer ${validToken}` },
      })

      expect(response.statusCode).toBe(404)
    })

    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/templates/${TEMPLATE_ID}`,
      })
      expect(response.statusCode).toBe(401)
    })
  })
})
