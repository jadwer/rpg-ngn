import { access, readdir, readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { loadPack, type FileSource, type LoadedPack } from '@rpg-ngn/content'
import type { PackRef, PackSummary } from '@rpg-ngn/engine-contract'

/**
 * Los packs oficiales viven en disco junto al engine (`content/packs` del
 * repo, o PACKS_DIR). La plataforma manda solo la referencia; los packs de
 * usuario (entrega 8) llegaran por otra via.
 */
export class PackStore {
  private readonly cache = new Map<string, Promise<LoadedPack>>()

  constructor(private readonly root: string) {}

  /**
   * Los packs que este servidor puede jugar, leyendo el manifiesto de cada
   * carpeta. La plataforma lo usa para ofrecerlos al crear una mesa, en vez
   * de que el cliente lleve la lista escrita a mano. Un pack que no carga se
   * omite en vez de tumbar el catalogo: el resto sigue siendo jugable.
   */
  async catalog(): Promise<PackSummary[]> {
    // `withFileTypes` da false en `isDirectory()` para un enlace simbolico,
    // y los packs privados se enlazan desde su propio repo. `stat` sigue el
    // enlace, que es lo que interesa: importa que haya un pack detras.
    const entries = await readdir(this.root).then(
      (names) => names,
      () => [] as string[],
    )
    const dirs: string[] = []
    for (const name of entries) {
      const isDir = await stat(join(this.root, name)).then((s) => s.isDirectory(), () => false)
      if (isDir) dirs.push(name)
    }

    const packs: PackSummary[] = []
    for (const id of dirs.sort()) {
      const { pack } = await loadPack(fsSource(join(this.root, id)))
      if (!pack) continue
      const m = pack.manifest
      packs.push({
        id: m.id,
        version: m.version,
        type: m.type,
        name: m.name,
        tagline: m.tagline ?? null,
        system: m.system,
        characters: m.characters.length,
        sessions: m.sessions.length,
      })
    }
    return packs
  }

  get(ref: PackRef): Promise<LoadedPack> {
    const key = `${ref.id}@${ref.version}`
    let pending = this.cache.get(key)
    if (!pending) {
      pending = this.load(ref)
      this.cache.set(key, pending)
      pending.catch(() => this.cache.delete(key))
    }
    return pending
  }

  private async load(ref: PackRef): Promise<LoadedPack> {
    const { pack, issues } = await loadPack(fsSource(join(this.root, ref.id)))
    if (!pack) {
      throw new Error(`pack ${ref.id} no carga: ${issues.map((i) => `${i.path}: ${i.message}`).join('; ')}`)
    }
    if (pack.manifest.version !== ref.version) {
      throw new Error(`pack ${ref.id} esta en ${pack.manifest.version} y la campaña pide ${ref.version}`)
    }
    return pack
  }
}

export function fsSource(root: string): FileSource {
  return {
    readText: (path) => readFile(join(root, path), 'utf8'),
    exists: (path) => access(join(root, path)).then(() => true, () => false),
    list: (dir) => readdir(join(root, dir), { withFileTypes: true }).then((e) => e.filter((x) => x.isFile()).map((x) => x.name), () => []),
  }
}
