import type { CampaignEvent, Character } from '@rpg-ngn/content'
import type { WorldState } from '@rpg-ngn/core'
import { describe, expect, it } from 'vitest'
import { courtIntrigue } from './court-intrigue.js'
import { resolveRuleset, UnknownEffectError } from './index.js'

/**
 * Segundo ruleset del motor. Lo que se prueba aqui no es el juego: es que el
 * eje "agnostico de sistema" del ADR sea real, o sea que un juego sin
 * combate quepa sin tocar el nucleo.
 */

const dama = (over: Partial<Character> = {}): Character =>
  ({
    id: 'shiho',
    name: 'Shiho',
    race: 'Humana',
    class: 'Dama de compañía',
    age: '24 años',
    quote: 'Escucho más de lo que hablo.',
    bio: 'Sirve en el pabellón de jade desde niña.',
    stats: { fue: 8, des: 12, con: 10, int: 14, sab: 15, car: 13 },
    hp: 1,
    attacks: [],
    abilities: [],
    skills: ['Observación'],
    roles: ['Testigo'],
    goal: 'Que no la culpen a ella.',
    faction: 'corte-interior',
    portrait: null,
    ...over,
  }) as Character

const mundo = (custom: Record<string, unknown>): WorldState =>
  ({
    characters: { shiho: { id: 'shiho', hp: { current: 1, max: 1 }, conditions: [], inventory: [], fortune: null, memoriesRecovered: 0, custom } },
    npcs: {},
    flags: {},
  }) as unknown as WorldState

const evento = {} as CampaignEvent

describe('court-intrigue', () => {
  it('arranca a los personajes con credito segun su faccion, sin puntos de vida que gastar', () => {
    const dentro = courtIntrigue.initialCharacterState(dama())
    expect(dentro.custom['standing']).toBe(5)
    expect(dentro.custom['suspicion']).toBe(0)
    expect(dentro.custom['clues']).toEqual([])
    // Nadie pelea: hp existe porque el estado de core lo pide, y vale 1.
    expect(dentro.hp).toEqual({ current: 1, max: 1 })

    // Quien viene del barrio del placer tiene menos puertas abiertas.
    expect(courtIntrigue.initialCharacterState(dama({ faction: 'barrio-del-placer' })).custom['standing']).toBe(2)
    // Una faccion que no esta en la tabla cae al valor neutro.
    expect(courtIntrigue.initialCharacterState(dama({ faction: 'gremio-inventado' })).custom['standing']).toBe(4)
  })

  it('el credito y la sospecha se mueven, y no se salen de la escala', () => {
    let world = mundo({ standing: 5, suspicion: 0, clues: [] })

    world = courtIntrigue.applyEffect(world, { op: 'standing', who: 'character:shiho', delta: -2 }, evento)
    expect(world.characters['shiho']!.custom['standing']).toBe(3)

    // Gastar mas credito del que se tiene deja en cero, no en negativo.
    world = courtIntrigue.applyEffect(world, { op: 'standing', who: 'character:shiho', delta: -9 }, evento)
    expect(world.characters['shiho']!.custom['standing']).toBe(0)

    // La sospecha tampoco pasa de 10: a partir de ahi ya te detuvieron.
    world = courtIntrigue.applyEffect(world, { op: 'suspicion', who: 'character:shiho', delta: 14 }, evento)
    expect(world.characters['shiho']!.custom['suspicion']).toBe(10)
  })

  it('las pistas se acumulan sin repetirse', () => {
    let world = mundo({ standing: 5, suspicion: 0, clues: [] })

    world = courtIntrigue.applyEffect(world, { op: 'clue', who: 'character:shiho', clue: 'te-de-jazmin' }, evento)
    world = courtIntrigue.applyEffect(world, { op: 'clue', who: 'character:shiho', clue: 'te-de-jazmin' }, evento)
    world = courtIntrigue.applyEffect(world, { op: 'clue', who: 'character:shiho', clue: 'la-cocinera-mintio' }, evento)

    // Averiguar dos veces lo mismo no cuenta dos veces.
    expect(world.characters['shiho']!.custom['clues']).toEqual(['te-de-jazmin', 'la-cocinera-mintio'])
  })

  it('un envenenamiento es una condicion, no daño', () => {
    let world = mundo({ standing: 5, suspicion: 0, clues: [] })
    world = courtIntrigue.applyEffect(world, { op: 'condition', who: 'character:shiho', add: 'envenenada' }, evento)
    expect(world.characters['shiho']!.conditions).toEqual(['envenenada'])
    expect(world.characters['shiho']!.hp).toEqual({ current: 1, max: 1 })

    world = courtIntrigue.applyEffect(world, { op: 'condition', who: 'character:shiho', remove: 'envenenada' }, evento)
    expect(world.characters['shiho']!.conditions).toEqual([])
  })

  it('rechaza los effects de otro ruleset en vez de ignorarlos', () => {
    const world = mundo({ standing: 5, suspicion: 0, clues: [] })
    // `hp` es de d20: aqui nadie recibe daño, y callarselo escondería un bug.
    expect(() => courtIntrigue.applyEffect(world, { op: 'hp', who: 'character:shiho', delta: -3 }, evento)).toThrow(UnknownEffectError)
  })

  it('el motor lo resuelve por id, junto al d20', () => {
    expect(resolveRuleset('court-intrigue').version).toBe('1.0.0')
    expect(resolveRuleset('court-intrigue@1.0.0').id).toBe('court-intrigue')
    expect(resolveRuleset('fantasy-d20-lite').id).toBe('fantasy-d20-lite')
  })

  it('la fortuna se lee como hasta donde te dejan llegar, en palabras del setting', () => {
    expect(courtIntrigue.fortune(1)).toEqual({ result: 1, tier: 'Alguien se da cuenta' })
    expect(courtIntrigue.fortune(10)).toEqual({ result: 10, tier: 'Consigues algo, dejas rastro' })
    expect(courtIntrigue.fortune(20)).toEqual({ result: 20, tier: 'Te abren de par en par' })
  })
})
