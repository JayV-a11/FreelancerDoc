import { PrismaClient } from '@prisma/client'
import { env } from '@/shared/config/env'

/**
 * Prisma Client singleton.
 *
 * Why a singleton?
 * - In development, Next.js / tsx hot reload can re-execute module code,
 *   creating multiple PrismaClient instances and exhausting the connection pool.
 * - We store the instance on `globalThis` so it survives hot reloads in dev/test.
 *
 * In production, the module is loaded once and the `global` guard is never hit.
 *
 * IMPORTANT: This client uses DATABASE_URL (transaction pooler, port 6543).
 * Prisma Migrate must use DIRECT_URL (port 5432) — configured in schema.prisma.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : env.NODE_ENV === 'test'
          ? ['error']
          : ['error'],
    errorFormat: 'minimal',
  })

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
