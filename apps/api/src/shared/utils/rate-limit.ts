import type { RateLimitOptions } from '@fastify/rate-limit'

/**
 * Per-route rate limit configurations for sensitive endpoints.
 *
 * These are applied as `config.rateLimit` on individual routes, overriding
 * the global 100/min baseline set in app.ts.
 *
 * Usage in a route file:
 *   import { AUTH_RATE_LIMIT } from '@/shared/utils/rate-limit'
 *
 *   fastify.post('/login', { config: { rateLimit: AUTH_RATE_LIMIT } }, handler)
 *
 * Rationale for values:
 *   - AUTH_RATE_LIMIT (10/15min): brute-force protection on login/register.
 *     NIST SP 800-63B recommends throttling after 5 failed attempts;
 *     we allow 10 total to balance usability with security.
 *   - REFRESH_RATE_LIMIT (20/5min): prevents token-grinding attacks on the
 *     refresh endpoint while allowing normal SPA tab behaviour (multiple tabs).
 *   - PASSWORD_RESET_RATE_LIMIT (5/1h): prevents email enumeration via
 *     password reset requests.
 */

export const AUTH_RATE_LIMIT: RateLimitOptions = {
  max: 10,
  timeWindow: '15 minutes',
  errorResponseBuilder: () => ({
    statusCode: 429,
    error: 'Too Many Requests',
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
  }),
}

export const REFRESH_RATE_LIMIT: RateLimitOptions = {
  max: 20,
  timeWindow: '5 minutes',
  errorResponseBuilder: () => ({
    statusCode: 429,
    error: 'Too Many Requests',
    message: 'Too many token refresh attempts. Please try again later.',
  }),
}

export const PASSWORD_RESET_RATE_LIMIT: RateLimitOptions = {
  max: 5,
  timeWindow: '1 hour',
  errorResponseBuilder: () => ({
    statusCode: 429,
    error: 'Too Many Requests',
    message: 'Too many password reset requests. Please try again in 1 hour.',
  }),
}
