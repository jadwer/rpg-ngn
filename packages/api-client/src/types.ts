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

export type MemberRole = 'host' | 'player'

export interface TableMember {
  id: string
  role: MemberRole
  characterId: string | null
  userId: string | null
  userName: string | null
  /** false cuando tuvo que irse: no se le espera para cerrar el turno y el DM lo aparta de la escena. */
  present?: boolean
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
  /** Ajustes crudos de la mesa (premisa, proveedor del DM); `providerChoice` y `withProvider` los interpretan. */
  settings: Record<string, unknown>
  /** Viene con `include=campaign`; null si la mesa no tiene campaña. */
  campaignId: string | null
  /** Eventos de la campaña. Cero significa que la mesa nunca se jugo. */
  headSeq: number
  /** Viene con `include=members.user`. */
  members: TableMember[]
}

/** El enlace vivo de una mesa. `token` solo viene al crearlo: se guarda hasheado. */
export interface TableInvite {
  token?: string
  maxUses: number
  uses: number
  seatsLeft: number
  expiresAt?: string
}

/** El enlace a la cronica de una mesa y quien falta por aceptar (docs/24, seccion 4). */
export interface ChronicleShare {
  token: string
  anonymize: boolean
  /** Todos los miembros actuales aceptaron y no se retiro: el enlace se ve. */
  public: boolean
  /** Quien mira ya acepto. */
  mine: boolean
  members: Array<{ memberId: string; name: string | null; consented: boolean }>
}

/** Un bloque de la cronica publica: solo lo que se lee, nunca avisos internos. */
export type ChronicleBlock =
  | { type: 'narration'; text: string }
  | { type: 'dialogue'; speaker: string; text: string }
  | { type: 'roll'; text: string; actor: string; die: string; result: number }

/** La cronica publica de una mesa, tal como la ve quien abre el enlace. */
export interface Chronicle {
  title: string
  pack: { id: string; version: string; name: string | null }
  /** Null si la mesa pidio no enseñar quien jugo. */
  players: Array<{ name: string | null; character: string | null }> | null
  sessions: Array<{
    code: string
    turns: Array<{ number: number; actions: Array<{ character: string; text: string }>; blocks: ChronicleBlock[] }>
  }>
}

/** A que mesa invita un enlace, antes de entrar (y sin tener cuenta). */
export interface InvitePreview {
  tableId: string
  tableName: string
  packId: string
  packVersion: string
  hostName: string | null
  seatsLeft: number
  /** Ya es miembro: el enlace no gastara plaza. */
  alreadyMember: boolean
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
  /** Desde cuando no falta nadie (arranque de la cuenta atras); null mientras falte alguien o el turno no este abierto. */
  completedAt?: string | null
  /** Alguien cancelo la cuenta atras: el turno se cierra a mano. */
  held?: boolean
  heldBy?: Presence | null
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
  /** Personalidad que este jugador escribio para su personaje; solo la ve el y el DM. */
  persona?: string | null
}

export interface TableState {
  campaign: { id: number; headSeq: number }
  /** Quien consulta, para no cruzar `members.user` en el cliente. */
  viewer: TableViewer
  session: { id: number; code: string; status: string } | null
  turn: TurnView | null
  blocks: BlockEnvelope[]
  /** Quien lee en voz alta ahora mismo (anuncio que caduca solo). */
  narrators: Narrator[]
  /** Quien esta tecleando su respuesta (anuncio que caduca solo). */
  typing: Presence[]
  /** Quien tuvo que irse (`present = false`), para que lo vean todos sin recargar la mesa. */
  away: Presence[]
  /** Si a quien consulta le falta tirar la Fortuna de esta sesion (la tira el jugador, el numero lo saca la API). */
  fortune: { pending: boolean }
  /** Turnos de cupo o creditos que le quedan a la mesa; null si no consume (clave propia). */
  quota?: { remainingTurns: number } | null
  /** Para el siguiente `after`; si no vinieron bloques, repite el que se pidio. */
  lastBlockId: number
}

/** Un miembro señalado por la API en un aviso (narra, escribe, puso el turno en espera). */
export interface Presence {
  memberId: number
  name: string | null
  characterId: string | null
}

export type Narrator = Presence

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
