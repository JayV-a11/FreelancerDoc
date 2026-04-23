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
    // Only mutate files that have corresponding unit tests.
    // App pages, components, middleware, and lib are excluded from unit tests
    // (they require a browser/JSDOM environment and are tested at the e2e level).
    'src/stores/**/*.ts',
    'src/services/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.test.tsx',
    '!src/**/*.spec.ts',
    '!src/**/*.spec.tsx',
  ],
  ignoreStatic: true,
  incremental: true,
}
