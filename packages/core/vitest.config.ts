import { definePackageConfig } from '../../vitest.shared'

/** core es determinista y sin I/O: se exige cobertura total (ADR, entrega 2). */
export default definePackageConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/index.ts'],
      thresholds: { lines: 100, functions: 100, branches: 100, statements: 100 },
      reporter: ['text-summary'],
    },
  },
})
