import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { Document } from '@prisma/client'

type ContentBlock = { type: string; value: string }
type DocumentContent = { blocks?: ContentBlock[] }

const MARGIN = 50
const LINE_HEIGHT_TEXT = 18
const LINE_HEIGHT_HEADING = 26

/** Generate a PDF buffer from a Document's content blocks. */
export async function generateDocumentPdf(document: Document): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create()
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica)

  let page = pdfDoc.addPage()
  let { width, height } = page.getSize()
  let y = height - MARGIN

  // ── Title ──────────────────────────────────────────────────────────────
  page.drawText(document.title, {
    x: MARGIN,
    y,
    size: 24,
    font: boldFont,
    color: rgb(0, 0, 0),
    maxWidth: width - 2 * MARGIN,
  })
  y -= 35

  // ── Client info ────────────────────────────────────────────────────────
  page.drawText(`Client: ${document.clientName}`, {
    x: MARGIN,
    y,
    size: 11,
    font: regularFont,
    color: rgb(0.3, 0.3, 0.3),
  })
  y -= 16

  page.drawText(`Email: ${document.clientEmail}`, {
    x: MARGIN,
    y,
    size: 11,
    font: regularFont,
    color: rgb(0.3, 0.3, 0.3),
  })
  y -= 24

  // ── Divider ────────────────────────────────────────────────────────────
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: width - MARGIN, y },
    thickness: 0.5,
    color: rgb(0.7, 0.7, 0.7),
  })
  y -= 20

  // ── Content blocks ─────────────────────────────────────────────────────
  const content = document.content as DocumentContent
  const blocks: ContentBlock[] = content?.blocks ?? []

  for (const block of blocks) {
    const isHeading = block.type === 'heading'
    const font = isHeading ? boldFont : regularFont
    const size = isHeading ? 15 : 11
    const lineHeight = isHeading ? LINE_HEIGHT_HEADING : LINE_HEIGHT_TEXT

    // Start a new page when there is no more vertical space
    if (y < MARGIN + lineHeight) {
      page = pdfDoc.addPage()
      ;({ width, height } = page.getSize())
      y = height - MARGIN
    }

    page.drawText(block.value ?? '', {
      x: MARGIN,
      y,
      size,
      font,
      color: rgb(0, 0, 0),
      maxWidth: width - 2 * MARGIN,
    })
    y -= lineHeight
  }

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}
