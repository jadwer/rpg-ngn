import { defineConfig, mergeConfig, type UserConfig } from 'vitest/config'

/**
 * Config compartida de vitest para packages/* y tools/*.
 *
 * Los packages del motor no tocan el DOM: entorno node. Cada package extiende
 * esto en su vitest.config.ts. Los tests viven junto al codigo que cubren
 * (src/**\/*.test.ts) y pueden leer fixtures reales del repo (content/,
 * campaigns/) con node:fs; el codigo de src/ no.
 */
export const sharedConfig: UserConfig = defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['src/**/*.test.ts'],
    testTimeout: 10000,
    watch: false,
  },
})

export function definePackageConfig(overrides: UserConfig = {}): UserConfig {
  return mergeConfig(sharedConfig, defineConfig(overrides))
}
