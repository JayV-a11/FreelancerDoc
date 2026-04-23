import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/server.ts'],
  format: ['cjs'],
  target: 'node20',
  sourcemap: true,
  clean: true,
  outDir: 'dist',
  // Externalize Prisma client — it loads native binaries at runtime
  external: ['@prisma/client', '.prisma/client'],
  // Resolve path aliases (@/ → src/)
  paths: {
    '@/*': ['./src/*'],
  },
})
