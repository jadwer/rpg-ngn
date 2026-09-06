import type { CampaignEvent, Character } from '@rpg-ngn/content'
import { characterState, emptyWorld, resource, type WorldState } from '@rpg-ngn/core'
import { describe, expect, it } from 'vitest'
import { FORTUNE_TIERS, fantasyD20Lite } from './fantasy-d20-lite.js'
import { resolveRuleset } from './registry.js'
import { UnknownEffectError } from './ruleset.js'

const event = (overrides: Partial<CampaignEvent> = {}): CampaignEvent =>
  ({
    id: 'evt-00001',
    v: 1,
    seq: 1,
    type: 'world_event',
    sessionId: '002',
    recordedAt: '2026-09-05T00:00:00Z',
    recordedAtPrecision: 'exact',
    payload: { note: 'x' },
    ...overrides,
  }) as CampaignEvent

const world = (): WorldState => ({
  ...emptyWorld(),
  characters: { zahira: characterState('zahira', resource(10)), calder: characterState('calder', resource(12)) },
})

describe('fantasy-d20-lite', () => {
  it('estado inicial desde la ficha', () => {
    const character = { id: 'ana', hp: 11, ac: 13 } as Character
    const state = fantasyD20Lite.initialCharacterState(character)

    expect(state.hp).toEqual({ current: 11, max: 11 })
    expect(state.custom).toEqual({ ac: 13 })
    expect(state.fortune).toBeNull()
  })

  it('modificador de caracteristica', () => {
    expect([3, 8, 9, 10, 11, 12, 17, 20].map(fantasyD20Lite.abilityModifier)).toEqual([-4, -1, -1, 0, 0, 1, 3, 5])
  })

  it('Fortuna abierta: la tabla cubre 1..20 sin huecos ni solapes', () => {
    for (let r = 1; r <= 20; r += 1) {
      const matches = FORTUNE_TIERS.filter((t) => r >= t.min && r <= t.max)
      expect(matches).toHaveLength(1)
    }
    expect(fantasyD20Lite.fortune(6).tier).toBe('Incómodo')
    expect(fantasyD20Lite.fortune(20).tier).toBe('Destino')
    expect(() => fantasyD20Lite.fortune(0)).toThrow(RangeError)
  })

  it('memory_recovered incrementa el contador del personaje', () => {
    const next = fantasyD20Lite.applyEffect(world(), { op: 'memory_recovered', who: 'character:zahira' }, event())

    expect(next.characters['zahira']?.memoriesRecovered).toBe(1)
    expect(() => fantasyD20Lite.applyEffect(world(), { op: 'memory_recovered', who: 'npc:osric' }, event())).toThrow(/character:/)
    expect(() => fantasyD20Lite.applyEffect(world(), { op: 'memory_recovered' }, event())).toThrow(/"who"/)
  })

  it('gain pone el objeto en el actor, en el holder, o falla sin ninguno', () => {
    const e = event({ actor: 'character:calder' })
    const toActor = fantasyD20Lite.applyEffect(world(), { op: 'gain', item: 'llave', source: 'fortuna:19' }, e)
    expect(toActor.characters['calder']?.inventory).toEqual([{ id: 'llave', since: 'evt-00001', note: 'fortuna:19' }])

    const toNpc = fantasyD20Lite.applyEffect(world(), { op: 'gain', item: 'campana', holder: 'npc:tomas', note: 'custodia', source: 'acuerdo' }, event())
    expect(toNpc.npcs['tomas']?.inventory).toEqual([{ id: 'campana', since: 'evt-00001', note: 'custodia (acuerdo)' }])

    const withNote = fantasyD20Lite.applyEffect(world(), { op: 'gain', item: 'x', holder: 'character:zahira', note: 'solo nota' }, event())
    expect(withNote.characters['zahira']?.inventory[0]?.note).toBe('solo nota')

    expect(() => fantasyD20Lite.applyEffect(world(), { op: 'gain', item: 'x' }, event())).toThrow(/holder/)
    expect(() => fantasyD20Lite.applyEffect(world(), { op: 'gain', item: 'x', holder: 'location:mina' }, event())).toThrow(/inventario/)
  })

  it('lose quita el objeto y falla si no lo tenia', () => {
    const e = event({ actor: 'character:calder' })
    const withKey = fantasyD20Lite.applyEffect(world(), { op: 'gain', item: 'llave' }, e)
    const without = fantasyD20Lite.applyEffect(withKey, { op: 'lose', item: 'llave' }, e)

    expect(without.characters['calder']?.inventory).toEqual([])
    expect(() => fantasyD20Lite.applyEffect(without, { op: 'lose', item: 'llave' }, e)).toThrow(/no tiene/)

    const npc = fantasyD20Lite.applyEffect(world(), { op: 'gain', item: 'c', holder: 'npc:tomas' }, event())
    expect(fantasyD20Lite.applyEffect(npc, { op: 'lose', item: 'c', holder: 'npc:tomas' }, event()).npcs['tomas']?.inventory).toEqual([])
    expect(() => fantasyD20Lite.applyEffect(npc, { op: 'lose', item: 'c', holder: 'quest:q' }, event())).toThrow(/inventario/)
  })

  it('hp ajusta dentro de [0, max]', () => {
    const hurt = fantasyD20Lite.applyEffect(world(), { op: 'hp', who: 'character:zahira', delta: -4 }, event())
    expect(hurt.characters['zahira']?.hp).toEqual({ current: 6, max: 10 })

    const healed = fantasyD20Lite.applyEffect(hurt, { op: 'hp', who: 'character:zahira', delta: 40 }, event())
    expect(healed.characters['zahira']?.hp).toEqual({ current: 10, max: 10 })

    expect(() => fantasyD20Lite.applyEffect(world(), { op: 'hp', who: 'character:zahira', delta: 'mucho' }, event())).toThrow(/delta/)
  })

  it('condition agrega sin duplicar y quita', () => {
    const a = fantasyD20Lite.applyEffect(world(), { op: 'condition', who: 'character:zahira', add: 'aturdida' }, event())
    const b = fantasyD20Lite.applyEffect(a, { op: 'condition', who: 'character:zahira', add: 'aturdida' }, event())
    expect(b.characters['zahira']?.conditions).toEqual(['aturdida'])

    const c = fantasyD20Lite.applyEffect(b, { op: 'condition', who: 'character:zahira', remove: 'aturdida' }, event())
    expect(c.characters['zahira']?.conditions).toEqual([])

    expect(() => fantasyD20Lite.applyEffect(world(), { op: 'condition', who: 'character:zahira' }, event())).toThrow(/add.*remove/)
  })

  it('un op desconocido es UnknownEffectError, no un estado silencioso', () => {
    expect(() => fantasyD20Lite.applyEffect(world(), { op: 'teleport' }, event())).toThrow(UnknownEffectError)
  })
})

describe('resolveRuleset', () => {
  it('resuelve por id y por id@version', () => {
    expect(resolveRuleset('fantasy-d20-lite')).toBe(fantasyD20Lite)
    expect(resolveRuleset('fantasy-d20-lite@1.0.0')).toBe(fantasyD20Lite)
    expect(() => resolveRuleset('fantasy-d20-lite@2.0.0')).toThrow(/version/)
    expect(() => resolveRuleset('vampire')).toThrow(/desconocido/)
  })
})
