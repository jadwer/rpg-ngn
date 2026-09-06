import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join, posix, relative, resolve } from 'node:path'

/**
 * Empaqueta un content pack y su log dentro de la app, para jugar sin
 * servidor (docs/11, D8: modo offline con pack local). Genera:
 *
 *   src/generated/<pack>-pack.ts       JSON y log como texto, para memorySource
 *   src/generated/<pack>-portraits.ts  require() de cada imagen, para Image
 *   assets/pack/<pack>/...             copia de las imagenes (Metro solo ve el workspace)
 *
 * Uso: pnpm --filter mobile bundle-pack [packId]
 */

const appRoot = resolve(import.meta.dirname, '..')
const repoRoot = resolve(appRoot, '../..')
const packId = process.argv[2] ?? 'pilot'
const packDir = join(repoRoot, 'content/packs', packId)
const logPath = join(repoRoot, 'campaigns', packId, 'events.jsonl')
const generatedDir = join(appRoot, 'src/generated')
const assetsDir = join(appRoot, 'assets/pack', packId)

const IMAGE = /\.(jpe?g|png|webp)$/i
const TEXT = /\.(json|md|txt)$/i

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else if (entry.isFile()) out.push(full)
  }
  return out.sort()
}

function relPosix(file: string): string {
  return relative(packDir, file).split('\\').join(posix.sep)
}

statSync(packDir)
const files = walk(packDir)
const manifest = JSON.parse(readFileSync(join(packDir, 'pack.json'), 'utf8')) as { id: string; version: string }

const textFiles = files.filter((f) => TEXT.test(f))
const imageFiles = files.filter((f) => IMAGE.test(f))
const skipped = files.filter((f) => !TEXT.test(f) && !IMAGE.test(f))
for (const file of skipped) console.warn(`omitido (ni texto ni imagen): ${relPosix(file)}`)

rmSync(assetsDir, { recursive: true, force: true })
for (const file of imageFiles) {
  const target = join(assetsDir, relPosix(file))
  mkdirSync(join(target, '..'), { recursive: true })
  copyFileSync(file, target)
}

let eventLog = ''
try {
  eventLog = readFileSync(logPath, 'utf8')
} catch {
  console.warn(`sin log en ${logPath}; la app arranca con el estado inicial del pack`)
}

const header = `/* Generado por scripts/bundle-pack.ts desde content/packs/${packId} (${manifest.id}@${manifest.version}). No editar a mano. */`

const packModule = [
  header,
  '',
  `export const PACK_ID = ${JSON.stringify(manifest.id)}`,
  `export const PACK_VERSION = ${JSON.stringify(manifest.version)}`,
  '',
  '/** Archivos de texto del pack, ruta relativa a la raiz del pack. */',
  'export const packFiles: Readonly<Record<string, string>> = {',
  ...textFiles.map((f) => `  ${JSON.stringify(relPosix(f))}: ${JSON.stringify(readFileSync(f, 'utf8'))},`),
  '}',
  '',
  '/** Archivos binarios que existen en el pack (retratos); su contenido vive en el modulo de portraits. */',
  'export const packBinaries: readonly string[] = [',
  ...imageFiles.map((f) => `  ${JSON.stringify(relPosix(f))},`),
  ']',
  '',
  '/** Log de campaña, una linea JSON por evento; vacio si el pack no tiene campaña. */',
  `export const eventLog = ${JSON.stringify(eventLog)}`,
  '',
].join('\n')

const portraitsModule = [
  header,
  '/* eslint-disable @typescript-eslint/no-require-imports */',
  '',
  'export const portraits: Readonly<Record<string, number>> = {',
  ...imageFiles.map((f) => `  ${JSON.stringify(relPosix(f))}: require(${JSON.stringify(`../../assets/pack/${packId}/${relPosix(f)}`)}),`),
  '}',
  '',
].join('\n')

mkdirSync(generatedDir, { recursive: true })
writeFileSync(join(generatedDir, `${packId}-pack.ts`), packModule)
writeFileSync(join(generatedDir, `${packId}-portraits.ts`), portraitsModule)

console.log(`${manifest.id}@${manifest.version}: ${textFiles.length} archivos de texto, ${imageFiles.length} imagenes, log de ${eventLog.split('\n').filter(Boolean).length} eventos`)
