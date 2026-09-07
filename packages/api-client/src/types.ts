import type { CharacterState } from '@rpg-ngn/core'
import type { TurnBlock as EngineTurnBlock } from '@rpg-ngn/engine-contract'

/** Formas planas de lo que devuelve rpg-ngn-api. Los ids JSON:API son strings; los de los comandos del juego, numeros. */

export interface AuthUser {
  id: string
  name: string
  email: string
}

export interface LoginResult {
  token: string
  expiresAt: string | null
  user: AuthUser
}

export interface Profile extends AuthUser {
  role: string | null
}

export type MemberRole = 'dm' | 'player'

export interface TableMember {
  id: string
  role: MemberRole
  characterId: string | null
  userId: string | null
  userName: string | null
}

export interface TableSummary {
  id: string
  name: string
  packId: string
  packVersion: string
  ruleset: string
  status: string
  oneShot: boolean
  /** Viene con `include=campaign`; null si la mesa no tiene campaña. */
  campaignId: string | null
  /** Viene con `include=members.user`. */
  members: TableMember[]
}

export type TurnStatus = 'open' | 'closing' | 'resolving' | 'resolved'

export interface TurnView {
  id: number
  session: string
  number: number
  status: TurnStatus
  /** Personajes interpelados; cierran el turno. */
  required: string[]
  /** Personajes que ya respondieron (a tiempo). */
  responded: string[]
  /** Mensaje del engine si el turno se reabrio por error. */
  error: string | null
  openedAt: string | null
}

export interface BlockEnvelope {
  id: number
  turnId: number
  seq: number
  block: EngineTurnBlock
}

export interface TableState {
  campaign: { id: number; headSeq: number }
  session: { code: string; status: string } | null
  turn: TurnView | null
  blocks: BlockEnvelope[]
  /** Para el siguiente `after`; si no vinieron bloques, repite el que se pidio. */
  lastBlockId: number
}

export interface ResponseReceipt {
  id: number
  turnId: number
  characterId: string
  late: boolean
  submittedAt: string
  /** false si la clave de idempotencia ya existia (la API devolvio 200). */
  created: boolean
}

export interface SessionSummary {
  id: string
  code: string
  status: string
  openedSeq: number | null
  closedSeq: number | null
}

export interface SessionClosed {
  session: string
  status: string
  snapshotSeq: number
}

export interface Projection<T> {
  kind: string
  seq: number
  headSeq: number
  projection: T
}

export interface PlayerProjection {
  characterId: string
  character: CharacterState
  session: unknown
  knowledge: unknown
}

export interface WorldProjection {
  worldTime: string | null
  characters: Record<string, CharacterState>
  npcs: Record<string, unknown>
}
