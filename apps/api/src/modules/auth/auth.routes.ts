import type { FastifyInstance } from 'fastify'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'
import { env } from '@/shared/config/env'
import { AUTH_RATE_LIMIT, REFRESH_RATE_LIMIT } from '@/shared/utils/rate-limit'
import { authenticate } from '@/shared/middlewares/authenticate'
import { UnauthorizedError, ValidationError } from '@/shared/errors'
import { registerSchema, loginSchema } from './auth.schemas'
import { registerUser, loginUser, getUserById } from './auth.service'

/**
 * Cookie name for the httpOnly refresh token.
 *
 * The __Secure- prefix instructs browsers to reject the cookie unless it was
 * sent over HTTPS. In dev/test (HTTP), we use the plain name to allow
 * `app.inject()` and localhost testing to work correctly.
 */
const REFRESH_COOKIE_NAME =
  env.NODE_ENV === 'production' ? '__Secure-refresh_token' : 'refresh_token'

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  // `secure: true` is required in production (HTTPS only) and for __Secure- prefix
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  // Scope to the whole API — not just /auth — so future resource routes can
  // trigger a silent refresh via the Axios interceptor on the web client.
  path: '/',
} as const

/** Signs a refresh token using the dedicated JWT_REFRESH_SECRET.
 *  Includes a unique `jti` (JWT ID) so every issued token is distinct —
 *  this prevents same-second collisions and enables future revocation. */
function signRefreshToken(userId: string): string {
  return jwt.sign(
    { sub: userId, jti: randomUUID() },
    env.JWT_REFRESH_SECRET,
    // Cast to SignOptions['expiresIn']: our Zod schema validates the duration
    // format, but TypeScript can't narrow `string` to ms.StringValue at compile time.
    { expiresIn: env.JWT_REFRESH_EXPIRY as jwt.SignOptions['expiresIn'] },
  )
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // ── POST /register ───────────────────────────────────────────────────────
  app.post('/register', {
    config: { rateLimit: AUTH_RATE_LIMIT },
    handler: async (request, reply) => {
      const result = registerSchema.safeParse(request.body)
      if (!result.success) {
        throw new ValidationError(result.error.issues[0]?.message ?? 'Validation failed')
      }

      const user = await registerUser(result.data)

      const accessToken = app.jwt.sign({
        sub: user.id,
        email: user.email,
        role: 'authenticated' as const,
      })
      const refreshToken = signRefreshToken(user.id)

      reply.setCookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS)

      return reply.status(201).send({
        accessToken,
        user: { id: user.id, email: user.email, name: user.name },
      })
    },
  })

  // ── POST /login ──────────────────────────────────────────────────────────
  app.post('/login', {
    config: { rateLimit: AUTH_RATE_LIMIT },
    handler: async (request, reply) => {
      const result = loginSchema.safeParse(request.body)
      if (!result.success) {
        throw new ValidationError(result.error.issues[0]?.message ?? 'Validation failed')
      }

      const user = await loginUser(result.data)

      const accessToken = app.jwt.sign({
        sub: user.id,
        email: user.email,
        role: 'authenticated' as const,
      })
      const refreshToken = signRefreshToken(user.id)

      reply.setCookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS)

      return reply.status(200).send({
        accessToken,
        user: { id: user.id, email: user.email, name: user.name },
      })
    },
  })

  // ── POST /logout ─────────────────────────────────────────────────────────
  app.post('/logout', {
    preHandler: [authenticate],
    handler: async (_request, reply) => {
      // Clear the refresh cookie — the client should discard the access token
      reply.clearCookie(REFRESH_COOKIE_NAME, { path: '/' })
      return reply.status(200).send({ message: 'Logged out successfully' })
    },
  })

  // ── POST /refresh ────────────────────────────────────────────────────────
  app.post('/refresh', {
    config: { rateLimit: REFRESH_RATE_LIMIT },
    handler: async (request, reply) => {
      const token = request.cookies[REFRESH_COOKIE_NAME]
      if (!token) throw new UnauthorizedError('Refresh token missing')

      let sub: string
      try {
        const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as { sub: string }
        sub = payload.sub
      } catch {
        throw new UnauthorizedError('Invalid or expired refresh token')
      }

      // Re-validate the user exists and is not soft-deleted on every refresh.
      // This ensures revoked/deleted accounts cannot silently obtain new tokens.
      const user = await getUserById(sub)
      if (!user) throw new UnauthorizedError('User not found')

      const accessToken = app.jwt.sign({
        sub: user.id,
        email: user.email,
        role: 'authenticated' as const,
      })

      // Rotate the refresh token — limits the blast radius of a stolen token
      const newRefreshToken = signRefreshToken(user.id)
      reply.setCookie(REFRESH_COOKIE_NAME, newRefreshToken, REFRESH_COOKIE_OPTIONS)

      return { accessToken }
    },
  })
}
