import { vi, type Mock } from 'vitest'
import type { PrismaClient } from '@prisma/client'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMock = Mock<(...args: any[]) => any>

type DeepMockProxy<T> = {
  [K in keyof T]: T[K] extends (...args: unknown[]) => unknown
    ? AnyMock
    : T[K] extends object
      ? DeepMockProxy<T[K]>
      : T[K]
}

/**
 * Creates a deep mock of the Prisma client.
 *
 * Usage in a test file:
 *
 * ```ts
 * import { vi, beforeEach } from 'vitest'
 * import { prisma } from '@/shared/config/prisma'
 * import { createPrismaMock } from '@/test/helpers/prisma-mock'
 *
 * vi.mock('@/shared/config/prisma', () => ({
 *   prisma: createPrismaMock(),
 * }))
 *
 * const prismaMock = prisma as unknown as ReturnType<typeof createPrismaMock>
 *
 * beforeEach(() => {
 *   vi.clearAllMocks()
 * })
 * ```
 */
export function createPrismaMock(): DeepMockProxy<PrismaClient> {
  // Build a Proxy that returns vi.fn() for any property access,
  // including nested model methods like prisma.user.findUnique
  function makeMock(): DeepMockProxy<PrismaClient> {
    return new Proxy(
      {},
      {
        get(_target, prop) {
          if (prop === '$transaction') {
            // Support both callback and array variants of $transaction
            return vi.fn((arg: unknown) => {
              if (typeof arg === 'function') {
                return arg(makeMock())
              }
              return Promise.all(arg as Promise<unknown>[])
            })
          }

          if (prop === '$connect' || prop === '$disconnect') {
            return vi.fn().mockResolvedValue(undefined)
          }

          // Return a nested mock for any model (user, template, document, etc.)
          return new Proxy(
            {},
            {
              get(_inner, method) {
                return vi.fn().mockResolvedValue(null)
              },
            },
          )
        },
      },
    ) as unknown as DeepMockProxy<PrismaClient>
  }

  return makeMock()
}
