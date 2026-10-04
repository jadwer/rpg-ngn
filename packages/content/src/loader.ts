import type { ZodType } from 'zod'
import { Character } from './character.js'
import { refId, refKind } from './common.js'
import { hasErrors, zodIssues, type Issue } from './issues.js'
import { Location } from './location.js'
import { PackMap } from './map.js'
import { Npc } from './npc.js'
import { applyOverlay } from './overlay.js'
import { PackManifest } from './pack.js'
import { Quest } from './quest.js'
import { Session } from './session.js'
import { Secret } from './secret.js'
import { readJson, type FileSource } from './source.js'

/**
 * Carga y valida un content pack completo desde un FileSource. Devuelve el
 * pack tipado y la lista de problemas; con un solo error el pack no se
 * considera cargado.
 */

export interface LoadedPack {
  manifest: PackManifest
  characters: Map<string, Character>
  npcs: Map<string, Npc>
  locations: Map<string, Location>
  /** Mapas de region del pack; vacio si no trae ninguno. */
  maps: Map<string, PackMap>
  quests: Map<string, Quest>
  sessions: Map<string, Session>
  /** Capa `gm`: solo la lee el motor y el GM; nunca una proyeccion de jugador. */
  secrets: Map<string, Secret>
  /** Idioma en que quedaron los textos: el pedido si el pack lo trae traducido, si no el suyo. */
  language: string
}

export interface LoadPackResult {
  pack: LoadedPack | null
  issues: Issue[]
}

const collections = [
  { key: 'characters', dir: 'characters', schema: Character },
  { key: 'npcs', dir: 'npcs', schema: Npc },
  { key: 'locations', dir: 'locations', schema: Location },
  { key: 'maps', dir: 'maps', schema: PackMap },
  { key: 'quests', dir: 'quests', schema: Quest },
  { key: 'sessions', dir: 'sessions', schema: Session },
  { key: 'secrets', dir: 'secrets', schema: Secret },
] as const

type CollectionKey = (typeof collections)[number]['key']

export interface LoadPackOptions {
  /**
   * Idioma en que se quiere el pack (i18n). Si el pack trae `i18n/<idioma>/`,
   * sus textos sustituyen a los del original; lo que no este traducido se
   * queda como en el original. Sin idioma, el pack tal cual.
   */
  language?: string | undefined
}

export async function loadPack(source: FileSource, options: LoadPackOptions = {}): Promise<LoadPackResult> {
  const issues: Issue[] = []

  let rawManifest: unknown
  try {
    rawManifest = await readJson(source, 'pack.json')
  } catch (error) {
    return { pack: null, issues: [{ level: 'error', path: 'pack.json', message: (error as Error).message }] }
  }

  const baseResult = PackManifest.safeParse(rawManifest)
  if (!baseResult.success) {
    return { pack: null, issues: zodIssues(baseResult.error, 'pack.json') }
  }

  // Cada traduccion declarada tiene que existir: el catalogo la anuncia.
  for (const translation of baseResult.data.translations) {
    if (translation === baseResult.data.language) {
      issues.push({ level: 'error', path: 'pack.json', message: `translations incluye ${translation}, que es el idioma del pack` })
    } else if (!(await source.exists(`i18n/${translation}/pack.json`))) {
      issues.push({ level: 'error', path: 'pack.json', message: `translations declara ${translation} y falta i18n/${translation}/pack.json` })
    }
  }

  // Solo se aplica una traduccion declarada; cualquier otro idioma carga el original.
  const language = options.language && baseResult.data.translations.includes(options.language) ? options.language : null
  let manifest = baseResult.data
  if (language) {
    const translated = PackManifest.safeParse(await readTranslated(source, 'pack.json', language, issues))
    if (!translated.success) {
      return { pack: null, issues: [...issues, ...zodIssues(translated.error, `i18n/${language}/pack.json`)] }
    }
    manifest = translated.data
  }

  const loaded: Record<CollectionKey, Map<string, unknown>> = {
    characters: new Map(),
    npcs: new Map(),
    locations: new Map(),
    maps: new Map(),
    quests: new Map(),
    sessions: new Map(),
    secrets: new Map(),
  }

  for (const collection of collections) {
    const ids = manifest[collection.key]
    for (const id of ids) {
      const path = `${collection.dir}/${id}.json`
      const entity = (await loadEntity(source, path, collection.schema, issues, language)) as { id: string } | null
      if (!entity) continue
      if (entity.id !== id) {
        issues.push({ level: 'error', path, message: `el id interno (${entity.id}) no coincide con el nombre del archivo` })
        continue
      }
      loaded[collection.key].set(id, entity)
    }

    const declared = new Set(ids.map((id) => `${id}.json`))
    for (const file of await source.list(collection.dir)) {
      if (file.endsWith('.json') && !declared.has(file)) {
        issues.push({ level: 'warning', path: `${collection.dir}/${file}`, message: 'archivo no declarado en pack.json; el motor no lo ve' })
      }
    }
  }

  const characters = loaded.characters as Map<string, Character>
  const npcs = loaded.npcs as Map<string, Npc>
  const sessions = loaded.sessions as Map<string, Session>
  const secrets = loaded.secrets as Map<string, Secret>
  const locations = loaded.locations as Map<string, Location>
  const maps = loaded.maps as Map<string, PackMap>
  const quests = loaded.quests as Map<string, Quest>

  for (const [id, character] of characters) {
    if (character.portrait && !(await source.exists(character.portrait))) {
      issues.push({ level: 'error', path: `characters/${id}.json`, message: `portrait apunta a ${character.portrait}, que no existe en el pack` })
    }
  }

  for (const [id, npc] of npcs) {
    if (npc.portrait && !(await source.exists(npc.portrait))) {
      issues.push({ level: 'error', path: `npcs/${id}.json`, message: `portrait apunta a ${npc.portrait}, que no existe en el pack` })
    }
  }

  // La portada y la galeria del catalogo viven en `art/`.
  for (const file of manifest.catalog ? [manifest.catalog.cover, ...manifest.catalog.gallery] : []) {
    if (!(await source.exists(`art/${file}`))) {
      issues.push({ level: 'error', path: 'pack.json', message: `catalog apunta a art/${file}, que no existe en el pack` })
    }
  }

  for (const [id, map] of maps) {
    if (!(await source.exists(map.image))) {
      issues.push({ level: 'error', path: `maps/${id}.json`, message: `image apunta a ${map.image}, que no existe en el pack` })
    }
  }

  for (const [id, location] of locations) {
    // Un lugar puesto en un mapa que el pack no declara no se puede pintar.
    if (location.map && !maps.has(location.map)) {
      issues.push({ level: 'error', path: `locations/${id}.json`, message: `map apunta a ${location.map}, que no esta en el pack` })
    }
    // Dos lugares en el mismo punto se taparian; aviso, no error.
    for (const [otherId, other] of locations) {
      if (otherId <= id || other.map !== location.map || location.map === undefined) continue
      if (Math.abs((other.x ?? 0) - (location.x ?? 0)) < 2 && Math.abs((other.y ?? 0) - (location.y ?? 0)) < 2) {
        issues.push({ level: 'warning', path: `locations/${id}.json`, message: `cae casi encima de ${otherId} en el mapa ${location.map}` })
      }
    }
  }

  for (const [id, session] of sessions) {
    const path = `sessions/${id}.json`
    for (const member of session.party) {
      if (!characters.has(member.character)) {
        issues.push({ level: 'error', path, message: `party referencia al personaje ${member.character}, que no esta en el pack` })
      }
    }
    for (const characterId of session.availableCharacters ?? []) {
      if (!characters.has(characterId)) {
        issues.push({ level: 'error', path, message: `availableCharacters referencia a ${characterId}, que no esta en el pack` })
      }
    }
    if (session.startLocation !== undefined && !locations.has(session.startLocation)) {
      issues.push({ level: 'error', path, message: `startLocation apunta a ${session.startLocation}, que no esta en el pack` })
    }
    // Los finales de un arco (docs/26, H4): ids unicos, un solo final por omision y `next` que exista.
    const endings = session.arc?.endings ?? []
    const ids = new Set<string>()
    for (const ending of endings) {
      if (ids.has(ending.id)) issues.push({ level: 'error', path, message: `el final ${ending.id} esta repetido` })
      ids.add(ending.id)
      if (ending.next !== undefined && !sessions.has(ending.next)) {
        issues.push({ level: 'error', path, message: `el final ${ending.id} sigue en la sesion ${ending.next}, que no esta en el pack` })
      }
    }
    if (endings.length > 0 && endings.filter((e) => e.default).length !== 1) {
      issues.push({ level: 'error', path, message: 'los finales necesitan exactamente uno con default: true' })
    }
    const min = session.arc?.turns.min
    if (min !== undefined && session.arc && min > session.arc.turns.target) {
      issues.push({ level: 'error', path, message: `turns.min (${min}) pasa del presupuesto (${session.arc.turns.target})` })
    }
  }

  for (const [id, secret] of secrets) {
    const path = `secrets/${id}.json`
    // Un personaje es siempre del pack; NPC, lugar o mision pueden vivir solo en la cronica.
    for (const ref of [secret.about, secret.revealedBy]) {
      if (!ref) continue
      const kind = refKind(ref)
      const target = refId(ref)
      if (kind === 'character' && !characters.has(target)) {
        issues.push({ level: 'error', path, message: `${ref} no existe en el pack` })
      } else if ((kind === 'npc' && !npcs.has(target)) || (kind === 'location' && !locations.has(target)) || (kind === 'quest' && !quests.has(target))) {
        issues.push({ level: 'warning', path, message: `${ref} no esta en el pack (el secreto igual aplica; la entidad vive en la cronica)` })
      }
    }
  }

  if (hasErrors(issues)) {
    return { pack: null, issues }
  }

  return {
    pack: {
      manifest,
      characters,
      npcs,
      locations,
      maps,
      quests,
      sessions,
      secrets,
      language: language ?? manifest.language,
    },
    issues,
  }
}

async function loadEntity(source: FileSource, path: string, schema: ZodType, issues: Issue[], language: string | null): Promise<unknown> {
  let raw: unknown
  try {
    raw = await readTranslated(source, path, language, issues)
  } catch (error) {
    issues.push({ level: 'error', path, message: (error as Error).message })
    return null
  }

  const result = schema.safeParse(raw)
  if (!result.success) {
    // Si lo rompio la traduccion, el aviso señala el archivo traducido.
    const translated = language !== null && (await source.exists(`i18n/${language}/${path}`))
    issues.push(...zodIssues(result.error, translated ? `i18n/${language}/${path}` : path))
    return null
  }

  return result.data
}

/** El archivo del pack con su traduccion encima, si la hay. */
async function readTranslated(source: FileSource, path: string, language: string | null, issues: Issue[]): Promise<unknown> {
  const raw = await readJson(source, path)
  if (!language) return raw
  const overlayPath = `i18n/${language}/${path}`
  if (!(await source.exists(overlayPath))) return raw
  let patch: unknown
  try {
    patch = await readJson(source, overlayPath)
  } catch (error) {
    issues.push({ level: 'warning', path: overlayPath, message: `${(error as Error).message}; se usa el original` })
    return raw
  }
  return applyOverlay(raw, patch, overlayPath, issues)
}
