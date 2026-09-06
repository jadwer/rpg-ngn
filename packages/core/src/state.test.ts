import { describe, expect, it } from 'vitest'
import { resource } from './resource.js'
import { characterState, emptyWorld, ensureNpc, npcState, requireCharacter, updateCharacter, updateNpc } from './state.js'

describe('world state', () => {
  const world = { ...emptyWorld(), characters: { zahira: characterState('zahira', resource(10)) } }

  it('requireCharacter devuelve o falla', () => {
    expect(requireCharacter(world, 'zahira').id).toBe('zahira')
    expect(() => requireCharacter(world, 'nadie')).toThrow(/nadie/)
  })

  it('updateCharacter no muta el estado anterior', () => {
    const next = updateCharacter(world, 'zahira', (c) => ({ ...c, memoriesRecovered: c.memoriesRecovered + 1 }))

    expect(next.characters['zahira']?.memoriesRecovered).toBe(1)
    expect(world.characters['zahira']?.memoriesRecovered).toBe(0)
  })

  it('ensureNpc crea el NPC la primera vez y lo reutiliza despues', () => {
    const [withTomas, tomas] = ensureNpc(world, 'tomas')
    expect(tomas).toEqual(npcState('tomas'))
    expect(withTomas.npcs['tomas']).toBe(tomas)

    const [again, same] = ensureNpc(withTomas, 'tomas')
    expect(again).toBe(withTomas)
    expect(same).toBe(tomas)
  })

  it('updateNpc funciona sobre NPCs nuevos y existentes', () => {
    const next = updateNpc(world, 'tomas', (n) => ({ ...n, inventory: [{ id: 'campana', since: 'evt-00019' }] }))
    expect(next.npcs['tomas']?.inventory).toHaveLength(1)

    const again = updateNpc(next, 'tomas', (n) => ({ ...n, inventory: [] }))
    expect(again.npcs['tomas']?.inventory).toHaveLength(0)
    expect(next.npcs['tomas']?.inventory).toHaveLength(1)
  })
})
