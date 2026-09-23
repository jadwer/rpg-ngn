import { access, readdir, readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { loadPack, type FileSource, type LoadedPack } from '@rpg-ngn/content'
import type { PackCharacter, PackMapView, PackNpc, PackRef, PackSummary } from '@rpg-ngn/engine-contract'

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
        playerPersona: m.playerPersona,
      })
    }
    return packs
  }

  /**
   * Los personajes jugables de un pack. La web lleva el pack piloto
   * empaquetado, pero de los demas no sabe nada: sin esto, quien crea una
   * mesa con otro pack no puede elegir personaje.
   */
  /** Los NPC con nombre y retrato: lo justo para el dialogo de un cliente que no lleva el pack. */
  async npcs(ref: PackRef): Promise<PackNpc[]> {
    const pack = await this.get(ref)
    return [...pack.npcs.values()].map((n) => ({ id: n.id, name: n.name, portrait: n.portrait ?? null }))
  }

  async characters(ref: PackRef): Promise<PackCharacter[]> {
    const pack = await this.get(ref)
    return [...pack.characters.values()].map((c) => ({
      id: c.id,
      name: c.name,
      race: c.race,
      characterClass: c.class,
      quote: c.quote,
      roles: c.roles,
      portrait: c.portrait ?? null,
    }))
  }

  /**
   * Los bytes de un retrato, o null si no esta. `file` ya viene validado
   * como nombre simple por quien llama.
   */
  async portrait(packId: string, file: string): Promise<Buffer | null> {
    // `packId` viene de la URL: se limita a un id de pack, sin separadores.
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(packId)) return null
    return readFile(join(this.root, packId, 'portraits', file)).catch(() => null)
  }

  /** La imagen de un mapa del pack, como los retratos. */
  async mapImage(packId: string, file: string): Promise<Buffer | null> {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(packId)) return null
    return readFile(join(this.root, packId, 'maps', file)).catch(() => null)
  }

  /** Los mapas de un pack con sus lugares ya posados, para pintarlos. */
  async maps(ref: PackRef): Promise<PackMapView[]> {
    const pack = await this.get(ref)
    return [...pack.maps.values()].map((map) => ({
      id: map.id,
      name: map.name,
      image: map.image,
      description: map.description ?? null,
      places: [...pack.locations.values()]
        .filter((l) => l.map === map.id && l.x !== undefined && l.y !== undefined)
        .map((l) => ({ id: l.id, name: l.name, x: l.x as number, y: l.y as number, connections: [...l.connections] })),
    }))
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
