import { access, readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { FileSource } from '@rpg-ngn/content'

/** FileSource sobre el sistema de archivos, con raiz en un directorio. */
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
        (entries) => entries.filter((entry) => entry.isFile()).map((entry) => entry.name),
        () => [],
      ),
  }
}
