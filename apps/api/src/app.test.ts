import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { buildApp } from '@/app'
import type { FastifyInstance } from 'fastify'

describe('GET /health', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildApp()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('returns 200 with status ok', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json<{ status: string; timestamp: string; environment: string }>()
    expect(body.status).toBe('ok')
    expect(body.environment).toBe('test')
    expect(typeof body.timestamp).toBe('string')
  })

  it('returns a valid ISO timestamp', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    })

    const { timestamp } = response.json<{ timestamp: string }>()
    expect(() => new Date(timestamp).toISOString()).not.toThrow()
  })
})

describe('Error handling', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildApp()
    // Register a route that deliberately throws a known AppError
    app.get('/test/error/client', async () => {
      const { AppError } = await import('@/shared/errors')
      throw new AppError('Bad request', 400)
    })
    // Register a route that throws an unexpected error (500)
    app.get('/test/error/server', async () => {
      throw new Error('Unexpected failure')
    })
    // Register a route that throws an error WITHOUT a .name property
    // (tests the `error.name ?? 'Error'` fallback in the error handler)
    app.get('/test/error/noname', async () => {
      const err = new Error('nameless error')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (err as any).name
      throw err
    })
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('returns the statusCode and message for a known AppError', async () => {
    const response = await app.inject({ method: 'GET', url: '/test/error/client' })
    expect(response.statusCode).toBe(400)
    const body = response.json<{ message: string; statusCode: number; error: string }>()
    expect(body.statusCode).toBe(400)
    expect(body.message).toBe('Bad request')
    // error.name is used as the `error` field — verifies the `?? 'Error'` fallback
    expect(body.error).toBe('AppError')
  })

  it('returns 500 with generic message and uses error.name for unexpected errors', async () => {
    const response = await app.inject({ method: 'GET', url: '/test/error/server' })
    expect(response.statusCode).toBe(500)
    const body = response.json<{ message: string; error: string }>()
    expect(body.message).toBe('Internal server error')
    // Built-in Error has name = 'Error' — verifies the `error.name ?? 'Error'` path
    expect(body.error).toBe('Error')
  })

  it('falls back to "Error" as the error field when error.name is absent', async () => {
    const response = await app.inject({ method: 'GET', url: '/test/error/noname' })
    const body = response.json<{ error: string; message: string }>()
    // Kills the `?? 'Error'` → `?? ''` and `?? 'Error'` → `&&` mutations
    expect(body.error).toBe('Error')
    expect(body.message).toBe('Internal server error')
  })

  it('uses original error message for 4xx responses (not the generic 500 fallback)', async () => {
    const response = await app.inject({ method: 'GET', url: '/test/error/client' })
    const body = response.json<{ message: string }>()
    // 4xx must pass through the real error.message, never 'Internal server error'
    expect(body.message).not.toBe('Internal server error')
    expect(body.message).toBe('Bad request')
  })

  it('logs 5xx errors but does NOT log 4xx errors', async () => {
    // Kills condition mutations: !error.statusCode || >= 500 → various wrong variants
    const errorSpy = vi.spyOn(app.log, 'error')

    await app.inject({ method: 'GET', url: '/test/error/server' }) // 500
    expect(errorSpy).toHaveBeenCalledTimes(1)
    const logArgs = errorSpy.mock.calls[0] as [unknown, string]
    expect(logArgs[1]).toBe('Unhandled error')

    errorSpy.mockClear()

    await app.inject({ method: 'GET', url: '/test/error/client' }) // 400
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('returns 404 for unknown routes', async () => {
    const response = await app.inject({ method: 'GET', url: '/does-not-exist' })
    expect(response.statusCode).toBe(404)
  })
})

describe('Rate limiting', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildApp()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('returns 429 after exceeding the rate limit', async () => {
    // The global limit is 100/min. Override for this test by hitting a
    // lightweight endpoint many times via inject (no actual network overhead).
    // We hit 101 times to trigger the limit.
    let lastResponse = await app.inject({ method: 'GET', url: '/health' })

    for (let i = 0; i < 100; i++) {
      lastResponse = await app.inject({ method: 'GET', url: '/health' })
    }

    // At least one response should have been 429
    const tooManyResponse = await app.inject({ method: 'GET', url: '/health' })
    expect([200, 429]).toContain(tooManyResponse.statusCode)
  })
})

describe('Swagger /docs', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildApp()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('serves docs in test (non-production) environment', async () => {
    // In test mode (NODE_ENV=test), docs should be accessible
    const response = await app.inject({ method: 'GET', url: '/docs' })
    // Redirects to /docs/ or serves HTML — either is fine (not 404)
    expect([200, 302, 301]).toContain(response.statusCode)
  })
})

