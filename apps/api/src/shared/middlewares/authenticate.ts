import type { FastifyReply, FastifyRequest } from 'fastify'
import { UnauthorizedError } from '@/shared/errors'

/**
 * authenticate — Fastify preHandler hook.
 *
 * Verifies the Bearer JWT in the Authorization header.
 * The payload is injected into request.user by @fastify/jwt.
 *
 * Usage (single route):
 *   fastify.get('/me', { preHandler: authenticate }, handler)
 *
 * Usage (plugin-wide):
 *   fastify.addHook('preHandler', authenticate)
 */
export async function authenticate(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  try {
    await request.jwtVerify()
  } catch {
    // Log access denial for security monitoring (spec requirement)
    request.log.warn(
      { url: request.url, method: request.method },
      'Access denied — invalid or missing token',
    )
    throw new UnauthorizedError()
  }
}
