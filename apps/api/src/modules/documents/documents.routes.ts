import type { FastifyInstance } from 'fastify'
import { authenticate } from '@/shared/middlewares/authenticate'
import { ValidationError } from '@/shared/errors'
import {
  createDocumentSchema,
  updateDocumentSchema,
  changeStatusSchema,
  listDocumentsQuerySchema,
} from './documents.schemas'
import { z } from 'zod'
import {
  listDocuments,
  getDocument,
  createDocument,
  updateDocument,
  changeDocumentStatus,
  deleteDocument,
} from './documents.service'
import { generateDocumentPdf } from './pdf.service'
import { sendDocumentByEmail } from '@/shared/utils/email.service'
import { prisma } from '@/shared/config/prisma'

const sendDocumentSchema = z.object({
  recipientEmail: z.string().email('recipientEmail must be a valid email').optional(),
  locale: z.string().optional().default('en'),
  message: z.string().max(2000).optional(),
})

export async function documentsRoutes(app: FastifyInstance): Promise<void> {
  // All routes in this plugin require authentication
  app.addHook('preHandler', authenticate)

  // ── GET /documents ─────────────────────────────────────────────────────
  app.get('/', async (request, reply) => {
    const queryResult = listDocumentsQuerySchema.safeParse(request.query)
    if (!queryResult.success) {
      throw new ValidationError(queryResult.error.issues[0]?.message ?? 'Validation failed')
    }

    const documents = await listDocuments(request.user.sub, queryResult.data.status)
    return reply.status(200).send(documents)
  })

  // ── POST /documents ────────────────────────────────────────────────────
  app.post('/', async (request, reply) => {
    const result = createDocumentSchema.safeParse(request.body)
    if (!result.success) {
      throw new ValidationError(result.error.issues[0]?.message ?? 'Validation failed')
    }

    const document = await createDocument(request.user.sub, result.data)
    return reply.status(201).send(document)
  })

  // ── GET /documents/:id ─────────────────────────────────────────────────
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const document = await getDocument(request.user.sub, id)
    return reply.status(200).send(document)
  })

  // ── PATCH /documents/:id ───────────────────────────────────────────────
  app.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const result = updateDocumentSchema.safeParse(request.body)
    if (!result.success) {
      throw new ValidationError(result.error.issues[0]?.message ?? 'Validation failed')
    }

    const document = await updateDocument(request.user.sub, id, result.data)
    return reply.status(200).send(document)
  })

  // ── PATCH /documents/:id/status ────────────────────────────────────────
  app.patch('/:id/status', async (request, reply) => {
    const { id } = request.params as { id: string }
    const result = changeStatusSchema.safeParse(request.body)
    if (!result.success) {
      throw new ValidationError(result.error.issues[0]?.message ?? 'Validation failed')
    }

    const document = await changeDocumentStatus(request.user.sub, id, result.data.status)
    return reply.status(200).send(document)
  })

  // ── DELETE /documents/:id ──────────────────────────────────────────────
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    await deleteDocument(request.user.sub, id)
    return reply.status(204).send()
  })
  // ── GET /documents/:id/pdf ───────────────────────────────────────────────
  app.get('/:id/pdf', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { locale = 'en' } = request.query as { locale?: string }

    const document = await getDocument(request.user.sub, id)

    const sender = await prisma.user.findUnique({
      where: { id: request.user.sub },
      select: { name: true, professionalName: true },
    })

    const pdfBuffer = await generateDocumentPdf(document, {
      locale,
      user: sender ?? { name: '', professionalName: null },
    })

    // Sanitize the title for use as a filename (replace non-alphanumeric with _)
    const safeName = document.title.replace(/[^a-zA-Z0-9]/g, '_')
    const filename = `${safeName}.pdf`

    return reply
      .status(200)
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .send(pdfBuffer)
  })

  // ── POST /documents/:id/send ───────────────────────────────────────────
  app.post('/:id/send', async (request, reply) => {
    const { id } = request.params as { id: string }

    const parseResult = sendDocumentSchema.safeParse(request.body ?? {})
    if (!parseResult.success) {
      throw new ValidationError(
        parseResult.error.issues[0]?.message ?? 'Validation failed',
      )
    }

    const document = await getDocument(request.user.sub, id)

    // Look up sender — must happen before PDF generation so placeholders are filled
    const sender = await prisma.user.findUnique({
      where: { id: request.user.sub },
      select: { name: true, professionalName: true },
    })
    const senderName = sender?.professionalName ?? sender?.name ?? request.user.email

    const pdfBuffer = await generateDocumentPdf(document, {
      locale: parseResult.data.locale,
      user: sender ?? { name: '', professionalName: null },
    })

    const to = parseResult.data.recipientEmail ?? document.clientEmail

    await sendDocumentByEmail({
      to,
      documentTitle: document.title,
      senderName,
      pdfBuffer,
      locale: parseResult.data.locale,
      message: parseResult.data.message,
    })

    return reply.status(200).send({ message: `Document sent to ${to}` })
  })
}
