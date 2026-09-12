import type { CampaignEvent, LoadedPack, Secret } from '@rpg-ngn/content'
import { refId, refKind } from '@rpg-ngn/content'
import { emptyWorld, updateCharacter, type WorldState } from '@rpg-ngn/core'
import { rulesetRef, type Ruleset } from '@rpg-ngn/rules'
import { revealsOf } from './knowledge.js'
import type { CampaignState, PlayerKnowledge } from './state.js'

/**
 * El reductor. `reduce(events, {pack, ruleset})` es una funcion pura: el
 * mismo log, el mismo pack y el mismo ruleset producen siempre el mismo
 * estado. El ruleset es parametro y no import (BA2). Los secretos del pack
 * entran como parametro por la misma razon: la proyeccion de conocimiento
 * depende de sus condiciones de revelacion.
 */

export interface ReduceOptions {
  pack: LoadedPack
  ruleset: Ruleset
}

export function initialState(options: ReduceOptions): CampaignState {
  const world: WorldState = emptyWorld()
  const knowledge: Record<string, PlayerKnowledge> = {}

  for (const [id, character] of options.pack.characters) {
    world.characters[id] = options.ruleset.initialCharacterState(character)
    knowledge[id] = { characterId: id, facts: {}, witnessed: [] }
  }

  return {
    meta: {
      packId: options.pack.manifest.id,
      packVersion: options.pack.manifest.version,
      ruleset: rulesetRef(options.ruleset),
      headSeq: 0,
      headEvent: null,
      sessions: {},
    },
    world,
    knowledge,
    narrative: { currentSession: null, lastCliffhanger: null, log: [], corrections: [] },
  }
}

export function reduce(events: readonly CampaignEvent[], options: ReduceOptions): CampaignState {
  const secrets = [...options.pack.secrets.values()]
  return events.reduce((state, event) => applyEvent(state, event, options.ruleset, secrets), initialState(options))
}

export function applyEvent(state: CampaignState, event: CampaignEvent, ruleset: Ruleset, secrets: readonly Secret[] = []): CampaignState {
  if (event.seq !== state.meta.headSeq + 1) {
    throw new Error(`${event.id}: seq ${event.seq} no sigue a ${state.meta.headSeq}`)
  }

  let next: CampaignState = {
    ...state,
    meta: { ...state.meta, headSeq: event.seq, headEvent: event.id },
  }

  if (event.worldTime) {
    next = { ...next, world: { ...next.world, worldTime: event.worldTime } }
  }

  next = applyByType(next, event, ruleset)
  next = applyEffects(next, event, ruleset)
  next = applyWitnesses(next, event)
  next = applySecrets(next, event, secrets)

  return next
}

function applySecrets(state: CampaignState, event: CampaignEvent, secrets: readonly Secret[]): CampaignState {
  const reveals = revealsOf(event, secrets, state)
  if (reveals.length === 0) return state
  const knowledge = { ...state.knowledge }
  for (const reveal of reveals) {
    for (const id of reveal.to) {
      const current = knowledge[id] ?? { characterId: id, facts: {}, witnessed: [] }
      if (current.secrets?.[reveal.secretId]) continue
      knowledge[id] = { ...current, secrets: { ...current.secrets, [reveal.secretId]: { event: event.id, seq: event.seq, how: reveal.how } } }
    }
  }
  return { ...state, knowledge }
}

function applyByType(state: CampaignState, event: CampaignEvent, ruleset: Ruleset): CampaignState {
  switch (event.type) {
    case 'session_started': {
      const record = {
        id: event.sessionId,
        status: 'open' as const,
        party: event.payload.party.map(refId),
        startedSeq: event.seq,
        closedSeq: null,
        cliffhanger: null,
      }
      return {
        ...state,
        meta: { ...state.meta, sessions: { ...state.meta.sessions, [event.sessionId]: record } },
        narrative: { ...state.narrative, currentSession: event.sessionId },
      }
    }

    case 'session_closed': {
      const record = state.meta.sessions[event.sessionId]
      if (!record) {
        throw new Error(`${event.id}: cierra la sesion ${event.sessionId}, que nunca empezo`)
      }
      const cliffhanger = event.payload.cliffhanger ?? null
      return {
        ...state,
        meta: {
          ...state.meta,
          sessions: { ...state.meta.sessions, [event.sessionId]: { ...record, status: 'closed', closedSeq: event.seq, cliffhanger } },
        },
        narrative: { ...state.narrative, currentSession: null, lastCliffhanger: cliffhanger ?? state.narrative.lastCliffhanger },
      }
    }

    case 'roll': {
      if (event.resolved.kind !== 'fortune') return state
      const who = characterOf(event.actor, event.id)
      const fortune = ruleset.fortune(event.resolved.result)
      return { ...state, world: updateCharacter(state.world, who, (c) => ({ ...c, fortune })) }
    }

    case 'discovery': {
      const knowledge = { ...state.knowledge }
      for (const target of event.targets) {
        if (refKind(target) !== 'character') continue
        const id = refId(target)
        const current = knowledge[id] ?? { characterId: id, facts: {}, witnessed: [] }
        knowledge[id] = {
          ...current,
          facts: {
            ...current.facts,
            [event.payload.fact]: { confidence: event.payload.confidence, method: event.payload.method, event: event.id, seq: event.seq },
          },
        }
      }
      return { ...state, knowledge }
    }

    case 'world_event':
      return appendLog(state, event, event.payload.note)

    case 'correction':
      return {
        ...state,
        narrative: {
          ...state.narrative,
          corrections: [...state.narrative.corrections, { seq: event.seq, event: event.id, corrects: event.payload.corrects, reason: event.payload.reason }],
        },
      }

    case 'narration':
    case 'scene_started':
    case 'scene_closed': {
      const text = typeof event.payload?.['text'] === 'string' ? event.payload['text'] : ''
      return appendLog(state, event, text)
    }

    default:
      return state
  }
}

function applyEffects(state: CampaignState, event: CampaignEvent, ruleset: Ruleset): CampaignState {
  if (!event.effects || event.effects.length === 0) return state
  let world = state.world
  for (const effect of event.effects) {
    world = ruleset.applyEffect(world, effect, event)
  }
  return { ...state, world }
}

function applyWitnesses(state: CampaignState, event: CampaignEvent): CampaignState {
  const witnesses = event.visibility?.witnesses
  if (!witnesses || witnesses.length === 0) return state
  const knowledge = { ...state.knowledge }
  for (const witness of witnesses) {
    if (refKind(witness) !== 'character') continue
    const id = refId(witness)
    const current = knowledge[id] ?? { characterId: id, facts: {}, witnessed: [] }
    knowledge[id] = { ...current, witnessed: [...current.witnessed, event.id] }
  }
  return { ...state, knowledge }
}

function appendLog(state: CampaignState, event: CampaignEvent, text: string): CampaignState {
  return {
    ...state,
    narrative: { ...state.narrative, log: [...state.narrative.log, { seq: event.seq, event: event.id, type: event.type, text }] },
  }
}

function characterOf(ref: string | undefined, eventId: string): string {
  if (!ref || refKind(ref) !== 'character') {
    throw new Error(`${eventId}: se esperaba un actor character:*, llego ${String(ref)}`)
  }
  return refId(ref)
}
