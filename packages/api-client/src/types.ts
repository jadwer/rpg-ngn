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
  /** Correo confirmado: hace falta para crear mesas (ser anfitrion). */
  emailVerified: boolean
}

export type MemberRole = 'host' | 'player'

export interface TableMember {
  id: string
  role: MemberRole
  characterId: string | null
  userId: string | null
  userName: string | null
  /** false cuando tuvo que irse: no se le espera para cerrar el turno y el GM lo aparta de la escena. */
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
  /** `settings.premise`: la premisa que el anfitrion escribio y el GM usa como punto de partida. */
  premise: string | null
  /** Ajustes crudos de la mesa (premisa, proveedor del GM); `providerChoice` y `withProvider` los interpretan. */
  settings: Record<string, unknown>
  /** Viene con `include=campaign`; null si la mesa no tiene campaña. */
  campaignId: string | null
  /** Eventos de la campaña. Cero significa que la mesa nunca se jugo. */
  headSeq: number
  /** Hay una sesion abierta: se esta jugando. Sin ella, la mesa esta en pausa entre sesiones. */
  sessionOpen?: boolean
  /** Ultimo movimiento de la mesa o de su campaña (ISO), para ordenar por actividad. */
  lastActivityAt?: string | null
  /** Tope real de ilustraciones por sesion (config de la API); null si la API no lo manda. */
  imagesPerSession?: number | null
  /** Cuenta atras que fija el plan del anfitrion (10 en el gratuito); null si la elige la mesa. */
  countdownFixed?: number | null
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
  /** Se publica tambien en Comunidad (aparte del enlace; toda la mesa lo acepta sabiendolo). */
  listed: boolean
  /** El mundo viene de una obra ajena: sin video ni Comunidad (03-10). */
  derived?: boolean
  /** Todos los miembros actuales aceptaron y no se retiro: el enlace se ve. */
  public: boolean
  /** Quien mira ya acepto. */
  mine: boolean
  members: Array<{ memberId: string; name: string | null; consented: boolean }>
}

/** Un bloque de la cronica publica: solo lo que se lee, nunca avisos internos. */
export type ChronicleBlock =
  | { type: 'narration'; text: string; audioUrl?: string }
  | { type: 'dialogue'; speaker: string; text: string; audioUrl?: string }
  | { type: 'roll'; text: string; actor: string; die: string; result: number }
  | { type: 'image'; url: string; alt: string }

/** La cronica publica de una mesa, tal como la ve quien abre el enlace. */
export interface Chronicle {
  title: string
  /** `derived`: el mundo viene de una obra ajena; la cronica lleva el deslinde y no hay video ni Comunidad (03-10). */
  pack: { id: string; version: string; name: string | null; derived?: boolean }
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
  /** Otros ajustes de la mesa (por ejemplo `provider` para el GM scripted con guion). */
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

/** Lo que el GM pidio tirar: el dado, para que y por que. No dice como se pinta. */
export interface PendingRollRequest {
  die: string
  kind: 'skill' | 'social' | 'attack' | 'save' | 'other'
  skill?: string
  reason?: string
  advantage?: boolean
  disadvantage?: boolean
}

/** Lo que devuelve el servidor al soltar el dado de una tirada pedida. */
export interface RollReceipt {
  result: number
  rolls: number[]
  die: string
}

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
  /** Personalidad que este jugador escribio para su personaje; solo la ve el y el GM. */
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
  /** La tirada que el GM pidio al personaje de quien consulta en este turno, si la hay y aun no la tiro (modos `dice` y `table`). */
  rolls: { pending: PendingRollRequest | null }
  /** Turnos de cupo o creditos que le quedan a la mesa; null si no consume (clave propia). */
  /** Turnos de la mesa (cubeta gratuita mas reserva) y cuando entra el siguiente gratuito. */
  quota?: { remainingTurns: number; bucketTurns?: number; bucketCapacity?: number; nextTurnAt?: string | null } | null
  /** Ideas de accion para el personaje de quien consulta (E10b); vacio si no hay. */
  suggestions: string[]
  /**
   * Si puede pedir "Otras" ideas: `free` (le queda la ronda gratis del
   * turno), `unlocked` (clave propia o paquete), `locked` (gasto la gratis y
   * no tiene como pagar mas), `exhausted` (tope del turno) o `none`.
   */
  ideas: { more: 'free' | 'unlocked' | 'locked' | 'exhausted' | 'none'; used: number }
  /** Segundos de cuenta atras antes de narrar que eligio el anfitrion (0, 3, 5, 10 o 15). */
  countdown?: number
  /** Para el siguiente `after`: el ultimo bloque leido, tambien si era solo para el anfitrion. */
  lastBlockId: number
  /** La pagina vino llena: hay mas bloques por pedir. */
  more?: boolean
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

/** Una historia de Comunidad: una cronica que su mesa acepto publicar (02-10). */
export interface CommunityStory {
  token: string
  title: string | null
  pack: { id: string | null; name: string | null }
  /** Ruta de la primera ilustracion (`/api/v1/scenes/...`), o null. */
  cover: string | null
  excerpt: string | null
  sessions: number
  turns: number
  /** null si la mesa la compartio sin nombres. */
  players: string[] | null
  language: string | null
  updatedAt: string | null
}

/** Quien tiene mundos publicados en el catalogo. */
export interface CommunityCreator {
  name: string
  worlds: Array<{ id: string; name: string; tagline: string | null }>
}
