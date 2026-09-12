import { reduce, type CampaignState } from '@rpg-ngn/campaign'
import { loadPack, memorySource, parseEventLog, type CampaignEvent, type Issue, type LoadedPack } from '@rpg-ngn/content'
import { fantasyD20Lite } from '@rpg-ngn/rules'
import { eventLog, PACK_ID, PACK_VERSION, packBinaries, packFiles } from '../generated/pilot-pack'

/**
 * Campaña offline: el pack empaquetado en la app mas su log, reducidos en el
 * dispositivo con el ruleset del pack (docs/11, D8). El log empaquetado no
 * lleva capa dm, asi que reducirlo aqui no expone secretos. Las lecturas del
 * pack (personajes, sesiones, nombres) estan en `@rpg-ngn/ui-logic`. Sin
 * React ni Expo para poder probarlo con vitest en node.
 */

export interface OfflineCampaign {
  pack: LoadedPack
  events: CampaignEvent[]
  state: CampaignState
  issues: Issue[]
}

const RULESETS = { [fantasyD20Lite.id]: fantasyD20Lite } as const

export function bundledSource() {
  const binaries = Object.fromEntries(packBinaries.map((path) => [path, '']))
  return memorySource({ ...packFiles, ...binaries })
}

/** Solo el pack empaquetado (nombres, retratos, sesiones); el modo online lo usa sin reducir nada. */
export async function loadBundledPack(): Promise<{ pack: LoadedPack; issues: Issue[] }> {
  const { pack, issues } = await loadPack(bundledSource())
  if (!pack) {
    throw new Error(`el pack ${PACK_ID} no carga: ${issues.map((i) => `${i.path}: ${i.message}`).join('; ')}`)
  }
  return { pack, issues }
}

export async function loadOfflineCampaign(): Promise<OfflineCampaign> {
  const { pack, issues } = await loadBundledPack()

  const ruleset = RULESETS[pack.manifest.system]
  if (!ruleset) {
    throw new Error(`el pack pide el ruleset ${pack.manifest.system}, que la app no incluye`)
  }

  const parsed = parseEventLog(eventLog, { pack, path: `campaigns/${PACK_ID}/events.jsonl` })
  const errors = parsed.issues.filter((i) => i.level === 'error')
  if (errors.length > 0) {
    throw new Error(`el log no valida: ${errors.map((i) => `${i.path}: ${i.message}`).join('; ')}`)
  }

  return {
    pack,
    events: parsed.events,
    state: reduce(parsed.events, { pack, ruleset }),
    issues: [...issues, ...parsed.issues],
  }
}

export { PACK_ID, PACK_VERSION }
export const RULESET_ID = fantasyD20Lite.id
export const abilityModifier = (score: number): number => fantasyD20Lite.abilityModifier(score)

/** El pack que la app sabe empaquetar hoy, con el ruleset versionado como lo espera la API; la mesa nueva lo usa tal cual. */
export const PACK_OPTION = { id: PACK_ID, version: PACK_VERSION, ruleset: `${fantasyD20Lite.id}@${fantasyD20Lite.version}` } as const
