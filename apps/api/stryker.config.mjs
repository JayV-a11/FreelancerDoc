/** @type {import('@stryker-mutator/core').PartialStrykerOptions} */
export default {
  testRunner: 'vitest',
  reporters: ['html', 'clear-text', 'progress'],
  coverageAnalysis: 'perTest',
  thresholds: {
    high: 80,
    low: 60,
    break: 60,
  },
  vitest: {
    configFile: 'vitest.config.ts',
  },
  mutate: [
    // Mutate only business logic — explicitly listed to avoid config/infra noise.
    // app.ts (bootstrap), logger.ts, rate-limit.ts are intentionally excluded:
    // they contain no branching domain logic and produce unkillable mutations.
    'src/modules/**/*.ts',
    'src/shared/errors/**/*.ts',
    'src/shared/middlewares/**/*.ts',
    'src/shared/utils/hash.ts',
    // Exclude test files from mutation
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.security.test.ts',
    // pdf.service.ts is a rendering/presentation layer — mutations are cosmetic
    // (font sizes, colours, margins) and cannot be detected without parsing PDF internals.
    '!src/modules/documents/pdf.service.ts',
  ],
  ignoreStatic: true,
  disableTypeChecks: false,
  incremental: false,
}
