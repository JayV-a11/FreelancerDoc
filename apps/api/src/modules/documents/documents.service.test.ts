import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NotFoundError, ValidationError } from '@/shared/errors'

// ── Mocks ─────────────────────────────────────────────────────────────────
vi.mock('@/shared/config/prisma', () => ({
  prisma: {
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
import {
  listDocuments,
  getDocument,
  createDocument,
  updateDocument,
  changeDocumentStatus,
  deleteDocument,
} from './documents.service'

// ── Fixtures ───────────────────────────────────────────────────────────────
const USER_ID = '550e8400-e29b-41d4-a716-446655440050'
const OTHER_USER_ID = '550e8400-e29b-41d4-a716-446655440051'
const DOCUMENT_ID = '550e8400-e29b-41d4-a716-446655440052'

const BASE_DOCUMENT = {
  id: DOCUMENT_ID,
  userId: USER_ID,
  templateId: null,
  title: 'Website Proposal',
  clientName: 'Acme Corp',
  clientEmail: 'acme@example.com',
  clientDocument: null,
  content: { blocks: [{ type: 'text', value: 'Dear Acme,' }] },
  status: 'DRAFT' as const,
  totalValue: '1500.00',
  currency: 'BRL',
  validUntil: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

const BASE_VERSION = {
  id: '550e8400-e29b-41d4-a716-446655440053',
  documentId: DOCUMENT_ID,
  content: BASE_DOCUMENT.content,
  version: 1,
  createdAt: new Date('2026-01-01'),
}

// ── listDocuments ──────────────────────────────────────────────────────────
describe('listDocuments', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns all documents for the user in descending order', async () => {
    vi.mocked(prisma.document.findMany).mockResolvedValue([BASE_DOCUMENT] as never)

    const result = await listDocuments(USER_ID)

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(DOCUMENT_ID)
    expect(prisma.document.findMany).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      orderBy: { createdAt: 'desc' },
    })
  })

  it('filters by status when provided', async () => {
    vi.mocked(prisma.document.findMany).mockResolvedValue([BASE_DOCUMENT] as never)

    await listDocuments(USER_ID, 'DRAFT')

    expect(prisma.document.findMany).toHaveBeenCalledWith({
      where: { userId: USER_ID, status: 'DRAFT' },
      orderBy: { createdAt: 'desc' },
    })
  })

  it('does not include status in where clause when not provided', async () => {
    vi.mocked(prisma.document.findMany).mockResolvedValue([])

    await listDocuments(USER_ID)

    const [call] = vi.mocked(prisma.document.findMany).mock.calls
    expect(call?.[0]?.where).not.toHaveProperty('status')
  })

  it('returns empty array when user has no documents', async () => {
    vi.mocked(prisma.document.findMany).mockResolvedValue([])

    const result = await listDocuments(USER_ID)

    expect(result).toEqual([])
  })
})

// ── getDocument ────────────────────────────────────────────────────────────
describe('getDocument', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns document with versions when owned by user', async () => {
    const withVersions = { ...BASE_DOCUMENT, versions: [BASE_VERSION] }
    vi.mocked(prisma.document.findFirst).mockResolvedValue(withVersions as never)

    const result = await getDocument(USER_ID, DOCUMENT_ID)

    expect(result.id).toBe(DOCUMENT_ID)
    expect(result.versions).toHaveLength(1)
    expect(prisma.document.findFirst).toHaveBeenCalledWith({
      where: { id: DOCUMENT_ID, userId: USER_ID },
      include: { versions: { orderBy: { version: 'asc' } } },
    })
  })

  it('throws NotFoundError when document does not exist', async () => {
    vi.mocked(prisma.document.findFirst).mockResolvedValue(null)

    await expect(getDocument(USER_ID, 'non-existent')).rejects.toThrow(NotFoundError)
  })

  it('error message identifies the Document resource', async () => {
    vi.mocked(prisma.document.findFirst).mockResolvedValue(null)

    await expect(getDocument(USER_ID, 'non-existent')).rejects.toThrow('Document not found')
  })

  it('throws NotFoundError when document belongs to another user', async () => {
    vi.mocked(prisma.document.findFirst).mockResolvedValue(null)

    await expect(getDocument(OTHER_USER_ID, DOCUMENT_ID)).rejects.toThrow(NotFoundError)
  })
})

// ── createDocument ─────────────────────────────────────────────────────────
describe('createDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.$transaction).mockImplementation(
      async (cb: (tx: typeof prisma) => Promise<unknown>) => cb(prisma as unknown as typeof prisma),
    )
  })

  it('creates a document and initial version 1 in a transaction', async () => {
    vi.mocked(prisma.document.create).mockResolvedValue(BASE_DOCUMENT as never)
    vi.mocked(prisma.documentVersion.create).mockResolvedValue(BASE_VERSION as never)

    const result = await createDocument(USER_ID, {
      title: 'Website Proposal',
      clientName: 'Acme Corp',
      clientEmail: 'acme@example.com',
      content: BASE_DOCUMENT.content,
      totalValue: 1500,
    })

    expect(result.id).toBe(DOCUMENT_ID)
    expect(prisma.document.create).toHaveBeenCalled()
    expect(prisma.documentVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ documentId: DOCUMENT_ID, version: 1 }),
      }),
    )
  })

  it('sets userId from parameter, not from dto', async () => {
    vi.mocked(prisma.document.create).mockResolvedValue(BASE_DOCUMENT as never)
    vi.mocked(prisma.documentVersion.create).mockResolvedValue(BASE_VERSION as never)

    await createDocument(USER_ID, {
      title: 'Test',
      clientName: 'Client',
      clientEmail: 'client@test.com',
      content: {},
      totalValue: 100,
    })

    expect(prisma.document.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: USER_ID }),
      }),
    )
  })

  it('converts totalValue to string when creating', async () => {
    vi.mocked(prisma.document.create).mockResolvedValue(BASE_DOCUMENT as never)
    vi.mocked(prisma.documentVersion.create).mockResolvedValue(BASE_VERSION as never)

    await createDocument(USER_ID, {
      title: 'Test',
      clientName: 'Client',
      clientEmail: 'client@test.com',
      content: {},
      totalValue: 1500,
    })

    expect(prisma.document.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ totalValue: '1500' }),
      }),
    )
  })

  it('defaults currency to BRL when not provided', async () => {
    vi.mocked(prisma.document.create).mockResolvedValue(BASE_DOCUMENT as never)
    vi.mocked(prisma.documentVersion.create).mockResolvedValue(BASE_VERSION as never)

    await createDocument(USER_ID, {
      title: 'Test',
      clientName: 'Client',
      clientEmail: 'client@test.com',
      content: {},
      totalValue: 100,
    })

    expect(prisma.document.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ currency: 'BRL' }),
      }),
    )
  })

  it('forwards optional fields when provided', async () => {
    const validUntil = new Date('2026-12-31')
    vi.mocked(prisma.document.create).mockResolvedValue(BASE_DOCUMENT as never)
    vi.mocked(prisma.documentVersion.create).mockResolvedValue(BASE_VERSION as never)

    await createDocument(USER_ID, {
      title: 'Test',
      clientName: 'Client',
      clientEmail: 'client@test.com',
      clientDocument: '123.456.789-00',
      content: {},
      totalValue: 100,
      currency: 'USD',
      validUntil,
      templateId: 'tmpl-001',
    })

    expect(prisma.document.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          currency: 'USD',
          validUntil,
          templateId: 'tmpl-001',
          clientDocument: '123.456.789-00',
        }),
      }),
    )
  })

  it('creates the initial version linked to the document id', async () => {
    vi.mocked(prisma.document.create).mockResolvedValue(BASE_DOCUMENT as never)
    vi.mocked(prisma.documentVersion.create).mockResolvedValue(BASE_VERSION as never)

    await createDocument(USER_ID, {
      title: 'Test',
      clientName: 'Client',
      clientEmail: 'client@test.com',
      content: { blocks: [] },
      totalValue: 100,
    })

    expect(prisma.documentVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ documentId: DOCUMENT_ID, version: 1 }),
      }),
    )
  })
})

// ── updateDocument ─────────────────────────────────────────────────────────
describe('updateDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.$transaction).mockImplementation(
      async (cb: (tx: typeof prisma) => Promise<unknown>) => cb(prisma as unknown as typeof prisma),
    )
  })

  it('updates document metadata without creating a new version', async () => {
    vi.mocked(prisma.document.findFirst).mockResolvedValue(BASE_DOCUMENT as never)
    const updated = { ...BASE_DOCUMENT, title: 'New Title' }
    vi.mocked(prisma.document.update).mockResolvedValue(updated as never)

    const result = await updateDocument(USER_ID, DOCUMENT_ID, { title: 'New Title' })

    expect(result.title).toBe('New Title')
    expect(prisma.documentVersion.create).not.toHaveBeenCalled()
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('calls document.update with the correct document id in where clause', async () => {
    vi.mocked(prisma.document.findFirst).mockResolvedValue(BASE_DOCUMENT as never)
    vi.mocked(prisma.document.update).mockResolvedValue(BASE_DOCUMENT as never)

    await updateDocument(USER_ID, DOCUMENT_ID, { title: 'New Title' })

    expect(prisma.document.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: DOCUMENT_ID } }),
    )
  })

  it('converts totalValue to string in update', async () => {
    vi.mocked(prisma.document.findFirst).mockResolvedValue(BASE_DOCUMENT as never)
    vi.mocked(prisma.document.update).mockResolvedValue(BASE_DOCUMENT as never)

    await updateDocument(USER_ID, DOCUMENT_ID, { totalValue: 2000 })

    expect(prisma.document.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ totalValue: '2000' }),
      }),
    )
  })

  it('creates a new version when content is updated', async () => {
    vi.mocked(prisma.document.findFirst).mockResolvedValue(BASE_DOCUMENT as never)
    const newContent = { blocks: [{ type: 'text', value: 'Updated content' }] }
    const updated = { ...BASE_DOCUMENT, content: newContent }
    vi.mocked(prisma.documentVersion.aggregate).mockResolvedValue({ _max: { version: 1 } } as never)
    vi.mocked(prisma.document.update).mockResolvedValue(updated as never)
    vi.mocked(prisma.documentVersion.create).mockResolvedValue({} as never)

    const result = await updateDocument(USER_ID, DOCUMENT_ID, { content: newContent })

    expect(result.content).toEqual(newContent)
    expect(prisma.$transaction).toHaveBeenCalled()
    expect(prisma.documentVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ documentId: DOCUMENT_ID, version: 2 }),
      }),
    )
  })

  it('computes next version as aggregate max + 1', async () => {
    vi.mocked(prisma.document.findFirst).mockResolvedValue(BASE_DOCUMENT as never)
    vi.mocked(prisma.documentVersion.aggregate).mockResolvedValue({ _max: { version: 5 } } as never)
    vi.mocked(prisma.document.update).mockResolvedValue(BASE_DOCUMENT as never)
    vi.mocked(prisma.documentVersion.create).mockResolvedValue({} as never)

    await updateDocument(USER_ID, DOCUMENT_ID, { content: { blocks: [] } })

    expect(prisma.documentVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ version: 6 }),
      }),
    )
  })

  it('defaults version to 1 when aggregate returns null max', async () => {
    vi.mocked(prisma.document.findFirst).mockResolvedValue(BASE_DOCUMENT as never)
    vi.mocked(prisma.documentVersion.aggregate).mockResolvedValue({ _max: { version: null } } as never)
    vi.mocked(prisma.document.update).mockResolvedValue(BASE_DOCUMENT as never)
    vi.mocked(prisma.documentVersion.create).mockResolvedValue({} as never)

    await updateDocument(USER_ID, DOCUMENT_ID, { content: { blocks: [] } })

    expect(prisma.documentVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ version: 1 }),
      }),
    )
  })

  it('throws ValidationError when document is not DRAFT', async () => {
    vi.mocked(prisma.document.findFirst).mockResolvedValue({
      ...BASE_DOCUMENT,
      status: 'SENT',
    } as never)

    await expect(
      updateDocument(USER_ID, DOCUMENT_ID, { title: 'New Title' }),
    ).rejects.toThrow(ValidationError)

    expect(prisma.document.update).not.toHaveBeenCalled()
  })

  it('error message specifies only DRAFT documents can be edited', async () => {
    vi.mocked(prisma.document.findFirst).mockResolvedValue({
      ...BASE_DOCUMENT,
      status: 'SENT',
    } as never)

    await expect(
      updateDocument(USER_ID, DOCUMENT_ID, { title: 'New Title' }),
    ).rejects.toThrow('Only DRAFT documents can be edited')
  })

  it('calls documentVersion.aggregate with exact _max and where clause', async () => {
    vi.mocked(prisma.document.findFirst).mockResolvedValue(BASE_DOCUMENT as never)
    vi.mocked(prisma.documentVersion.aggregate).mockResolvedValue({ _max: { version: 1 } } as never)
    vi.mocked(prisma.document.update).mockResolvedValue(BASE_DOCUMENT as never)
    vi.mocked(prisma.documentVersion.create).mockResolvedValue({} as never)

    await updateDocument(USER_ID, DOCUMENT_ID, { content: { blocks: [] } })

    expect(prisma.documentVersion.aggregate).toHaveBeenCalledWith({
      _max: { version: true },
      where: { documentId: DOCUMENT_ID },
    })
  })

  it('creates new version with exact documentId, content and version in data', async () => {
    const newContent = { blocks: [{ type: 'heading', value: 'Updated' }] }
    vi.mocked(prisma.document.findFirst).mockResolvedValue(BASE_DOCUMENT as never)
    vi.mocked(prisma.documentVersion.aggregate).mockResolvedValue({ _max: { version: 3 } } as never)
    vi.mocked(prisma.document.update).mockResolvedValue(BASE_DOCUMENT as never)
    vi.mocked(prisma.documentVersion.create).mockResolvedValue({} as never)

    await updateDocument(USER_ID, DOCUMENT_ID, { content: newContent })

    expect(prisma.documentVersion.create).toHaveBeenCalledWith({
      data: { documentId: DOCUMENT_ID, content: newContent, version: 4 },
    })
  })

  it('calls document.update with exact where id and content data in transaction', async () => {
    const newContent = { blocks: [] }
    vi.mocked(prisma.document.findFirst).mockResolvedValue(BASE_DOCUMENT as never)
    vi.mocked(prisma.documentVersion.aggregate).mockResolvedValue({ _max: { version: 1 } } as never)
    vi.mocked(prisma.document.update).mockResolvedValue(BASE_DOCUMENT as never)
    vi.mocked(prisma.documentVersion.create).mockResolvedValue({} as never)

    await updateDocument(USER_ID, DOCUMENT_ID, { content: newContent })

    expect(prisma.document.update).toHaveBeenCalledWith({
      where: { id: DOCUMENT_ID },
      data: { content: newContent },
    })
  })

  it('throws NotFoundError when document not owned by user', async () => {
    vi.mocked(prisma.document.findFirst).mockResolvedValue(null)

    await expect(
      updateDocument(OTHER_USER_ID, DOCUMENT_ID, { title: 'New Title' }),
    ).rejects.toThrow(NotFoundError)
  })
})

// ── changeDocumentStatus ───────────────────────────────────────────────────
describe('changeDocumentStatus', () => {
  beforeEach(() => vi.clearAllMocks())

  it('transitions DRAFT to SENT', async () => {
    vi.mocked(prisma.document.findFirst).mockResolvedValue(BASE_DOCUMENT as never)
    const updated = { ...BASE_DOCUMENT, status: 'SENT' }
    vi.mocked(prisma.document.update).mockResolvedValue(updated as never)

    const result = await changeDocumentStatus(USER_ID, DOCUMENT_ID, 'SENT')

    expect(result.status).toBe('SENT')
  })

  it('calls document.update with the correct document id in where clause', async () => {
    vi.mocked(prisma.document.findFirst).mockResolvedValue(BASE_DOCUMENT as never)
    vi.mocked(prisma.document.update).mockResolvedValue({ ...BASE_DOCUMENT, status: 'SENT' } as never)

    await changeDocumentStatus(USER_ID, DOCUMENT_ID, 'SENT')

    expect(prisma.document.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: DOCUMENT_ID } }),
    )
  })

  it('calls document.update with the new status in data', async () => {
    vi.mocked(prisma.document.findFirst).mockResolvedValue(BASE_DOCUMENT as never)
    vi.mocked(prisma.document.update).mockResolvedValue({ ...BASE_DOCUMENT, status: 'SENT' } as never)

    await changeDocumentStatus(USER_ID, DOCUMENT_ID, 'SENT')

    expect(prisma.document.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'SENT' } }),
    )
  })

  it('transitions SENT to ACCEPTED', async () => {
    vi.mocked(prisma.document.findFirst).mockResolvedValue({
      ...BASE_DOCUMENT,
      status: 'SENT',
    } as never)
    vi.mocked(prisma.document.update).mockResolvedValue({
      ...BASE_DOCUMENT,
      status: 'ACCEPTED',
    } as never)

    const result = await changeDocumentStatus(USER_ID, DOCUMENT_ID, 'ACCEPTED')

    expect(result.status).toBe('ACCEPTED')
  })

  it('transitions SENT to REJECTED', async () => {
    vi.mocked(prisma.document.findFirst).mockResolvedValue({
      ...BASE_DOCUMENT,
      status: 'SENT',
    } as never)
    vi.mocked(prisma.document.update).mockResolvedValue({
      ...BASE_DOCUMENT,
      status: 'REJECTED',
    } as never)

    const result = await changeDocumentStatus(USER_ID, DOCUMENT_ID, 'REJECTED')

    expect(result.status).toBe('REJECTED')
  })

  it('transitions SENT to EXPIRED', async () => {
    vi.mocked(prisma.document.findFirst).mockResolvedValue({
      ...BASE_DOCUMENT,
      status: 'SENT',
    } as never)
    vi.mocked(prisma.document.update).mockResolvedValue({
      ...BASE_DOCUMENT,
      status: 'EXPIRED',
    } as never)

    const result = await changeDocumentStatus(USER_ID, DOCUMENT_ID, 'EXPIRED')

    expect(result.status).toBe('EXPIRED')
  })

  it('throws ValidationError for invalid transition DRAFT → ACCEPTED', async () => {
    vi.mocked(prisma.document.findFirst).mockResolvedValue(BASE_DOCUMENT as never)

    await expect(
      changeDocumentStatus(USER_ID, DOCUMENT_ID, 'ACCEPTED'),
    ).rejects.toThrow(ValidationError)

    expect(prisma.document.update).not.toHaveBeenCalled()
  })

  it('error message names the exact from→to transition', async () => {
    vi.mocked(prisma.document.findFirst).mockResolvedValue(BASE_DOCUMENT as never)

    await expect(
      changeDocumentStatus(USER_ID, DOCUMENT_ID, 'ACCEPTED'),
    ).rejects.toThrow('Cannot transition from DRAFT to ACCEPTED')
  })

  it('throws ValidationError for invalid transition ACCEPTED → DRAFT', async () => {
    vi.mocked(prisma.document.findFirst).mockResolvedValue({
      ...BASE_DOCUMENT,
      status: 'ACCEPTED',
    } as never)

    await expect(
      changeDocumentStatus(USER_ID, DOCUMENT_ID, 'DRAFT'),
    ).rejects.toThrow(ValidationError)
  })

  it('throws NotFoundError when document not owned by user', async () => {
    vi.mocked(prisma.document.findFirst).mockResolvedValue(null)

    await expect(
      changeDocumentStatus(OTHER_USER_ID, DOCUMENT_ID, 'SENT'),
    ).rejects.toThrow(NotFoundError)
  })
})

// ── deleteDocument ─────────────────────────────────────────────────────────
describe('deleteDocument', () => {
  beforeEach(() => vi.clearAllMocks())

  it('deletes a DRAFT document', async () => {
    vi.mocked(prisma.document.findFirst).mockResolvedValue(BASE_DOCUMENT as never)
    vi.mocked(prisma.document.delete).mockResolvedValue(BASE_DOCUMENT as never)

    await expect(deleteDocument(USER_ID, DOCUMENT_ID)).resolves.toBeUndefined()

    expect(prisma.document.delete).toHaveBeenCalledWith({ where: { id: DOCUMENT_ID } })
  })

  it('findFirst uses userId and documentId in where clause to enforce ownership', async () => {
    vi.mocked(prisma.document.findFirst).mockResolvedValue(BASE_DOCUMENT as never)
    vi.mocked(prisma.document.delete).mockResolvedValue(BASE_DOCUMENT as never)

    await deleteDocument(USER_ID, DOCUMENT_ID)

    expect(prisma.document.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: DOCUMENT_ID, userId: USER_ID } }),
    )
  })

  it('throws ValidationError when document is not DRAFT', async () => {
    vi.mocked(prisma.document.findFirst).mockResolvedValue({
      ...BASE_DOCUMENT,
      status: 'SENT',
    } as never)

    await expect(deleteDocument(USER_ID, DOCUMENT_ID)).rejects.toThrow(ValidationError)

    expect(prisma.document.delete).not.toHaveBeenCalled()
  })

  it('error message specifies only DRAFT documents can be deleted', async () => {
    vi.mocked(prisma.document.findFirst).mockResolvedValue({
      ...BASE_DOCUMENT,
      status: 'SENT',
    } as never)

    await expect(deleteDocument(USER_ID, DOCUMENT_ID)).rejects.toThrow(
      'Only DRAFT documents can be deleted',
    )
  })

  it('throws NotFoundError when document not owned by user', async () => {
    vi.mocked(prisma.document.findFirst).mockResolvedValue(null)

    await expect(deleteDocument(OTHER_USER_ID, DOCUMENT_ID)).rejects.toThrow(NotFoundError)
  })
})
