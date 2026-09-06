#!/usr/bin/env tsx
import { resolve } from 'node:path'
import { formatReport, validateRepo } from './validate.js'

/**
 * rpg-validate [--root <dir>]
 *
 * Valida content/packs/* y campaigns/* bajo la raiz. Sale con 1 si hay algun
 * error; los avisos no bloquean.
 */
async function main(): Promise<number> {
  const args = process.argv.slice(2)
  const rootIndex = args.indexOf('--root')
  const root = resolve(rootIndex === -1 ? process.cwd() : (args[rootIndex + 1] ?? process.cwd()))

  const report = await validateRepo(root)
  console.log(formatReport(report))
  return report.ok ? 0 : 1
}

main().then(
  (code) => process.exit(code),
  (error) => {
    console.error(error)
    process.exit(2)
  },
)
