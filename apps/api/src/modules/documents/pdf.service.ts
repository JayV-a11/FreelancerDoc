import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import type { Document } from '@prisma/client'

type ContentBlock = { type: string; value: string }
type DocumentContent = { blocks?: ContentBlock[] }

const MARGIN = 60
const LINE_HEIGHT_TEXT = 17
const LINE_HEIGHT_HEADING = 22

type PdfUser = { name: string; professionalName: string | null }
type PdfOptions = { locale?: string; user?: PdfUser }

const PDF_LABELS: Record<string, { client: string; email: string }> = {
  'pt-br': { client: 'Cliente', email: 'E-mail' },
  pt: { client: 'Cliente', email: 'E-mail' },
  es: { client: 'Cliente', email: 'Correo' },
  en: { client: 'Client', email: 'Email' },
}

function getLabels(locale: string) {
  return PDF_LABELS[locale.toLowerCase()] ?? PDF_LABELS['en']
}

/** Replace {{placeholder}} tokens in text with actual document/user values. */
function substitutePlaceholders(text: string, doc: Document, user: PdfUser): string {
  const senderName = user.professionalName ?? user.name
  const validUntil = doc.validUntil
    ? new Date(doc.validUntil).toLocaleDateString(locale === 'pt-br' ? 'pt-BR' : locale === 'es' ? 'es-ES' : 'en-US')
    : '—'
  const now = new Date()

  return text
    .replace(/\{\{client_name\}\}/gi, doc.clientName)
    .replace(/\{\{client_email\}\}/gi, doc.clientEmail)
    .replace(/\{\{title\}\}/gi, doc.title)
    .replace(/\{\{project_name\}\}/gi, doc.title)
    .replace(/\{\{document_title\}\}/gi, doc.title)
    .replace(/\{\{total_value\}\}/gi, doc.totalValue.toString())
    .replace(/\{\{total\}\}/gi, doc.totalValue.toString())
    .replace(/\{\{value\}\}/gi, doc.totalValue.toString())
    .replace(/\{\{currency\}\}/gi, doc.currency)
    .replace(/\{\{valid_until\}\}/gi, validUntil)
    .replace(/\{\{valid_date\}\}/gi, validUntil)
    .replace(/\{\{sender_name\}\}/gi, senderName)
    .replace(/\{\{professional_name\}\}/gi, senderName)
    .replace(/\{\{your_name\}\}/gi, senderName)
    .replace(/\{\{date\}\}/gi, now.toLocaleDateString())
    .replace(/\{\{year\}\}/gi, now.getFullYear().toString())
}

/** Break a single paragraph into lines that fit within maxWidth. Handles \n too. */
function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = []
  for (const paragraph of text.split('\n')) {
    if (paragraph.trim() === '') {
      lines.push('')
      continue
    }
    const words = paragraph.split(' ')
    let current = ''
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate
      } else {
        if (current) lines.push(current)
        // Word is wider than maxWidth — force it on its own line
        current = word
      }
    }
    if (current) lines.push(current)
  }
  return lines.length > 0 ? lines : ['']
}

/** Draw wrapped text, handling page breaks. Returns updated page and y. */
function drawWrapped(
  pdfDoc: PDFDocument,
  page: PDFPage,
  text: string,
  options: {
    x: number
    y: number
    size: number
    font: PDFFont
    lineHeight: number
    maxWidth: number
    color: ReturnType<typeof rgb>
  },
): { page: PDFPage; y: number } {
  let { page: currentPage, y } = { page, y: options.y }
  const { width, height } = currentPage.getSize()
  const lines = wrapText(text, options.font, options.size, options.maxWidth)

  for (const line of lines) {
    if (y < MARGIN + options.lineHeight) {
      currentPage = pdfDoc.addPage()
      y = currentPage.getSize().height - MARGIN
    }
    if (line !== '') {
      currentPage.drawText(line, {
        x: options.x,
        y,
        size: options.size,
        font: options.font,
        color: options.color,
      })
    }
    y -= options.lineHeight
  }

  return { page: currentPage, y }
}

/** Generate a PDF buffer from a Document's content blocks. */
export async function generateDocumentPdf(
  document: Document,
  options: PdfOptions = {},
): Promise<Buffer> {
  const locale = options.locale ?? 'en'
  const user: PdfUser = options.user ?? { name: '', professionalName: null }
  const labels = getLabels(locale)

  const pdfDoc = await PDFDocument.create()
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica)

  let page = pdfDoc.addPage()
  const { width, height } = page.getSize()
  const textWidth = width - 2 * MARGIN
  let y = height - MARGIN

  // ── Title ──────────────────────────────────────────────────────────────
  ;({ page, y } = drawWrapped(pdfDoc, page, document.title, {
    x: MARGIN,
    y,
    size: 26,
    font: boldFont,
    lineHeight: 34,
    maxWidth: textWidth,
    color: rgb(0.05, 0.05, 0.15),
  }))
  y -= 12

  // ── Client info ────────────────────────────────────────────────────────
  ;({ page, y } = drawWrapped(pdfDoc, page, `${labels.client}: ${document.clientName}`, {
    x: MARGIN,
    y,
    size: 10,
    font: regularFont,
    lineHeight: 15,
    maxWidth: textWidth,
    color: rgb(0.35, 0.35, 0.35),
  }))

  ;({ page, y } = drawWrapped(pdfDoc, page, `${labels.email}: ${document.clientEmail}`, {
    x: MARGIN,
    y,
    size: 10,
    font: regularFont,
    lineHeight: 15,
    maxWidth: textWidth,
    color: rgb(0.35, 0.35, 0.35),
  }))
  y -= 14

  // ── Divider ────────────────────────────────────────────────────────────
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: page.getSize().width - MARGIN, y },
    thickness: 0.75,
    color: rgb(0.75, 0.75, 0.8),
  })
  y -= 22

  // ── Content blocks ─────────────────────────────────────────────────────
  const content = document.content as DocumentContent
  const blocks: ContentBlock[] = content?.blocks ?? []

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    const isHeading = block.type === 'heading'
    const font = isHeading ? boldFont : regularFont
    const size = isHeading ? 13 : 11
    const lineHeight = isHeading ? LINE_HEIGHT_HEADING : LINE_HEIGHT_TEXT
    const value = substitutePlaceholders(block.value ?? '', document, user)

    // Skip blocks that are empty or only punctuation after substitution
    const trimmed = value.trim()
    if (trimmed === '' || trimmed === '.' || trimmed === '—') continue

    // Extra breathing room before headings (except the very first block)
    if (isHeading && i > 0) y -= 14

    ;({ page, y } = drawWrapped(pdfDoc, page, value, {
      x: MARGIN,
      y,
      size,
      font,
      lineHeight,
      maxWidth: textWidth,
      color: isHeading ? rgb(0.05, 0.05, 0.15) : rgb(0.12, 0.12, 0.12),
    }))

    // Spacing after each block
    y -= isHeading ? 6 : 10
  }

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}
