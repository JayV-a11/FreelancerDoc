import pino from 'pino'
import { env } from '@/shared/config/env'

/**
 * Standalone Pino logger — used outside the Fastify request context
 * (e.g., startup scripts, cron jobs, seed scripts).
 *
 * Fastify uses its own child instance derived from this config.
 *
 * Sensitive fields are redacted per the spec requirement:
 * "Nunca logar dados sensíveis"
 */
export const logger = pino(
  {
    level: env.NODE_ENV === 'test' ? 'silent' : 'info',
    redact: {
      paths: [
        'password',
        'passwordHash',
        'token',
        'refreshToken',
        'secret',
        'authorization',
        'cookie',
        '*.password',
        '*.passwordHash',
        '*.token',
      ],
      censor: '[REDACTED]',
    },
    ...(env.NODE_ENV !== 'production' && {
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
    }),
  },
)
