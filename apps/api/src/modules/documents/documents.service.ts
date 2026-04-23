import { prisma } from '@/shared/config/prisma'
import { NotFoundError, ValidationError } from '@/shared/errors'
import type { Document, DocumentVersion, Prisma } from '@prisma/client'
import type {
  CreateDocumentDto,
  UpdateDocumentDto,
  DocumentStatus,
} from './documents.schemas'

/** Document with all saved versions. */
export type DocumentWithVersions = Document & { versions: DocumentVersion[] }

// ── Status transition rules ────────────────────────────────────────────────

const VALID_TRANSITIONS: Partial<Record<DocumentStatus, DocumentStatus[]>> = {
  DRAFT: ['SENT'],
  SENT: ['ACCEPTED', 'REJECTED', 'EXPIRED'],
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function findOwnedDocument(userId: string, documentId: string): Promise<Document> {
  const doc = await prisma.document.findFirst({ where: { id: documentId, userId } })
  if (!doc) throw new NotFoundError('Document')
  return doc
}

// ── listDocuments ──────────────────────────────────────────────────────────

export async function listDocuments(
  userId: string,
  status?: DocumentStatus,
): Promise<Document[]> {
  return prisma.document.findMany({
    where: { userId, ...(status !== undefined && { status }) },
    orderBy: { createdAt: 'desc' },
  })
}

// ── getDocument ────────────────────────────────────────────────────────────

export async function getDocument(
  userId: string,
  documentId: string,
): Promise<DocumentWithVersions> {
  const doc = await prisma.document.findFirst({
    where: { id: documentId, userId },
    include: { versions: { orderBy: { version: 'asc' } } },
  })
  if (!doc) throw new NotFoundError('Document')
  return doc
}

// ── createDocument ─────────────────────────────────────────────────────────

export async function createDocument(
  userId: string,
  data: CreateDocumentDto,
): Promise<Document> {
  return prisma.$transaction(async (tx) => {
    const doc = await tx.document.create({
      data: {
        userId,
        templateId: data.templateId ?? null,
        title: data.title,
        clientName: data.clientName,
        clientEmail: data.clientEmail,
        clientDocument: data.clientDocument ?? null,
        content: data.content as Prisma.InputJsonValue,
        totalValue: data.totalValue.toString(),
        currency: data.currency ?? 'BRL',
        validUntil: data.validUntil ?? null,
      },
    })

    await tx.documentVersion.create({
      data: {
        documentId: doc.id,
        content: data.content as Prisma.InputJsonValue,
        version: 1,
      },
    })

    return doc
  })
}

// ── updateDocument ─────────────────────────────────────────────────────────

export async function updateDocument(
  userId: string,
  documentId: string,
  data: UpdateDocumentDto,
): Promise<Document> {
  const doc = await findOwnedDocument(userId, documentId)

  if (doc.status !== 'DRAFT') {
    throw new ValidationError('Only DRAFT documents can be edited')
  }

  const { content, totalValue, ...rest } = data
  const baseUpdate = {
    ...rest,
    ...(totalValue !== undefined && { totalValue: totalValue.toString() }),
  }

  if (content !== undefined) {
    const agg = await prisma.documentVersion.aggregate({
      _max: { version: true },
      where: { documentId },
    })
    const nextVersion = (agg._max.version ?? 0) + 1

    return prisma.$transaction(async (tx) => {
      await tx.documentVersion.create({
        data: {
          documentId,
          content: content as Prisma.InputJsonValue,
          version: nextVersion,
        },
      })
      return tx.document.update({
        where: { id: documentId },
        data: { ...baseUpdate, content: content as Prisma.InputJsonValue },
      })
    })
  }

  return prisma.document.update({
    where: { id: documentId },
    data: baseUpdate,
  })
}

// ── changeDocumentStatus ───────────────────────────────────────────────────

export async function changeDocumentStatus(
  userId: string,
  documentId: string,
  newStatus: DocumentStatus,
): Promise<Document> {
  const doc = await findOwnedDocument(userId, documentId)

  const allowed = VALID_TRANSITIONS[doc.status as DocumentStatus] ?? []
  if (!allowed.includes(newStatus)) {
    throw new ValidationError(
      `Cannot transition from ${doc.status} to ${newStatus}`,
    )
  }

  return prisma.document.update({
    where: { id: documentId },
    data: { status: newStatus },
  })
}

// ── deleteDocument ─────────────────────────────────────────────────────────

export async function deleteDocument(userId: string, documentId: string): Promise<void> {
  const doc = await findOwnedDocument(userId, documentId)

  if (doc.status !== 'DRAFT') {
    throw new ValidationError('Only DRAFT documents can be deleted')
  }

  await prisma.document.delete({ where: { id: documentId } })
}
