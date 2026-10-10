import type { CampaignEvent } from '@rpg-ngn/content'
import type { WorldState } from '@rpg-ngn/core'
import { describe, expect, it } from 'vitest'
import { reactionOf } from './elements.js'
import { fantasyD20Lite } from './fantasy-d20-lite.js'

const event = { id: 'evt-00020' } as CampaignEvent
const world = (): WorldState => ({ worldTime: null, npcs: {}, characters: { lumi: { id: 'lumi', hp: { current: 10, max: 10 }, conditions: [], inventory: [], fortune: null, memoriesRecovered: 0, custom: {} } } })
const hit = (w: WorldState, element: string, damage: number, targetMax = 40) => fantasyD20Lite.applyEffect(w, { op: 'elemental', who: 'character:lumi', target: 'npc:guardian', element, damage, targetMax }, event)
const guardian = (w: WorldState) => w.npcs['guardian']!.custom as { hp: number; aura: string | null; conditions: string[]; lastHit: { reaction: string | null; damage: number } }

describe('combate por elementos', () => {
  it('el primer golpe deja aura; el segundo de otro elemento reacciona, la consume y multiplica', () => {
    let w = hit(world(), 'fuego', 6)
    expect(guardian(w)).toMatchObject({ hp: 34, aura: 'fuego', lastHit: { reaction: null, damage: 6 } })
    w = hit(w, 'agua', 7)
    expect(guardian(w)).toMatchObject({ hp: 20, aura: null, lastHit: { reaction: 'Vaporizar', damage: 14 } })
  })

  it('la tabla: el disparador cuenta, Viento y Roca no se pegan, Congelado y Cristalizar dejan condicion', () => {
    expect(reactionOf('fuego', 'agua')?.multiplier).toBe(2)
    expect(reactionOf('agua', 'fuego')?.multiplier).toBe(1.5)
    expect(reactionOf('hielo', 'fuego')?.name).toBe('Derretir')
    expect(reactionOf('flora', 'viento')).toBeNull()
    expect(reactionOf(null, 'rayo')).toBeNull()
    let w = hit(world(), 'viento', 3)
    expect(guardian(w).aura).toBeNull()
    w = hit(hit(world(), 'agua', 2), 'hielo', 2)
    expect(guardian(w).conditions).toContain('congelado')
    w = hit(hit(world(), 'rayo', 2), 'roca', 2)
    expect(w.characters['lumi']?.conditions).toContain('escudo de cristal')
  })

  it('a cero queda derrotado y no se le puede volver a golpear; sin vida en el pack no hay combate', () => {
    const w = hit(world(), 'fuego', 50, 10)
    expect(guardian(w)).toMatchObject({ hp: 0 })
    expect(guardian(w).conditions).toContain('derrotado')
    expect(() => hit(w, 'agua', 3)).toThrow(/derrotado/)
    expect(() => fantasyD20Lite.applyEffect(world(), { op: 'elemental', who: 'character:lumi', target: 'npc:nadie', element: 'fuego', damage: 3 }, event)).toThrow(/no tiene vida/)
  })
})
