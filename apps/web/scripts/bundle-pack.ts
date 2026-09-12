import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join, posix, relative, resolve } from 'node:path'

/**
 * Empaqueta un content pack dentro de la web, igual que hace la app movil:
 *
 *   src/generated/<pack>-pack.ts     JSON del pack como texto, para memorySource
 *   public/packs/<pack>/...          copia de los retratos, servidos como estaticos
 *
 * Solo el pack (nombres, retratos, sesiones); el estado vivo llega de la API.
 * Uso: pnpm --filter web bundle-pack [packId]
 */

const appRoot = resolve(import.meta.dirname, '..')
const repoRoot = resolve(appRoot, '../..')
const packId = process.argv[2] ?? 'pilot'
const packDir = join(repoRoot, 'content/packs', packId)
const generatedDir = join(appRoot, 'src/generated')
const publicDir = join(appRoot, 'public/packs', packId)

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

// La capa dm del pack (secrets/) nunca llega al navegador: el manifiesto empaquetado la declara vacia.
const isSecret = (f: string): boolean => relPosix(f).startsWith('secrets/')
const textFiles = files.filter((f) => TEXT.test(f) && !isSecret(f))
const imageFiles = files.filter((f) => IMAGE.test(f))
for (const file of files.filter((f) => !TEXT.test(f) && !IMAGE.test(f))) console.warn(`omitido (ni texto ni imagen): ${relPosix(file)}`)
const secretsOmitted = files.filter(isSecret).length
if (secretsOmitted > 0) console.warn(`omitidos ${secretsOmitted} secretos del pack (capa dm, no se empaquetan)`)

function textOf(file: string): string {
  const text = readFileSync(file, 'utf8')
  if (relPosix(file) !== 'pack.json') return text
  const parsed = JSON.parse(text) as Record<string, unknown>
  if (!('secrets' in parsed)) return text
  return JSON.stringify({ ...parsed, secrets: [] }, null, 2) + '\n'
}

rmSync(publicDir, { recursive: true, force: true })
for (const file of imageFiles) {
  const target = join(publicDir, relPosix(file))
  mkdirSync(join(target, '..'), { recursive: true })
  copyFileSync(file, target)
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
  ...textFiles.map((f) => `  ${JSON.stringify(relPosix(f))}: ${JSON.stringify(textOf(f))},`),
  '}',
  '',
  '/** Retratos copiados a public/packs/<pack>/; se sirven como estaticos. */',
  'export const packBinaries: readonly string[] = [',
  ...imageFiles.map((f) => `  ${JSON.stringify(relPosix(f))},`),
  ']',
  '',
].join('\n')

mkdirSync(generatedDir, { recursive: true })
writeFileSync(join(generatedDir, `${packId}-pack.ts`), packModule)

console.log(`${manifest.id}@${manifest.version}: ${textFiles.length} archivos de texto, ${imageFiles.length} imagenes en public/packs/${packId}`)
