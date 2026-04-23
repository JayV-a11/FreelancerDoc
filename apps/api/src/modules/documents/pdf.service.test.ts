import { describe, it, expect } from 'vitest'
import type { Document } from '@prisma/client'
import { generateDocumentPdf } from './pdf.service'

// ── Fixtures ───────────────────────────────────────────────────────────────
const BASE_DOCUMENT: Document = {
  id: '550e8400-e29b-41d4-a716-446655440070',
  userId: '550e8400-e29b-41d4-a716-446655440071',
  templateId: null,
  title: 'Website Proposal',
  clientName: 'Acme Corp',
  clientEmail: 'acme@example.com',
  clientDocument: null,
  content: { blocks: [{ type: 'text', value: 'Dear Acme Corp,' }] },
  status: 'DRAFT',
  totalValue: '1500.00' as unknown as Document['totalValue'],
  currency: 'BRL',
  validUntil: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  deletedAt: null,
}

// ── generateDocumentPdf ────────────────────────────────────────────────────
describe('generateDocumentPdf', () => {
  it('returns a Buffer instance', async () => {
    const result = await generateDocumentPdf(BASE_DOCUMENT)

    expect(result).toBeInstanceOf(Buffer)
  })

  it('returns a non-empty PDF (byte length > 0)', async () => {
    const result = await generateDocumentPdf(BASE_DOCUMENT)

    expect(result.length).toBeGreaterThan(0)
  })

  it('generates a valid PDF (starts with %PDF magic bytes)', async () => {
    const result = await generateDocumentPdf(BASE_DOCUMENT)

    expect(result.toString('ascii', 0, 4)).toBe('%PDF')
  })

  it('handles empty content object (no blocks key)', async () => {
    const doc = { ...BASE_DOCUMENT, content: {} }

    const result = await generateDocumentPdf(doc)

    expect(result).toBeInstanceOf(Buffer)
    expect(result.length).toBeGreaterThan(0)
  })

  it('handles null/empty blocks array', async () => {
    const doc = { ...BASE_DOCUMENT, content: { blocks: [] } }

    const result = await generateDocumentPdf(doc)

    expect(result).toBeInstanceOf(Buffer)
    expect(result.length).toBeGreaterThan(0)
  })

  it('renders heading blocks without throwing', async () => {
    const doc = {
      ...BASE_DOCUMENT,
      content: { blocks: [{ type: 'heading', value: 'Section 1' }] },
    }

    const result = await generateDocumentPdf(doc)

    expect(result).toBeInstanceOf(Buffer)
    expect(result.length).toBeGreaterThan(0)
  })

  it('renders mixed heading and text blocks', async () => {
    const doc = {
      ...BASE_DOCUMENT,
      content: {
        blocks: [
          { type: 'heading', value: 'Introduction' },
          { type: 'text', value: 'This is the project scope.' },
          { type: 'heading', value: 'Terms' },
          { type: 'text', value: 'Payment is due in 30 days.' },
        ],
      },
    }

    const result = await generateDocumentPdf(doc)

    expect(result).toBeInstanceOf(Buffer)
    expect(result.length).toBeGreaterThan(0)
  })

  it('renders many blocks that overflow to a second page', async () => {
    const blocks = Array.from({ length: 60 }, (_, i) => ({
      type: 'text',
      value: `Line ${i + 1}: Lorem ipsum dolor sit amet.`,
    }))
    const doc = { ...BASE_DOCUMENT, content: { blocks } }

    const result = await generateDocumentPdf(doc)

    expect(result).toBeInstanceOf(Buffer)
    expect(result.length).toBeGreaterThan(0)
  })

  it('gracefully handles unknown block types', async () => {
    const doc = {
      ...BASE_DOCUMENT,
      content: { blocks: [{ type: 'table', value: 'Some table data' }] },
    }

    const result = await generateDocumentPdf(doc)

    expect(result).toBeInstanceOf(Buffer)
    expect(result.length).toBeGreaterThan(0)
  })
})
