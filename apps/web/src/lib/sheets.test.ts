import { characterState } from '@rpg-ngn/core'
import { describe, expect, it } from 'vitest'
import { loadBundledPack } from './pack'
import { sheetEntries } from './sheets'

describe('entradas de fichas de la mesa', () => {
  it('decide dueño, velado y estado por personaje con la sesion 003 abierta', async () => {
    const pack = await loadBundledPack()
    const members = [
      { characterId: 'zahira', userName: 'Jaz' },
      { characterId: 'kael', userName: 'Armando' },
      { characterId: null, userName: 'Gabino' },
    ]
    const own = characterState('zahira', { current: 9, max: 13 })
    const world = { zahira: characterState('zahira', { current: 13, max: 13 }), kael: characterState('kael', { current: 4, max: 9 }) }
    const entries = sheetEntries({ pack, sessionCode: '003', members, viewerCharacterId: 'zahira', own, world })
    const byId = Object.fromEntries(entries.map((e) => [e.character.id, e]))

    expect(entries.map((e) => e.character.id)).toEqual(pack.manifest.characters)
    expect(byId['zahira']).toMatchObject({ mine: true, muted: false, slot: { kind: 'taken', player: 'Jaz' } })
    expect(byId['zahira']?.state?.hp).toEqual({ current: 9, max: 13 })
    expect(byId['zahira']?.visibility.veiled).toBe(false)

    expect(byId['kael']).toMatchObject({ mine: false, slot: { kind: 'taken', player: 'Armando' } })
    expect(byId['kael']?.state?.hp).toEqual({ current: 4, max: 9 })
    expect(byId['kael']?.visibility.veiled).toBe(false)

    expect(byId['brorg']).toMatchObject({ slot: { kind: 'free' }, muted: false })
    expect(byId['brorg']?.visibility.veiled).toBe(true)
    expect(byId['brorg']?.state).toBeUndefined()

    expect(byId['calder']).toMatchObject({ slot: { kind: 'absent' }, muted: true })
    expect(byId['calder']?.visibility.veiled).toBe(false)
  })

  it('sin sesion abierta nada se vela ni se apaga por disponibilidad', async () => {
    const pack = await loadBundledPack()
    const entries = sheetEntries({ pack, sessionCode: null, members: [], viewerCharacterId: null, own: undefined, world: undefined })
    expect(entries.every((e) => !e.visibility.veiled && e.slot.kind === 'absent' && e.muted)).toBe(true)
  })
})
