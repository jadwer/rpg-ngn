import type { Friendship, TableMember } from '@rpg-ngn/api-client'
import type { LoadedPack } from '@rpg-ngn/content'
import { beforeAll, describe, expect, it } from 'vitest'
import { loadPilot } from './pilot.test-helpers.js'
import { characterName, packCharacters, sessionList } from './pack.js'
import {
  acceptedFriends,
  cleanTableName,
  emptyTableText,
  freeCharacters,
  friendshipWith,
  hostOf,
  isHost,
  isValidSessionCode,
  knownByEmail,
  knownUsers,
  memberLine,
  memberTag,
  pendingReceived,
  seatLabel,
  seatPowers,
  suggestedSessionCode,
  tableSubtitle,
  tableTitle,
  takenCharacters,
} from './table-setup.js'

const members: TableMember[] = [
  { id: '1', role: 'host', characterId: 'narivyl', userId: '2', userName: 'Gabino' },
  { id: '2', role: 'player', characterId: 'zahira', userId: '4', userName: 'Jaz' },
  { id: '3', role: 'player', characterId: null, userId: '5', userName: 'Armando' },
]

const friendships: Friendship[] = [
  { id: '1', status: 'accepted', user: { id: '2', name: 'Gabino', email: 'gabino@example.com' }, friend: { id: '4', name: 'Jaz', email: 'jaz@example.com' }, acceptedAt: '2026-09-07' },
  { id: '2', status: 'pending', user: { id: '5', name: 'Armando', email: 'armando@example.com' }, friend: { id: '2', name: 'Gabino', email: 'gabino@example.com' }, acceptedAt: null },
  { id: '3', status: 'pending', user: { id: '2', name: 'Gabino', email: 'gabino@example.com' }, friend: { id: '6', name: 'Lu', email: 'lu@example.com' }, acceptedAt: null },
]

let pack: LoadedPack
beforeAll(async () => {
  pack = (await loadPilot()).pack
})

describe('pack', () => {
  it('lista personajes y sesiones en el orden del manifiesto y resuelve nombres', () => {
    expect(packCharacters(pack).map((c) => c.id)).toEqual(pack.manifest.characters)
    expect(packCharacters(pack)).toHaveLength(9)
    expect(sessionList(pack).map((s) => s.id)).toEqual(['001', '002', '003'])
    expect(characterName(pack, 'zahira')).toBe('Zahira')
    expect(characterName(pack, 'nadie')).toBe('nadie')
    expect(characterName(null, 'zahira')).toBe('zahira')
    expect(characterName(pack, null)).toBeNull()
  })
})

describe('mesa nueva', () => {
  it('limpia el nombre y rechaza el vacio o el demasiado largo', () => {
    expect(cleanTableName('  Prueba   móvil ')).toBe('Prueba móvil')
    expect(cleanTableName('   ')).toBeNull()
    expect(cleanTableName('x'.repeat(121))).toBeNull()
  })
})

describe('codigo de sesion sugerido', () => {
  it('sigue a la mayor de la campaña, o la primera planeada del pack, o 001', () => {
    expect(suggestedSessionCode(pack, [])).toBe('003')
    expect(suggestedSessionCode(null, [])).toBe('001')
    expect(suggestedSessionCode(pack, [{ id: '1', code: '101', status: 'closed', openedSeq: 1, closedSeq: 9 }, { id: '2', code: '003', status: 'closed', openedSeq: 10, closedSeq: 12 }])).toBe('102')
    expect(suggestedSessionCode(pack, [{ id: '1', code: '999', status: 'closed', openedSeq: 1, closedSeq: 9 }])).toBe('999')
    expect(isValidSessionCode('003')).toBe(true)
    expect(isValidSessionCode('3')).toBe(false)
  })
})

describe('personajes', () => {
  it('excluye los que otros juegan, conserva el del propio asiento y sabe quien tiene cada uno', () => {
    const ids = freeCharacters(pack, members).map((c) => c.id)
    expect(ids).not.toContain('narivyl')
    expect(ids).not.toContain('zahira')
    expect(ids).toHaveLength(7)
    expect(freeCharacters(pack, members, '1').map((c) => c.id)).toContain('narivyl')
    expect(takenCharacters(members).get('zahira')).toBe('Jaz')
    expect(takenCharacters(members).has('calder')).toBe(false)
  })
})

describe('amistades', () => {
  it('distingue aceptada, pedida por mi, recibida y ninguna', () => {
    expect(friendshipWith(friendships, '2', '4').kind).toBe('accepted')
    expect(friendshipWith(friendships, '2', '5').kind).toBe('received')
    expect(friendshipWith(friendships, '2', '6').kind).toBe('requested')
    expect(friendshipWith(friendships, '2', '9').kind).toBe('none')
    expect(friendshipWith(friendships, '4', '2').kind).toBe('accepted')
  })

  it('lista pendientes recibidas, amigos aceptados y conocidos desde cualquiera de los dos lados', () => {
    expect(pendingReceived(friendships, '2').map((f) => f.id)).toEqual(['2'])
    expect(pendingReceived(friendships, '6').map((f) => f.id)).toEqual(['3'])
    expect(acceptedFriends(friendships, '2').map((u) => u.name)).toEqual(['Jaz'])
    expect(acceptedFriends(friendships, '4').map((u) => u.name)).toEqual(['Gabino'])
    expect(knownUsers(friendships, '2').map((u) => u.email)).toEqual(['jaz@example.com', 'armando@example.com', 'lu@example.com'])
    expect(knownByEmail(friendships, '2', ' LU@example.com ')?.name).toBe('Lu')
    expect(knownByEmail(friendships, '2', 'nadie@example.com')).toBeNull()
    expect(knownByEmail(friendships, '2', '')).toBeNull()
  })
})

describe('asientos', () => {
  const nameOf = (id: string) => ({ narivyl: 'Narivyl', zahira: 'Zahira' })[id] ?? id

  it('nombra al anfitrion y describe cada asiento sin decir DM', () => {
    expect(hostOf({ members })?.userName).toBe('Gabino')
    expect(isHost(members[0]!)).toBe(true)
    expect(isHost(null)).toBe(false)
    expect(memberLine(members[0]!, nameOf)).toBe('Gabino, anfitrión, juega a Narivyl')
    expect(memberLine(members[1]!, nameOf)).toBe('Jaz juega a Zahira')
    expect(memberLine(members[2]!, nameOf)).toBe('Armando, sin personaje')
    expect(seatLabel(members[0]!, nameOf)).toBe('Eres el anfitrión y juegas a Narivyl')
    expect(seatLabel({ ...members[0]!, characterId: null }, nameOf)).toBe('Eres el anfitrión, sin personaje')
    expect(seatLabel(members[1]!, nameOf)).toBe('Juegas a Zahira')
    expect(seatLabel(null, nameOf)).toBe('No eres miembro de esta mesa')
    expect(memberTag(members[0]!, nameOf)).toBe('Gabino (anfitrión): Narivyl')
    expect(memberTag(members[2]!, nameOf)).toBe('Armando')
  })

  it('solo el anfitrion invita, abre y cierra sesiones y configura el DM', () => {
    expect(seatPowers('host')).toEqual({ canInvite: true, canOpenSession: true, canCloseSession: true, canConfigureDm: true })
    expect(seatPowers('player')).toEqual({ canInvite: false, canOpenSession: false, canCloseSession: false, canConfigureDm: false })
    expect(seatPowers(null).canInvite).toBe(false)
  })
})

describe('cabecera de la mesa', () => {
  it('arma el subtitulo con sesion, momento, turno y faltantes, y el titulo de la pestaña', () => {
    expect(tableSubtitle({ sessionTitle: null, loading: true, worldTime: null, turnNumber: null, pending: [], narrating: false })).toBe('Conectando...')
    expect(tableSubtitle({ sessionTitle: null, loading: false, worldTime: null, turnNumber: null, pending: [], narrating: false })).toBe('Sin sesión abierta')
    expect(tableSubtitle({ sessionTitle: 'La campana', loading: false, worldTime: 'Anochece', turnNumber: 2, pending: ['Zahira'], narrating: false })).toBe('La campana · Anochece · Turno 2 · faltan Zahira')
    expect(tableSubtitle({ sessionTitle: 'La campana', loading: false, worldTime: null, turnNumber: 2, pending: ['Zahira'], narrating: true })).toBe('La campana · Turno 2')
    expect(tableTitle('Posada', '003')).toBe('Posada, sesión 003 | rpg-ngn')
    expect(tableTitle('Posada', null, 'app')).toBe('Posada | app')
  })

  it('explica la mesa vacia segun quien mira', () => {
    expect(emptyTableText(true, false)).toContain('todavía no ha narrado')
    expect(emptyTableText(false, true)).toContain('mando del anfitrión')
    expect(emptyTableText(false, false)).toContain('Cuando el anfitrión abra')
  })
})
