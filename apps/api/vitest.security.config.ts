import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

/**
 * Security test config — runs against an isolated Supabase test project.
 * Requires TEST_SUPABASE_URL and TEST_SUPABASE_SERVICE_KEY to be set in .env
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.security.test.ts'],
    // Security tests run sequentially to avoid interference between test users
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    testTimeout: 30_000,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
