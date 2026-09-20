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

export interface RevealedSecret {
  /** Evento que lo revelo. */
  event: string
  seq: number
  how: 'revealWhen' | 'secret_revealed'
}

export interface PlayerKnowledge {
  characterId: string
  facts: Record<string, KnownFact>
  /** Eventos que el personaje presencio (visibility.witnesses). */
  witnessed: string[]
  /**
   * Secretos del pack revelados a este personaje (knowledge.ts). Solo
   * aparece cuando hay alguno: los snapshots anteriores a la capa dm no
   * cambian de forma.
   */
  secrets?: Record<string, RevealedSecret>
  /**
   * Rumores que ha oido, en orden. NO son conocimiento: un rumor puede ser
   * falso, y por eso no entra en `facts`. Opcional para que los snapshots
   * anteriores no cambien de forma.
   */
  rumors?: HeardRumor[]
}

export interface HeardRumor {
  text: string
  /** De quien vino, si se sabe. */
  from?: string
  /** El DM o el pack saben que es falso; el jugador no lo ve. */
  false?: boolean
  event: string
  seq: number
}

/**
 * Progreso de una mision del pack. La definicion (titulo, objetivos) vive en
 * el pack; aqui solo lo que ha pasado con ella en ESTA campaña, que es lo
 * que el schema de quest.ts daba por hecho desde el principio.
 */
export interface QuestProgress {
  id: string
  status: 'active' | 'done' | 'failed'
  /** Ids de objetivos cumplidos, en el orden en que se cumplieron. */
  completed: string[]
  /** Ultima nota del DM sobre esta mision. */
  note?: string
  seq: number
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
  /**
   * Progreso de las misiones del pack, por id. Opcional para que los
   * snapshots anteriores a esto sigan siendo validos: una campaña sin
   * misiones tocadas no lo trae.
   */
  quests?: Record<string, QuestProgress>
}
