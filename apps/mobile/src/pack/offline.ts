import { reduce, type CampaignState } from '@rpg-ngn/campaign'
import { loadPack, memorySource, parseEventLog, type CampaignEvent, type Issue, type LoadedPack, type Session } from '@rpg-ngn/content'
import { fantasyD20Lite } from '@rpg-ngn/rules'
import { eventLog, PACK_ID, packBinaries, packFiles } from '../generated/pilot-pack'

/**
 * Campaña offline: el pack empaquetado en la app mas su log, reducidos en el
 * dispositivo con el ruleset del pack (docs/11, D8). El log empaquetado no
 * lleva capa dm, asi que reducirlo aqui no expone secretos. Sin React ni
 * Expo para poder probarlo con vitest en node.
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

export async function loadOfflineCampaign(): Promise<OfflineCampaign> {
  const { pack, issues } = await loadPack(bundledSource())
  if (!pack) {
    throw new Error(`el pack ${PACK_ID} no carga: ${issues.map((i) => `${i.path}: ${i.message}`).join('; ')}`)
  }

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

/** Sesiones del pack en el orden del manifiesto. */
export function sessionList(pack: LoadedPack): Session[] {
  return pack.manifest.sessions.map((id) => pack.sessions.get(id)).filter((s): s is Session => !!s)
}

export const RULESET_ID = fantasyD20Lite.id
export const abilityModifier = (score: number): number => fantasyD20Lite.abilityModifier(score)
