import { access, readdir, readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import type { FileSource } from './source.js'

/**
 * Solo para tests: FileSource sobre el sistema de archivos, apuntando a los
 * fixtures reales del repo (content/packs/pilot, campaigns/pilot).
 */
export const repoRoot = resolve(import.meta.dirname, '../../..')

export function fsSource(root: string): FileSource {
  return {
    readText: (path) => readFile(join(root, path), 'utf8'),
    exists: (path) =>
      access(join(root, path)).then(
        () => true,
        () => false,
      ),
    list: (dir) =>
      readdir(join(root, dir), { withFileTypes: true }).then(
        (entries) => entries.filter((e) => e.isFile()).map((e) => e.name),
        () => [],
      ),
  }
}

export const pilotPackDir = join(repoRoot, 'content/packs/pilot')
export const pilotLogPath = join(repoRoot, 'campaigns/pilot/events.jsonl')
