import type { Friendship, SessionSummary, TableMember, TableSummary } from '@rpg-ngn/api-client'
import type { Character, LoadedPack } from '@rpg-ngn/content'
import { packCharacters } from './sheets'

/**
 * Decisiones puras de la preparacion de una mesa: que codigo de sesion
 * sugerir, que personajes quedan libres, en que estado esta la amistad con
 * alguien y como describir a los miembros. Sin React para probarlo con vitest.
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

/** Personajes del pack que ningun otro miembro juega (el propio asiento puede conservar el suyo). */
export function freeCharacters(pack: LoadedPack, members: readonly TableMember[], keepMemberId: string | null = null): Character[] {
  const taken = new Set(members.filter((m) => m.id !== keepMemberId && m.characterId).map((m) => m.characterId as string))
  return packCharacters(pack).filter((c) => !taken.has(c.id))
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

/** Amigos con amistad aceptada, con quien puedo invitar. */
export function acceptedFriends(friendships: readonly Friendship[], meId: string): Array<{ id: string; name: string; email: string }> {
  return friendships.filter((f) => f.status === 'accepted').map((f) => (f.user.id === meId ? f.friend : f.user))
}

/** El dueño de la mesa: el asiento `dm` (en la web se le llama anfitrion). */
export function hostOf(table: Pick<TableSummary, 'members'>): TableMember | null {
  return table.members.find((m) => m.role === 'dm') ?? null
}

export function isHost(member: Pick<TableMember, 'role'> | null): boolean {
  return member?.role === 'dm'
}

/** Como se presenta un asiento en una lista: nombre, y su papel o personaje. */
export function memberLine(member: TableMember, nameOf: (id: string) => string): string {
  const who = member.userName ?? 'Alguien'
  const character = member.characterId ? nameOf(member.characterId) : null
  if (member.role === 'dm') return character ? `${who}, anfitrión, juega a ${character}` : `${who}, anfitrión`
  return character ? `${who} juega a ${character}` : `${who}, sin personaje`
}

/** Lo que el usuario es en una mesa, para la tarjeta de la lista. */
export function seatLabel(me: TableMember | null, nameOf: (id: string) => string): string {
  if (!me) return 'No eres miembro de esta mesa'
  const character = me.characterId ? nameOf(me.characterId) : null
  if (me.role === 'dm') return character ? `Eres el anfitrión y juegas a ${character}` : 'Eres el anfitrión, sin personaje'
  return character ? `Juegas a ${character}` : 'Sin personaje asignado'
}
