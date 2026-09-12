import type { Friendship, MemberRole, SessionSummary, TableMember, TableSummary } from '@rpg-ngn/api-client'
import type { Character, LoadedPack } from '@rpg-ngn/content'
import { packCharacters } from './pack.js'

/**
 * Decisiones puras de la preparacion de una mesa, las mismas en la web y en
 * la app: que codigo de sesion sugerir, que personajes quedan libres, en que
 * punto esta la amistad con alguien, que puede hacer cada asiento y como se
 * describe. El asiento del dueño es `host` en la API; en pantalla es el
 * anfitrion, porque el DM es la IA.
 */

/**
 * Codigo de tres digitos para la siguiente sesion: uno mas que la mayor ya
 * jugada en esta campaña; si no hay ninguna, la primera planeada del pack.
 */
export function suggestedSessionCode(pack: LoadedPack | null, existing: readonly SessionSummary[]): string {
  const numbers = existing.map((s) => Number(s.code)).filter((n) => Number.isInteger(n) && n >= 0)
  if (numbers.length > 0) return String(Math.min(999, Math.max(...numbers) + 1)).padStart(3, '0')
  const planned = pack ? pack.manifest.sessions.map((id) => pack.sessions.get(id)).find((s) => s?.status === 'planned') : undefined
  return planned?.id ?? '001'
}

export function isValidSessionCode(code: string): boolean {
  return /^[0-9]{3}$/.test(code)
}

/** Nombre de la mesa listo para enviar; vacio o demasiado largo no vale. */
export function cleanTableName(name: string): string | null {
  const value = name.trim().replace(/\s+/g, ' ')
  return value.length > 0 && value.length <= 120 ? value : null
}

/** Personajes del pack que ningun otro miembro juega (el propio asiento puede conservar el suyo). */
export function freeCharacters(pack: LoadedPack, members: readonly TableMember[], keepMemberId: string | null = null): Character[] {
  const taken = new Set(members.filter((m) => m.id !== keepMemberId && m.characterId).map((m) => m.characterId as string))
  return packCharacters(pack).filter((c) => !taken.has(c.id))
}

/** Quien juega cada personaje tomado, para marcarlo en el selector. */
export function takenCharacters(members: readonly TableMember[]): Map<string, string> {
  return new Map(members.filter((m) => m.characterId).map((m) => [m.characterId as string, m.userName ?? 'alguien']))
}

export type FriendshipState =
  | { kind: 'none' }
  | { kind: 'requested'; friendship: Friendship }
  | { kind: 'received'; friendship: Friendship }
  | { kind: 'accepted'; friendship: Friendship }

/** En que punto esta la amistad entre quien mira y otro usuario. */
export function friendshipWith(friendships: readonly Friendship[], meId: string, otherId: string): FriendshipState {
  const friendship = friendships.find((f) => (f.user.id === meId && f.friend.id === otherId) || (f.user.id === otherId && f.friend.id === meId))
  if (!friendship) return { kind: 'none' }
  if (friendship.status === 'accepted') return { kind: 'accepted', friendship }
  return friendship.friend.id === meId ? { kind: 'received', friendship } : { kind: 'requested', friendship }
}

/** Solicitudes que otros me mandaron y siguen pendientes. */
export function pendingReceived(friendships: readonly Friendship[], meId: string): Friendship[] {
  return friendships.filter((f) => f.status !== 'accepted' && f.friend.id === meId)
}

export interface KnownUser {
  id: string
  name: string
  email: string
}

/** Amigos con amistad aceptada, con quien puedo invitar. */
export function acceptedFriends(friendships: readonly Friendship[], meId: string): KnownUser[] {
  return friendships.filter((f) => f.status === 'accepted').map((f) => (f.user.id === meId ? f.friend : f.user))
}

/** El otro lado de cada amistad (en cualquier estado), por si busco a alguien que ya conozco. */
export function knownUsers(friendships: readonly Friendship[], meId: string): KnownUser[] {
  return friendships.map((f) => (f.user.id === meId ? f.friend : f.user))
}

/** Entre los conocidos, el que tiene ese correo (sin distinguir mayusculas), o null. */
export function knownByEmail(friendships: readonly Friendship[], meId: string, email: string): KnownUser | null {
  const value = email.trim().toLowerCase()
  if (!value) return null
  return knownUsers(friendships, meId).find((u) => u.email.toLowerCase() === value) ?? null
}

/** El dueño de la mesa: el asiento `host` (en pantalla, el anfitrion). */
export function hostOf(table: Pick<TableSummary, 'members'>): TableMember | null {
  return table.members.find((m) => m.role === 'host') ?? null
}

export function isHost(member: Pick<TableMember, 'role'> | null): boolean {
  return member?.role === 'host'
}

/** Lo que el asiento puede hacer con la mesa; responder y cerrar turnos lo decide `turnProgress`. */
export interface SeatPowers {
  /** Invitar y aceptar invitados (la API exige amistad aceptada). */
  canInvite: boolean
  canOpenSession: boolean
  canCloseSession: boolean
  /** Elegir y probar el proveedor del DM de la mesa. */
  canConfigureDm: boolean
}

export function seatPowers(role: MemberRole | null | undefined): SeatPowers {
  const host = role === 'host'
  return { canInvite: host, canOpenSession: host, canCloseSession: host, canConfigureDm: host }
}

/** Como se presenta un asiento en una lista: nombre, y su papel o personaje. */
export function memberLine(member: TableMember, nameOf: (id: string) => string): string {
  const who = member.userName ?? 'Alguien'
  const character = member.characterId ? nameOf(member.characterId) : null
  if (member.role === 'host') return character ? `${who}, anfitrión, juega a ${character}` : `${who}, anfitrión`
  return character ? `${who} juega a ${character}` : `${who}, sin personaje`
}

/** Lo que el usuario es en una mesa, para la tarjeta de la lista. */
export function seatLabel(me: TableMember | null, nameOf: (id: string) => string): string {
  if (!me) return 'No eres miembro de esta mesa'
  const character = me.characterId ? nameOf(me.characterId) : null
  if (me.role === 'host') return character ? `Eres el anfitrión y juegas a ${character}` : 'Eres el anfitrión, sin personaje'
  return character ? `Juegas a ${character}` : 'Sin personaje asignado'
}

/** Un miembro ajeno en la tarjeta de la mesa: `Jaz (anfitrión): Zahira`. */
export function memberTag(member: TableMember, nameOf: (id: string) => string): string {
  return `${member.userName ?? '?'}${member.role === 'host' ? ' (anfitrión)' : ''}${member.characterId ? `: ${nameOf(member.characterId)}` : ''}`
}

/** Subtitulo de la cabecera de la mesa: sesion, momento del mundo, turno y quien falta. */
export function tableSubtitle(input: { sessionTitle: string | null; loading: boolean; worldTime: string | null; turnNumber: number | null; pending: readonly string[]; narrating: boolean }): string {
  const parts = [input.sessionTitle ?? (input.loading ? 'Conectando...' : 'Sin sesión abierta')]
  if (input.worldTime) parts.push(input.worldTime)
  if (input.turnNumber !== null) {
    parts.push(`Turno ${input.turnNumber}`)
    if (input.pending.length > 0 && !input.narrating) parts.push(`faltan ${input.pending.join(', ')}`)
  }
  return parts.join(' · ')
}

/** Titulo de la ventana o pestaña: mesa y sesion. */
export function tableTitle(tableName: string, sessionCode: string | null, appName = 'rpg-ngn'): string {
  return `${tableName}${sessionCode ? `, sesión ${sessionCode}` : ''} | ${appName}`
}

/** Texto cuando la mesa no tiene bloques todavia, segun quien mira. */
export function emptyTableText(hasSession: boolean, host: boolean): string {
  if (hasSession) return 'El DM todavía no ha narrado. Cuando la mesa cierre el primer turno, la narración aparece aquí.'
  return host ? 'Abre la sesión desde el mando del anfitrión para que el DM presente la escena.' : 'Cuando el anfitrión abra la sesión, el primer turno aparece aquí.'
}
