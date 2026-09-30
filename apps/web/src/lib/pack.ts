import { loadPack, memorySource, type LoadedPack } from '@rpg-ngn/content'
import { fantasyD20Lite } from '@rpg-ngn/rules'
import { PACK_ID, PACK_VERSION, packBinaries, packFiles } from '../generated/pilot-pack'

/**
 * El pack empaquetado en la web (nombres, retratos, sesiones). El estado vivo
 * de la campaña llega de la API; aqui no se reduce nada. Las lecturas del
 * pack (personajes, sesiones, nombres) estan en `@rpg-ngn/ui-logic`. Sin
 * React para poder probarlo con vitest en node.
 */

const cached = new Map<string, Promise<LoadedPack>>()

/** El pack en un idioma (i18n): con `en` salen los textos de `i18n/en/`, lo no traducido queda en español. */
export function loadBundledPack(language = 'es'): Promise<LoadedPack> {
  let pending = cached.get(language)
  if (!pending) {
    const binaries = Object.fromEntries(packBinaries.map((path) => [path, '']))
    pending = loadPack(memorySource({ ...packFiles, ...binaries }), { language }).then(({ pack, issues }) => {
      if (!pack) throw new Error(`el pack ${PACK_ID} no carga: ${issues.map((i) => `${i.path}: ${i.message}`).join('; ')}`)
      return pack
    })
    cached.set(language, pending)
  }
  return pending
}

/** URL publica de un retrato del pack (`portraits/zahira.webp`), o null si no hay. */
export function portraitUrl(path: string | null | undefined): string | null {
  if (!path) return null
  return `/packs/${PACK_ID}/${path}`
}

export const RULESET_ID = `${fantasyD20Lite.id}@${fantasyD20Lite.version}`
export const abilityModifier = (score: number): number => fantasyD20Lite.abilityModifier(score)

/** Packs que la web sabe empaquetar hoy; el selector de la mesa nueva los ofrece. */
export const PACK_OPTIONS = [{ id: PACK_ID, version: PACK_VERSION, ruleset: RULESET_ID, label: `${PACK_ID}@${PACK_VERSION}` }] as const

export { PACK_ID, PACK_VERSION }
