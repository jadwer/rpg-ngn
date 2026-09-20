import type { CampaignEvent, Character } from '@rpg-ngn/content'
import type { WorldState } from '@rpg-ngn/core'
import { describe, expect, it } from 'vitest'
import { resolveRuleset, UnknownEffectError } from './index.js'
import { masquerade } from './masquerade.js'

/**
 * Tercer ruleset. Lo nuevo respecto a la corte no son los contadores (son
 * los mismos con otro nombre) sino los vinculos: estado por persona, que se
 * sustituye en vez de acumularse.
 */

const debutante = (over: Partial<Character> = {}): Character =>
  ({
    id: 'camille',
    name: 'Camille Rossignol',
    race: 'Humana',
    class: 'Debutante',
    age: '19 años',
    quote: 'Todo aquí es tan... deslumbrante.',
    bio: 'Su primera mascarada.',
    stats: { fue: 8, des: 12, con: 10, int: 12, sab: 11, car: 15 },
    hp: 1,
    attacks: [],
    abilities: [],
    skills: ['Etiqueta'],
    roles: ['Debutante'],
    goal: 'Salir de la noche con alguien a quien volver a ver.',
    faction: 'nobleza',
    portrait: null,
    ...over,
  }) as Character

const salon = (custom: Record<string, unknown>): WorldState =>
  ({
    characters: { camille: { id: 'camille', hp: { current: 1, max: 1 }, conditions: [], inventory: [], fortune: null, memoriesRecovered: 0, custom } },
    npcs: {},
    flags: {},
  }) as unknown as WorldState

const evento = {} as CampaignEvent
const bonds = (world: WorldState) => world.characters['camille']!.custom['bonds']

describe('masquerade', () => {
  it('arranca con prestigio segun la faccion, sin escandalo ni vinculos', () => {
    const noble = masquerade.initialCharacterState(debutante())
    expect(noble.custom['prestige']).toBe(7)
    expect(noble.custom['scandal']).toBe(0)
    expect(noble.custom['bonds']).toEqual([])
    expect(noble.hp).toEqual({ current: 1, max: 1 })

    expect(masquerade.initialCharacterState(debutante({ faction: 'servidumbre' })).custom['prestige']).toBe(2)
    expect(masquerade.initialCharacterState(debutante({ faction: 'piratas' })).custom['prestige']).toBe(5)
  })

  it('prestigio y escandalo se mueven dentro de la escala', () => {
    let world = salon({ prestige: 7, scandal: 0, bonds: [] })
    world = masquerade.applyEffect(world, { op: 'prestige', who: 'character:camille', delta: -3 }, evento)
    expect(world.characters['camille']!.custom['prestige']).toBe(4)
    world = masquerade.applyEffect(world, { op: 'scandal', who: 'character:camille', delta: 12 }, evento)
    expect(world.characters['camille']!.custom['scandal']).toBe(10)
    world = masquerade.applyEffect(world, { op: 'prestige', who: 'character:camille', delta: -9 }, evento)
    expect(world.characters['camille']!.custom['prestige']).toBe(0)
  })

  it('un vinculo nuevo con la misma persona sustituye al anterior; con otra, se suma', () => {
    let world = salon({ prestige: 7, scandal: 0, bonds: [] })
    world = masquerade.applyEffect(world, { op: 'bond', who: 'character:camille', with: 'npc:julien', state: 'interes' }, evento)
    world = masquerade.applyEffect(world, { op: 'bond', who: 'character:camille', with: 'npc:julien', state: 'atraccion' }, evento)
    world = masquerade.applyEffect(world, { op: 'bond', who: 'character:camille', with: 'character:armand', state: 'confianza' }, evento)
    expect(bonds(world)).toEqual([
      { with: 'npc:julien', state: 'atraccion' },
      { with: 'character:armand', state: 'confianza' },
    ])
    // La decepcion borra la atraccion: la noche cambia de opinion.
    world = masquerade.applyEffect(world, { op: 'bond', who: 'character:camille', with: 'npc:julien', state: 'decepcion' }, evento)
    expect(bonds(world)).toEqual([
      { with: 'character:armand', state: 'confianza' },
      { with: 'npc:julien', state: 'decepcion' },
    ])
  })

  it('un estado de vinculo inventado no entra', () => {
    const world = salon({ prestige: 7, scandal: 0, bonds: [] })
    expect(bonds(masquerade.applyEffect(world, { op: 'bond', who: 'character:camille', with: 'npc:julien', state: 'amor-eterno' }, evento))).toEqual([])
  })

  it('una intoxicacion es una condicion, no daño; hp de otro ruleset se rechaza', () => {
    let world = salon({ prestige: 7, scandal: 0, bonds: [] })
    world = masquerade.applyEffect(world, { op: 'condition', who: 'character:camille', add: 'mareada' }, evento)
    expect(world.characters['camille']!.conditions).toEqual(['mareada'])
    expect(() => masquerade.applyEffect(world, { op: 'hp', who: 'character:camille', delta: -3 }, evento)).toThrow(UnknownEffectError)
    expect(() => masquerade.applyEffect(world, { op: 'suspicion', who: 'character:camille', delta: 1 }, evento)).toThrow(UnknownEffectError)
  })

  it('el motor lo resuelve por id y la fortuna habla del salon', () => {
    expect(resolveRuleset('masquerade').version).toBe('1.0.0')
    expect(masquerade.fortune(1).tier).toBe('Metes la pata delante de todos')
    expect(masquerade.fortune(11).tier).toBe('Te escucha, pero mira a otro lado')
    expect(masquerade.fortune(20).tier).toBe('Se quita la máscara')
  })
})
