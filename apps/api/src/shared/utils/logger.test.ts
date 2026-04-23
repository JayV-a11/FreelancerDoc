/**
 * logger.test.ts — Unit tests for the Pino logger configuration.
 *
 * We mock `pino` to intercept the options object passed to it at module
 * initialisation. This lets us assert on every config value without
 * needing to capture real log output — and it kills all string-literal,
 * boolean, and conditional mutations that Stryker injects into logger.ts.
 */
import { describe, it, expect, vi } from 'vitest'
import type pino from 'pino'

// ── Pino mock — must be hoisted before any import that triggers logger.ts ──
vi.mock('pino', () => {
  const mockLogger = {
    level: 'silent',
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    child: vi.fn(),
  }
  const mockPino = vi.fn(() => mockLogger) as unknown as typeof pino
  return { default: mockPino }
})

// Import AFTER the mock is registered (vi.mock is auto-hoisted by Vitest)
import pinoDefault from 'pino'
import { logger } from './logger'

const capturedConfig = (): pino.LoggerOptions => {
  const calls = vi.mocked(pinoDefault).mock.calls
  const firstCall = calls[0]
  if (!firstCall) throw new Error('pino was never called')
  return firstCall[0] as pino.LoggerOptions
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('logger', () => {
  it('creates a pino logger instance', () => {
    expect(pinoDefault).toHaveBeenCalledOnce()
    expect(logger).toBeDefined()
    expect(typeof logger.info).toBe('function')
  })

  describe('level', () => {
    it('uses "silent" level in test environment to suppress output', () => {
      // NODE_ENV = 'test' in all test runs (see src/test/setup.ts).
      // Mutation: 'silent' → '' or === 'test' → !== 'test' both change this.
      expect(capturedConfig().level).toBe('silent')
    })
  })

  describe('redact configuration', () => {
    it('censors redacted fields with [REDACTED]', () => {
      const redact = capturedConfig().redact as pino.redactOptions
      expect(redact.censor).toBe('[REDACTED]')
    })

    it('includes all sensitive field paths in the redact list', () => {
      const redact = capturedConfig().redact as pino.redactOptions
      const paths = redact.paths

      // Each assertion below kills the corresponding string-literal mutation
      expect(paths).toContain('password')
      expect(paths).toContain('passwordHash')
      expect(paths).toContain('token')
      expect(paths).toContain('refreshToken')
      expect(paths).toContain('secret')
      expect(paths).toContain('authorization')
      expect(paths).toContain('cookie')
      expect(paths).toContain('*.password')
      expect(paths).toContain('*.passwordHash')
      expect(paths).toContain('*.token')
    })
  })

  describe('transport configuration', () => {
    it('uses pino-pretty transport in non-production environments', () => {
      // NODE_ENV = 'test' → not production → transport should be present.
      // Mutation: !== 'production' → === 'production' removes transport config.
      const transport = capturedConfig().transport as {
        target: string
        options: Record<string, unknown>
      }
      expect(transport).toBeDefined()
      expect(transport.target).toBe('pino-pretty')
    })

    it('configures pino-pretty with colorize and timestamp options', () => {
      const transport = capturedConfig().transport as {
        target: string
        options: Record<string, unknown>
      }
      expect(transport.options['colorize']).toBe(true)
      expect(transport.options['translateTime']).toBe('SYS:standard')
      expect(transport.options['ignore']).toBe('pid,hostname')
    })
  })
})
