import type { FastifyInstance } from 'fastify'
import { authenticate } from '@/shared/middlewares/authenticate'
import { ValidationError } from '@/shared/errors'
import { createTemplateSchema, updateTemplateSchema } from './templates.schemas'
import {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from './templates.service'

export async function templatesRoutes(app: FastifyInstance): Promise<void> {
  // All routes in this plugin require authentication
  app.addHook('preHandler', authenticate)

  // ── GET /templates ─────────────────────────────────────────────────────
  app.get('/', async (request, reply) => {
    const templates = await listTemplates(request.user.sub)
    return reply.status(200).send(templates)
  })

  // ── POST /templates ────────────────────────────────────────────────────
  app.post('/', async (request, reply) => {
    const result = createTemplateSchema.safeParse(request.body)
    if (!result.success) {
      throw new ValidationError(result.error.issues[0]?.message ?? 'Validation failed')
    }

    const template = await createTemplate(request.user.sub, result.data)
    return reply.status(201).send(template)
  })

  // ── GET /templates/:id ─────────────────────────────────────────────────
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const template = await getTemplate(request.user.sub, id)
    return reply.status(200).send(template)
  })

  // ── PATCH /templates/:id ───────────────────────────────────────────────
  app.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const result = updateTemplateSchema.safeParse(request.body)
    if (!result.success) {
      throw new ValidationError(result.error.issues[0]?.message ?? 'Validation failed')
    }

    const template = await updateTemplate(request.user.sub, id, result.data)
    return reply.status(200).send(template)
  })

  // ── DELETE /templates/:id ──────────────────────────────────────────────
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    await deleteTemplate(request.user.sub, id)
    return reply.status(204).send()
  })
}
