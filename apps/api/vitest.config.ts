import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'dist/**',
        // Prisma folder: seed and migration scripts are not production code
        'prisma/**',
        // All test helpers, fixtures, setup files, and security tests
        'src/test/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/*.security.test.ts',
        '**/*.d.ts',
        '**/*.config.*',
        'src/types/**',
        // Entry point — tested via integration, not unit tests
        'src/server.ts',
        // Infra singletons — require live DB/Supabase connection; tested in security/integration tests
        'src/shared/config/env.ts',
        'src/shared/config/prisma.ts',
        'src/shared/config/supabase.ts',
        // Logger — tested directly in src/shared/utils/logger.test.ts
        // (kept in coverage scope so Stryker's perTest analysis can map mutations)
        // Auth middleware — tested in Step 5 (auth module)
        'src/shared/middlewares/authenticate.ts',
        // Barrel re-export files — no executable logic
        '**/index.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
