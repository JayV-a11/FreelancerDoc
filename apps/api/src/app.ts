import Fastify, { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import cookie from '@fastify/cookie'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { env } from '@/shared/config/env'
import { prisma } from '@/shared/config/prisma'
import { authRoutes } from '@/modules/auth'
import { usersRoutes } from '@/modules/users'
import { templatesRoutes } from '@/modules/templates'
import { documentsRoutes } from '@/modules/documents'

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'test' ? 'silent' : 'info',
      // Redact sensitive fields from logs — spec requirement: "Nunca logar dados sensíveis"
      redact: {
        paths: [
          'req.headers.authorization',
          'req.body.password',
          'req.body.passwordHash',
          'req.body.token',
          'req.body.refreshToken',
        ],
        censor: '[REDACTED]',
      },
    },
    // Trust the proxy header forwarded by Render/Vercel in production.
    // Never trust it in dev/test to avoid IP spoofing via X-Forwarded-For.
    trustProxy: env.NODE_ENV === 'production',
  })

  // ── Security headers ────────────────────────────────────────────────────
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })

  // ── CORS — restricted to the configured Vercel origin ───────────────────
  await app.register(cors, {
    origin: env.ALLOWED_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })

  // ── Cookies — for httpOnly refresh token storage ─────────────────────────
  // Uses COOKIE_SECRET (distinct from JWT secrets) to sign cookies.
  // This prevents forgery of the signed refresh token cookie.
  await app.register(cookie, {
    secret: env.COOKIE_SECRET,
    hook: 'onRequest',
    parseOptions: {},
  })

  // ── JWT — access token verification ──────────────────────────────────────
  // Signs/verifies short-lived access tokens (default 15 min via JWT_ACCESS_EXPIRY).
  //
  // REFRESH TOKEN DESIGN:
  //   Refresh tokens are signed separately with JWT_REFRESH_SECRET using
  //   `jsonwebtoken` directly in the auth module, stored as a signed httpOnly
  //   cookie, and validated manually. They are NOT processed by this plugin.
  //   This keeps the two token lifecycles fully independent.
  await app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: {
      expiresIn: env.JWT_ACCESS_EXPIRY,
    },
    // No `cookie` option here — cookie handling is manual in the auth module
  })

  // ── Rate limiting — global baseline ─────────────────────────────────────
  // Sensitive routes (login, register, refresh) apply tighter limits defined
  // in src/shared/utils/rate-limit.ts and registered per-route in Step 5.
  await app.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: '1 minute',
    // Log rate limit hits for security monitoring
    onExceeding: (_req, key) => {
      app.log.warn({ key }, 'Approaching rate limit')
    },
    onExceeded: (_req, key) => {
      app.log.warn({ key }, 'Rate limit exceeded — request rejected')
    },
    errorResponseBuilder: (_req, context) => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Retry after ${Math.ceil(context.ttl / 1000)} seconds.`,
    }),
  })

  // ── Swagger / OpenAPI docs ───────────────────────────────────────────────
  await app.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'FreelanceDoc API',
        description: 'Proposal and Contract Generator for Freelancers',
        version: '1.0.0',
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  })

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
    // Docs are only served in non-production environments
    uiHooks: {
      onRequest: async (_req, reply) => {
        if (env.NODE_ENV === 'production') {
          await reply.status(404).send({ error: 'Not found' })
        }
      },
    },
  })

  // ── Global error handler ─────────────────────────────────────────────────
  // Normalises all errors into { statusCode, error, message }.
  // 5xx errors are logged; 4xx are suppressed (noise).
  app.setErrorHandler((error, _req, reply) => {
    if (!error.statusCode || error.statusCode >= 500) {
      app.log.error({ err: error }, 'Unhandled error')
    }

    const statusCode = error.statusCode ?? 500
    const message = statusCode < 500 ? error.message : 'Internal server error'

    return reply.status(statusCode).send({
      statusCode,
      error: error.name ?? 'Error',
      message,
    })
  })

  // ── Auth module ──────────────────────────────────────────────────────────
  // Registered under /auth prefix — routes: /register, /login, /logout, /refresh
  await app.register(authRoutes, { prefix: '/auth' })

  // ── Users module ─────────────────────────────────────────────────────────
  // Registered under /users prefix — routes: /me, /me/password
  await app.register(usersRoutes, { prefix: '/users' })

  // ── Templates module ─────────────────────────────────────────────────────
  // Registered under /templates prefix — full CRUD
  await app.register(templatesRoutes, { prefix: '/templates' })

  // ── Documents module ────────────────────────────────────────────────────
  // Registered under /documents prefix — full CRUD with versioning
  await app.register(documentsRoutes, { prefix: '/documents' })

  // ── Graceful Prisma disconnect on app close ──────────────────────────────
  // Ensures database connections are released when the server shuts down
  // or when `app.close()` is called at the end of each integration test.
  app.addHook('onClose', async () => {
    await prisma.$disconnect()
  })

  // ── Health check ─────────────────────────────────────────────────────────
  app.get(
    '/health',
    {
      schema: {
        description: 'Liveness probe for Render health checks',
        tags: ['Health'],
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              timestamp: { type: 'string' },
              environment: { type: 'string' },
            },
          },
        },
      },
    },
    async () => ({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
    }),
  )

  return app
}

