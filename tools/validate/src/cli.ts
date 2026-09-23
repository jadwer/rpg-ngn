#!/usr/bin/env tsx
import { resolve } from 'node:path'
import { formatReport, validatePackDir, validateRepo } from './validate.js'

/**
 * rpg-validate [--root <dir>] | --pack <dir>
 *
 * Valida content/packs/* y campaigns/* bajo la raiz, o una sola carpeta de
 * pack con --pack (la usa tools/packs/pack.sh). Sale con 1 si hay algun
 * error; los avisos no bloquean.
 */
async function main(): Promise<number> {
  const args = process.argv.slice(2)
  const packIndex = args.indexOf('--pack')
  if (packIndex !== -1) {
    const dir = resolve(args[packIndex + 1] ?? process.cwd())
    const report = await validatePackDir(dir)
    console.log(formatReport(report))
    return report.ok ? 0 : 1
  }
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
