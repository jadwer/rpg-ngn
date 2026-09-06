import js from '@eslint/js'
import tseslint from 'typescript-eslint'

/**
 * Regla de dependencias del ADR (docs/11, D8): ningun package bajo packages/
 * importa React, Next, Expo ni modulos de Node. Lo que necesite I/O recibe
 * una interfaz (por ejemplo FileSource en @rpg-ngn/content) y la
 * implementacion vive en tools/* o apps/*.
 */
const platformImports = [
  { group: ['node:*', 'fs', 'fs/promises', 'path', 'crypto', 'os', 'child_process', 'url', 'stream', 'util'], message: 'packages/* no importa modulos de Node; recibe una interfaz.' },
  { group: ['react', 'react/*', 'react-dom', 'react-dom/*', 'react-native', 'react-native/*'], message: 'packages/* no importa React.' },
  { group: ['next', 'next/*', 'expo', 'expo-*', 'expo/*'], message: 'packages/* no importa Next ni Expo.' },
]

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**', 'apps/sheets/**', '.playwright-mcp/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['packages/*/src/**/*.ts'],
    ignores: ['packages/*/src/**/*.test.ts', 'packages/*/src/**/*.test-helpers.ts', 'packages/*/scripts/**'],
    rules: {
      'no-restricted-imports': ['error', { patterns: platformImports }],
    },
  },
  {
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
)
