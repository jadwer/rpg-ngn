import type { WorldState } from '@rpg-ngn/core'

/**
 * Estado completo de una campaña: el mundo (proyeccion de effects), el
 * conocimiento por personaje (proyeccion de discovery y testigos) y el
 * estado narrativo (sesiones, hilos, cliffhanger). Todo es consecuencia del
 * log; nada se escribe directo (docs/08).
 */

export interface KnownFact {
  confidence: 'known' | 'uncertain' | 'conflicting' | 'unknown'
  method: string
  /** Evento discovery que lo otorgo. */
  event: string
  seq: number
}

export interface PlayerKnowledge {
  characterId: string
  facts: Record<string, KnownFact>
  /** Eventos que el personaje presencio (visibility.witnesses). */
  witnessed: string[]
}

export interface SessionRecord {
  id: string
  status: 'open' | 'closed'
  party: string[]
  startedSeq: number
  closedSeq: number | null
  cliffhanger: string | null
}

export interface NarrativeEntry {
  seq: number
  event: string
  type: string
  text: string
}

export interface NarrativeState {
  currentSession: string | null
  lastCliffhanger: string | null
  /** world_event, narration, scene_* en orden: la cronica publica. */
  log: NarrativeEntry[]
  /** Correcciones aplicadas, por si hay que auditar que cambio. */
  corrections: Array<{ seq: number; event: string; corrects: string; reason: string }>
}

export interface CampaignMeta {
  packId: string
  packVersion: string
  ruleset: string
  headSeq: number
  headEvent: string | null
  sessions: Record<string, SessionRecord>
}

export interface CampaignState {
  meta: CampaignMeta
  world: WorldState
  knowledge: Record<string, PlayerKnowledge>
  narrative: NarrativeState
}
