import type { Friendship, TableMember } from '@rpg-ngn/api-client'
import { describe, expect, it } from 'vitest'
import { loadBundledPack } from './pack'
import { acceptedFriends, freeCharacters, friendshipWith, hostOf, isValidSessionCode, memberLine, pendingReceived, seatLabel, suggestedSessionCode } from './tableSetup'

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

describe('codigo de sesion sugerido', () => {
  it('sigue a la mayor de la campaña, o la primera planeada del pack, o 001', async () => {
    const pack = await loadBundledPack()
    expect(suggestedSessionCode(pack, [])).toBe('003')
    expect(suggestedSessionCode(null, [])).toBe('001')
    expect(suggestedSessionCode(pack, [{ id: '1', code: '101', status: 'closed', openedSeq: 1, closedSeq: 9 }, { id: '2', code: '003', status: 'closed', openedSeq: 10, closedSeq: 12 }])).toBe('102')
    expect(suggestedSessionCode(pack, [{ id: '1', code: '999', status: 'closed', openedSeq: 1, closedSeq: 9 }])).toBe('999')
    expect(isValidSessionCode('003')).toBe(true)
    expect(isValidSessionCode('3')).toBe(false)
  })
})

describe('personajes libres', () => {
  it('excluye los que otros juegan y conserva el del propio asiento', async () => {
    const pack = await loadBundledPack()
    const ids = freeCharacters(pack, members).map((c) => c.id)
    expect(ids).not.toContain('narivyl')
    expect(ids).not.toContain('zahira')
    expect(ids).toHaveLength(7)
    expect(freeCharacters(pack, members, '1').map((c) => c.id)).toContain('narivyl')
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

  it('lista pendientes recibidas y amigos aceptados desde cualquiera de los dos lados', () => {
    expect(pendingReceived(friendships, '2').map((f) => f.id)).toEqual(['2'])
    expect(pendingReceived(friendships, '6').map((f) => f.id)).toEqual(['3'])
    expect(acceptedFriends(friendships, '2').map((u) => u.name)).toEqual(['Jaz'])
    expect(acceptedFriends(friendships, '4').map((u) => u.name)).toEqual(['Gabino'])
  })
})

describe('asientos', () => {
  const nameOf = (id: string) => ({ narivyl: 'Narivyl', zahira: 'Zahira' })[id] ?? id
  it('nombra al anfitrion y describe cada asiento sin decir DM', () => {
    expect(hostOf({ members })?.userName).toBe('Gabino')
    expect(memberLine(members[0]!, nameOf)).toBe('Gabino, anfitrión, juega a Narivyl')
    expect(memberLine(members[1]!, nameOf)).toBe('Jaz juega a Zahira')
    expect(memberLine(members[2]!, nameOf)).toBe('Armando, sin personaje')
    expect(seatLabel(members[0]!, nameOf)).toBe('Eres el anfitrión y juegas a Narivyl')
    expect(seatLabel({ ...members[0]!, characterId: null }, nameOf)).toBe('Eres el anfitrión, sin personaje')
    expect(seatLabel(members[1]!, nameOf)).toBe('Juegas a Zahira')
    expect(seatLabel(null, nameOf)).toBe('No eres miembro de esta mesa')
  })
})
