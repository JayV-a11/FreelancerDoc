/**
 * rate-limit.test.ts — Unit tests for rate limit configuration factories.
 *
 * Directly invokes the `errorResponseBuilder` callbacks to give Stryker
 * coverage of those lines and kill all string-literal mutations in them.
 * These callbacks are only called by @fastify/rate-limit when a route limit
 * is exceeded — they cannot be triggered via normal integration tests without
 * exceeding real rate limits.
 */
import { describe, it, expect } from 'vitest'
import { AUTH_RATE_LIMIT, REFRESH_RATE_LIMIT, PASSWORD_RESET_RATE_LIMIT } from './rate-limit'

// ── Helpers ────────────────────────────────────────────────────────────────

type ErrorResponse = { statusCode: number; error: string; message: string }

function callBuilder(
  config: { errorResponseBuilder?: (...args: unknown[]) => unknown },
): ErrorResponse {
  if (!config.errorResponseBuilder) throw new Error('errorResponseBuilder not defined')
  return config.errorResponseBuilder() as ErrorResponse
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('AUTH_RATE_LIMIT errorResponseBuilder', () => {
  it('returns 429 status code', () => {
    expect(callBuilder(AUTH_RATE_LIMIT).statusCode).toBe(429)
  })

  it('returns "Too Many Requests" error field', () => {
    expect(callBuilder(AUTH_RATE_LIMIT).error).toBe('Too Many Requests')
  })

  it('includes 15 minutes in the message', () => {
    expect(callBuilder(AUTH_RATE_LIMIT).message).toContain('15 minutes')
  })
})

describe('REFRESH_RATE_LIMIT errorResponseBuilder', () => {
  it('returns 429 status code', () => {
    expect(callBuilder(REFRESH_RATE_LIMIT).statusCode).toBe(429)
  })

  it('returns "Too Many Requests" error field', () => {
    expect(callBuilder(REFRESH_RATE_LIMIT).error).toBe('Too Many Requests')
  })

  it('message indicates to try again later', () => {
    expect(callBuilder(REFRESH_RATE_LIMIT).message).toContain('later')
  })
})

describe('PASSWORD_RESET_RATE_LIMIT errorResponseBuilder', () => {
  it('returns 429 status code', () => {
    expect(callBuilder(PASSWORD_RESET_RATE_LIMIT).statusCode).toBe(429)
  })

  it('returns "Too Many Requests" error field', () => {
    expect(callBuilder(PASSWORD_RESET_RATE_LIMIT).error).toBe('Too Many Requests')
  })

  it('includes 1 hour in the message', () => {
    expect(callBuilder(PASSWORD_RESET_RATE_LIMIT).message).toContain('1 hour')
  })
})
