import { prisma } from '@/shared/config/prisma'
import { NotFoundError } from '@/shared/errors'
import type { Template, Prisma } from '@prisma/client'
import type { CreateTemplateDto, UpdateTemplateDto } from './templates.schemas'

// ── Helpers ────────────────────────────────────────────────────────────────

async function findOwnedTemplate(userId: string, templateId: string): Promise<Template> {
  const template = await prisma.template.findFirst({
    where: { id: templateId, userId },
  })
  if (!template) throw new NotFoundError('Template')
  return template
}

// ── listTemplates ──────────────────────────────────────────────────────────

export async function listTemplates(userId: string): Promise<Template[]> {
  return prisma.template.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })
}

// ── getTemplate ────────────────────────────────────────────────────────────

export async function getTemplate(userId: string, templateId: string): Promise<Template> {
  return findOwnedTemplate(userId, templateId)
}

// ── createTemplate ─────────────────────────────────────────────────────────

export async function createTemplate(
  userId: string,
  data: CreateTemplateDto,
): Promise<Template> {
  return prisma.template.create({
    data: { ...data, userId, content: data.content as Prisma.InputJsonValue },
  })
}

// ── updateTemplate ─────────────────────────────────────────────────────────

export async function updateTemplate(
  userId: string,
  templateId: string,
  data: UpdateTemplateDto,
): Promise<Template> {
  await findOwnedTemplate(userId, templateId)
  const { content, ...rest } = data
  return prisma.template.update({
    where: { id: templateId },
    data: {
      ...rest,
      ...(content !== undefined && { content: content as Prisma.InputJsonValue }),
    },
  })
}

// ── deleteTemplate ─────────────────────────────────────────────────────────

export async function deleteTemplate(userId: string, templateId: string): Promise<void> {
  await findOwnedTemplate(userId, templateId)
  await prisma.template.delete({ where: { id: templateId } })
}
