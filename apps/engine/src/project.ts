import { diffSnapshot, reduce, type CampaignState, type Snapshot } from '@rpg-ngn/campaign'
import { formatEventLog, parseEventLog, type LoadedPack } from '@rpg-ngn/content'
import type { ProjectRequest, ProjectResponse, ValidateEventsRequest, ValidateEventsResponse } from '@rpg-ngn/engine-contract'
import { resolveRuleset } from '@rpg-ngn/rules'
import { projectionsOf } from './state.js'

export function validateEvents(request: ValidateEventsRequest, pack: LoadedPack | undefined): ValidateEventsResponse {
  const parsed = parseEventLog(formatEventLog(request.events), { pack })
  const ok = !parsed.issues.some((issue) => issue.level === 'error')
  return { ok, events: parsed.events, issues: parsed.issues }
}

/**
 * Reproyecta una campaña completa. Con `compareWith`, reproyecta hasta ese
 * seq y compara con el snapshot que manda la plataforma: si difieren, gana
 * el snapshot (BA2) y aqui solo se nombra la divergencia.
 */
export function project(request: ProjectRequest, pack: LoadedPack): ProjectResponse {
  const ruleset = resolveRuleset(request.ruleset)
  const parsed = parseEventLog(formatEventLog(request.events), { pack })
  const errors = parsed.issues.filter((issue) => issue.level === 'error')
  if (errors.length > 0) {
    throw new Error(`log invalido: ${errors.map((i) => `${i.path}: ${i.message}`).join('; ')}`)
  }

  const state = reduce(parsed.events, { pack, ruleset })
  let divergence: ProjectResponse['divergence'] = null

  if (request.compareWith) {
    const upTo = parsed.events.filter((event) => event.seq <= request.compareWith!.seq)
    const replay = reduce(upTo, { pack, ruleset })
    divergence = diffSnapshot(asSnapshot(request.compareWith.state as CampaignState, replay), asSnapshot(replay, replay))
  }

  return { seq: state.meta.headSeq, state, projections: projectionsOf(state), divergence }
}

function asSnapshot(state: CampaignState, reference: CampaignState): Snapshot {
  return {
    packId: reference.meta.packId,
    packVersion: reference.meta.packVersion,
    ruleset: reference.meta.ruleset,
    seq: reference.meta.headSeq,
    sessionId: reference.narrative.currentSession ?? Object.keys(reference.meta.sessions).at(-1) ?? '',
    state,
  }
}
