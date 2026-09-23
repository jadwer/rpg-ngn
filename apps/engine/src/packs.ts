import { access, readdir, readFile, stat } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'
import { loadPack, type FileSource, type Issue, type LoadedPack } from '@rpg-ngn/content'
import type { PackCharacter, PackMapView, PackNpc, PackRef, PackSheets, PackSummary } from '@rpg-ngn/engine-contract'

const PACK_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * Los packs viven en disco junto al engine, en dos raices: la oficial
 * (`content/packs` del repo, o PACKS_DIR) y la de los packs subidos por la
 * gente (USER_PACKS_DIR, entrega 8). La plataforma manda solo la referencia
 * `id@version`; el engine busca la carpeta primero en la raiz oficial y luego
 * en la de usuario. El catalogo publico solo lista la oficial: los de usuario
 * los conoce la base de datos de la plataforma, no el disco.
 */
export class PackStore {
  private readonly cache = new Map<string, Promise<LoadedPack>>()

  constructor(
    private readonly root: string,
    private readonly userRoot: string | null = null,
  ) {}

  /**
   * Los packs oficiales que este servidor puede jugar, leyendo el manifiesto
   * de cada carpeta. La plataforma lo usa para ofrecerlos al crear una mesa,
   * en vez de que el cliente lleve la lista escrita a mano. Un pack que no
   * carga se omite en vez de tumbar el catalogo: el resto sigue siendo jugable.
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
      packs.push(summaryOf(pack))
    }
    return packs
  }

  /**
   * Valida un pack recien subido, todavia en cuarentena, con los mismos
   * schemas que cargan los oficiales. La carpeta tiene que estar dentro de la
   * raiz de usuario: el engine no lee rutas arbitrarias aunque la peticion
   * venga de la plataforma. Devuelve todos los avisos, no solo el primero,
   * para que el autor arregle su pack de una vez.
   */
  async validate(dir: string): Promise<{ ok: boolean; issues: Issue[]; pack: PackSummary | null }> {
    if (!this.userRoot || !isInside(resolve(dir), resolve(this.userRoot))) {
      return { ok: false, issues: [{ level: 'error', path: dir, message: 'la carpeta no esta en la zona de packs de usuario' }], pack: null }
    }
    const { pack, issues } = await loadPack(fsSource(dir))
    return { ok: pack !== null && !issues.some((i) => i.level === 'error'), issues, pack: pack ? summaryOf(pack) : null }
  }

  /** Los NPC con nombre y retrato: lo justo para el dialogo de un cliente que no lleva el pack. */
  async npcs(ref: PackRef): Promise<PackNpc[]> {
    const pack = await this.get(ref)
    return [...pack.npcs.values()].map((n) => ({ id: n.id, name: n.name, portrait: n.portrait ?? null }))
  }

  /**
   * Los personajes jugables de un pack. La web lleva el pack piloto
   * empaquetado, pero de los demas no sabe nada: sin esto, quien crea una
   * mesa con otro pack no puede elegir personaje.
   */
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
    return this.file(packId, 'portraits', file)
  }

  /** La imagen de un mapa del pack, como los retratos. */
  async mapImage(packId: string, file: string): Promise<Buffer | null> {
    return this.file(packId, 'maps', file)
  }

  /**
   * Las fichas completas y las sesiones de un pack, para el panel de fichas
   * de un cliente que no lo lleva empaquetado (E3). En el orden del manifiesto.
   */
  async sheets(ref: PackRef): Promise<PackSheets> {
    const pack = await this.get(ref)
    return {
      characters: pack.manifest.characters.map((id) => pack.characters.get(id)).filter((c): c is NonNullable<typeof c> => !!c),
      sessions: pack.manifest.sessions.map((id) => pack.sessions.get(id)).filter((s): s is NonNullable<typeof s> => !!s),
    }
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

  private async file(packId: string, kind: 'portraits' | 'maps', file: string): Promise<Buffer | null> {
    // `packId` viene de la URL: se limita a un id de pack, sin separadores.
    if (!PACK_ID.test(packId)) return null
    const dir = await this.dirOf(packId)
    if (!dir) return null
    return readFile(join(dir, kind, file)).catch(() => null)
  }

  /** La carpeta de un pack: la oficial si existe, si no la de usuario. */
  private async dirOf(id: string): Promise<string | null> {
    if (!PACK_ID.test(id)) return null
    for (const root of [this.root, this.userRoot]) {
      if (!root) continue
      const dir = join(root, id)
      if (await access(join(dir, 'pack.json')).then(() => true, () => false)) return dir
    }
    return null
  }

  private async load(ref: PackRef): Promise<LoadedPack> {
    const dir = await this.dirOf(ref.id)
    if (!dir) throw new Error(`pack ${ref.id} no existe en este servidor`)
    const { pack, issues } = await loadPack(fsSource(dir))
    if (!pack) {
      throw new Error(`pack ${ref.id} no carga: ${issues.map((i) => `${i.path}: ${i.message}`).join('; ')}`)
    }
    if (pack.manifest.version !== ref.version) {
      throw new Error(`pack ${ref.id} esta en ${pack.manifest.version} y la campaña pide ${ref.version}`)
    }
    return pack
  }
}

function summaryOf(pack: LoadedPack): PackSummary {
  const m = pack.manifest
  return {
    id: m.id,
    version: m.version,
    type: m.type,
    name: m.name,
    tagline: m.tagline ?? null,
    system: m.system,
    characters: m.characters.length,
    sessions: m.sessions.length,
    playerPersona: m.playerPersona,
  }
}

function isInside(path: string, root: string): boolean {
  return path === root || path.startsWith(root.endsWith(sep) ? root : root + sep)
}

export function fsSource(root: string): FileSource {
  return {
    readText: (path) => readFile(join(root, path), 'utf8'),
    exists: (path) => access(join(root, path)).then(() => true, () => false),
    list: (dir) => readdir(join(root, dir), { withFileTypes: true }).then((e) => e.filter((x) => x.isFile()).map((x) => x.name), () => []),
  }
}
