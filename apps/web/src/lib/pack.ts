import { loadPack, memorySource, type LoadedPack, type Session } from '@rpg-ngn/content'
import { fantasyD20Lite } from '@rpg-ngn/rules'
import { PACK_ID, PACK_VERSION, packBinaries, packFiles } from '../generated/pilot-pack'

/**
 * El pack empaquetado en la web (nombres, retratos, sesiones). El estado vivo
 * de la campaña llega de la API; aqui no se reduce nada. Sin React para
 * poder probarlo con vitest en node.
 */

let cached: Promise<LoadedPack> | null = null

export function loadBundledPack(): Promise<LoadedPack> {
  if (!cached) {
    const binaries = Object.fromEntries(packBinaries.map((path) => [path, '']))
    cached = loadPack(memorySource({ ...packFiles, ...binaries })).then(({ pack, issues }) => {
      if (!pack) throw new Error(`el pack ${PACK_ID} no carga: ${issues.map((i) => `${i.path}: ${i.message}`).join('; ')}`)
      return pack
    })
  }
  return cached
}

/** URL publica de un retrato del pack (`portraits/zahira.jpg`), o null si no hay. */
export function portraitUrl(path: string | null | undefined): string | null {
  if (!path) return null
  return `/packs/${PACK_ID}/${path}`
}

/** Sesiones del pack en el orden del manifiesto. */
export function sessionList(pack: LoadedPack): Session[] {
  return pack.manifest.sessions.map((id) => pack.sessions.get(id)).filter((s): s is Session => !!s)
}

export function characterName(pack: LoadedPack | null, id: string | null | undefined): string | null {
  if (!id) return null
  return pack?.characters.get(id)?.name ?? id
}

export const RULESET_ID = `${fantasyD20Lite.id}@${fantasyD20Lite.version}`
export const abilityModifier = (score: number): number => fantasyD20Lite.abilityModifier(score)

/** Packs que la web sabe empaquetar hoy; el selector de la mesa nueva los ofrece. */
export const PACK_OPTIONS = [{ id: PACK_ID, version: PACK_VERSION, ruleset: RULESET_ID, label: `${PACK_ID}@${PACK_VERSION}` }] as const

export { PACK_ID, PACK_VERSION }
