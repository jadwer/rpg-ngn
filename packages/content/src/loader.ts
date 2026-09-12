import type { ZodType } from 'zod'
import { Character } from './character.js'
import { refId, refKind } from './common.js'
import { hasErrors, zodIssues, type Issue } from './issues.js'
import { Location } from './location.js'
import { Npc } from './npc.js'
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
  quests: Map<string, Quest>
  sessions: Map<string, Session>
  /** Capa `dm`: solo la lee el motor y el DM; nunca una proyeccion de jugador. */
  secrets: Map<string, Secret>
}

export interface LoadPackResult {
  pack: LoadedPack | null
  issues: Issue[]
}

const collections = [
  { key: 'characters', dir: 'characters', schema: Character },
  { key: 'npcs', dir: 'npcs', schema: Npc },
  { key: 'locations', dir: 'locations', schema: Location },
  { key: 'quests', dir: 'quests', schema: Quest },
  { key: 'sessions', dir: 'sessions', schema: Session },
  { key: 'secrets', dir: 'secrets', schema: Secret },
] as const

type CollectionKey = (typeof collections)[number]['key']

export async function loadPack(source: FileSource): Promise<LoadPackResult> {
  const issues: Issue[] = []

  let rawManifest: unknown
  try {
    rawManifest = await readJson(source, 'pack.json')
  } catch (error) {
    return { pack: null, issues: [{ level: 'error', path: 'pack.json', message: (error as Error).message }] }
  }

  const manifestResult = PackManifest.safeParse(rawManifest)
  if (!manifestResult.success) {
    return { pack: null, issues: zodIssues(manifestResult.error, 'pack.json') }
  }
  const manifest = manifestResult.data

  const loaded: Record<CollectionKey, Map<string, unknown>> = {
    characters: new Map(),
    npcs: new Map(),
    locations: new Map(),
    quests: new Map(),
    sessions: new Map(),
    secrets: new Map(),
  }

  for (const collection of collections) {
    const ids = manifest[collection.key]
    for (const id of ids) {
      const path = `${collection.dir}/${id}.json`
      const entity = (await loadEntity(source, path, collection.schema, issues)) as { id: string } | null
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
      quests,
      sessions,
      secrets,
    },
    issues,
  }
}

async function loadEntity(source: FileSource, path: string, schema: ZodType, issues: Issue[]): Promise<unknown> {
  let raw: unknown
  try {
    raw = await readJson(source, path)
  } catch (error) {
    issues.push({ level: 'error', path, message: (error as Error).message })
    return null
  }

  const result = schema.safeParse(raw)
  if (!result.success) {
    issues.push(...zodIssues(result.error, path))
    return null
  }

  return result.data
}
