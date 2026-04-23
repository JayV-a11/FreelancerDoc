import type { FastifyInstance } from 'fastify'
import { authenticate } from '@/shared/middlewares/authenticate'
import { ValidationError } from '@/shared/errors'
import { updateProfileSchema, changePasswordSchema } from './users.schemas'
import { getProfile, updateProfile, changePassword, softDeleteUser } from './users.service'

export async function usersRoutes(app: FastifyInstance): Promise<void> {
  // All routes in this plugin require authentication
  app.addHook('preHandler', authenticate)

  // ── GET /me ────────────────────────────────────────────────────────────
  app.get('/me', async (request, reply) => {
    const profile = await getProfile(request.user.sub)
    return reply.status(200).send(profile)
  })

  // ── PATCH /me ──────────────────────────────────────────────────────────
  app.patch('/me', async (request, reply) => {
    const result = updateProfileSchema.safeParse(request.body)
    if (!result.success) {
      throw new ValidationError(result.error.issues[0]?.message ?? 'Validation failed')
    }

    const updated = await updateProfile(request.user.sub, result.data)
    return reply.status(200).send(updated)
  })

  // ── PATCH /me/password ─────────────────────────────────────────────────
  app.patch('/me/password', async (request, reply) => {
    const result = changePasswordSchema.safeParse(request.body)
    if (!result.success) {
      throw new ValidationError(result.error.issues[0]?.message ?? 'Validation failed')
    }

    await changePassword(request.user.sub, result.data)
    return reply.status(200).send({ message: 'Password updated successfully' })
  })

  // ── DELETE /me ─────────────────────────────────────────────────────────
  app.delete('/me', async (request, reply) => {
    await softDeleteUser(request.user.sub)
    return reply.status(204).send()
  })
}
