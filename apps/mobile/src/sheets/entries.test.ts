import { describe, expect, it } from 'vitest'
import type { CharacterState } from '@rpg-ngn/core'
import { loadOfflineCampaign } from '../pack/offline'
import { offlineSheetEntries, onlineSheetEntries } from './entries'

function state(id: string, hp: number): CharacterState {
  return { id, hp: { current: hp, max: 13 }, conditions: [], inventory: [], fortune: null, memoriesRecovered: 0, custom: {} }
}

describe('fichas', () => {
  it('offline: en la 003 (planeada, sin party) los seis por elegir salen velados; los ya jugados, en gris y con su estado', async () => {
    const campaign = await loadOfflineCampaign()
    const entries = offlineSheetEntries(campaign, campaign.pack.sessions.get('003')!)
    expect(entries).toHaveLength(9)
    const zahira = entries.find((e) => e.character.id === 'zahira')!
    expect(zahira.slot).toEqual({ kind: 'absent' })
    expect(zahira.muted).toBe(true)
    expect(zahira.visibility.veiled).toBe(false)
    expect(zahira.state?.fortune).toEqual({ result: 6, tier: 'Incómodo' })
    const veiled = entries.filter((e) => e.visibility.veiled)
    expect(veiled.map((e) => e.character.id).sort()).toEqual(['brorg', 'dayan', 'hector', 'kael', 'orion', 'talin'])
    expect(veiled.every((e) => e.slot.kind === 'free' && !e.muted)).toBe(true)

    const played = offlineSheetEntries(campaign, campaign.pack.sessions.get('002')!)
    expect(played.find((e) => e.character.id === 'zahira')!.slot).toEqual({ kind: 'taken', player: 'Jaz' })
    expect(played.every((e) => !e.visibility.veiled)).toBe(true)
  })

  it('online: la propia ficha usa la proyeccion del jugador y las ajenas la del mundo', async () => {
    const { pack } = await loadOfflineCampaign()
    const entries = onlineSheetEntries({
      pack,
      sessionCode: '003',
      members: [
        { characterId: null, userName: 'Gabino' },
        { characterId: 'zahira', userName: 'Jaz' },
        { characterId: 'calder', userName: 'Armando' },
      ],
      viewerCharacterId: 'zahira',
      own: state('zahira', 9),
      world: { zahira: state('zahira', 13), calder: state('calder', 5) },
    })
    const zahira = entries.find((e) => e.character.id === 'zahira')!
    expect(zahira.mine).toBe(true)
    expect(zahira.state?.hp.current).toBe(9)
    expect(zahira.slot).toEqual({ kind: 'taken', player: 'Jaz' })
    const calder = entries.find((e) => e.character.id === 'calder')!
    expect(calder.state?.hp.current).toBe(5)
    expect(calder.mine).toBe(false)
    expect(calder.visibility.veiled).toBe(false)
    const kael = entries.find((e) => e.character.id === 'kael')!
    expect(kael.state).toBeUndefined()
    expect(kael.visibility.veiled).toBe(true)
    expect(kael.slot).toEqual({ kind: 'free' })
    expect(kael.muted).toBe(false)
    const narivyl = entries.find((e) => e.character.id === 'narivyl')!
    expect(narivyl.slot).toEqual({ kind: 'absent' })
    expect(narivyl.muted).toBe(true)
    expect(narivyl.visibility.veiled).toBe(false)
  })

  it('online: un miembro que toma un personaje libre lo desvela aunque el pack no lo haya jugado', async () => {
    const { pack } = await loadOfflineCampaign()
    const entries = onlineSheetEntries({ pack, sessionCode: '003', members: [{ characterId: 'kael', userName: 'Nuevo' }], viewerCharacterId: 'kael', own: undefined, world: undefined })
    const kael = entries.find((e) => e.character.id === 'kael')!
    expect(kael.visibility.veiled).toBe(false)
    expect(kael.slot).toEqual({ kind: 'taken', player: 'Nuevo' })
    const brorg = entries.find((e) => e.character.id === 'brorg')!
    expect(brorg.slot).toEqual({ kind: 'free' })
  })

  it('online: sin sesion abierta nada se vela', async () => {
    const { pack } = await loadOfflineCampaign()
    const entries = onlineSheetEntries({ pack, sessionCode: null, members: [], viewerCharacterId: null, own: undefined, world: undefined })
    expect(entries.every((e) => !e.visibility.veiled)).toBe(true)
    expect(entries.every((e) => e.slot.kind === 'absent')).toBe(true)
  })
})
