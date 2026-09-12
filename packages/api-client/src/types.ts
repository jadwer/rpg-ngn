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
  /** `settings.premise`: la premisa que el anfitrion escribio y el DM usa como punto de partida. */
  premise: string | null
  /** Viene con `include=campaign`; null si la mesa no tiene campaña. */
  campaignId: string | null
  /** Viene con `include=members.user`. */
  members: TableMember[]
}

export interface NewTable {
  name: string
  packId: string
  packVersion: string
  ruleset: string
  /** Se guarda en `settings.premise` si viene con texto. */
  premise?: string | null | undefined
  /** Otros ajustes de la mesa (por ejemplo `provider` para el DM scripted con guion). */
  settings?: Record<string, unknown> | undefined
}

/** Lo que devuelve `POST tables/{t}/members`, sea invitacion o el personaje del propio dueño. */
export interface TableMemberRecord {
  id: number
  tableId: number
  userId: number
  role: MemberRole
  characterId: string | null
}

export type FriendshipStatus = 'pending' | 'accepted' | string

export interface Friendship {
  id: string
  status: FriendshipStatus
  /** Quien pidio la amistad. */
  user: AuthUser
  /** Quien la recibe y la acepta. */
  friend: AuthUser
  acceptedAt: string | null
}

export interface FriendshipRecord {
  id: number
  userId: number
  friendId: number
  status: FriendshipStatus
  /** false si la amistad ya existia (la API devolvio 200). */
  created: boolean
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

export interface TableViewer {
  memberId: number
  role: MemberRole
  characterId: string | null
}

export interface TableState {
  campaign: { id: number; headSeq: number }
  /** Quien consulta, para no cruzar `members.user` en el cliente. */
  viewer: TableViewer
  session: { id: number; code: string; status: string } | null
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
