import { beforeAll, describe, expect, it } from 'vitest'
import { fantasyD20Lite } from '@rpg-ngn/rules'
import { abilityUsage, characterSheet, formatModifier, humanizeId } from './sheet.js'
import { characterVisibility, everPlayed } from './veil.js'
import { loadPilot, sessionOf, type Pilot } from './pilot.test-helpers.js'

let pilot: Pilot
beforeAll(async () => {
  pilot = await loadPilot()
})

const modifier = (score: number): number => fantasyD20Lite.abilityModifier(score)

describe('characterSheet con el estado reducido del piloto', () => {
  it('Zahira tras la sesion 002: Fortuna 6 (Incómodo), un recuerdo recuperado, HP intacto', () => {
    const zahira = pilot.pack.characters.get('zahira')!
    const played = everPlayed(pilot.pack.sessions.values())
    const sheet = characterSheet(zahira, {
      visibility: characterVisibility(sessionOf(pilot.pack, '002'), zahira, played),
      state: pilot.state.world.characters['zahira'],
      modifier,
    })
    expect(sheet.fortune).toEqual({ result: 6, tier: 'Incómodo' })
    expect(sheet.memoriesRecovered).toBe(1)
    expect(sheet.hp).toEqual({ current: 13, max: 13 })
    expect(sheet.ac).toBe(17)
    expect(sheet.stats.map((s) => `${s.label} ${s.value} ${s.modifier}`)).toEqual(['FUE 16 +3', 'DES 12 +1', 'CON 16 +3', 'INT 10 +0', 'SAB 12 +1', 'CAR 11 +0'])
    expect(sheet.veiled).toBe(false)
    expect(sheet.bio).toBe(zahira.bio)
    expect(sheet.abilities).toHaveLength(4)
  })

  it('Calder lleva la llave de hierro en el inventario', () => {
    const calder = pilot.pack.characters.get('calder')!
    const sheet = characterSheet(calder, {
      visibility: characterVisibility(sessionOf(pilot.pack, '002'), calder, new Set(['calder'])),
      state: pilot.state.world.characters['calder'],
      modifier,
    })
    expect(sheet.inventory).toEqual([{ id: 'llave-de-hierro-sin-cerradura', note: 'fortuna:19' }])
  })

  it('Brorg en la 003 sale velado: sin bio, objetivo, cita ni capacidades, pero con ataques y stats', () => {
    const brorg = pilot.pack.characters.get('brorg')!
    const played = everPlayed(pilot.pack.sessions.values())
    const sheet = characterSheet(brorg, {
      visibility: characterVisibility(sessionOf(pilot.pack, '003'), brorg, played),
      state: pilot.state.world.characters['brorg'],
      modifier,
    })
    expect(sheet.veiled).toBe(true)
    expect(sheet.bio).toBeNull()
    expect(sheet.goal).toBeNull()
    expect(sheet.quote).toBeNull()
    expect(sheet.abilities).toBeNull()
    expect(sheet.attacks.length).toBeGreaterThan(0)
    expect(sheet.stats).toHaveLength(6)
    expect(sheet.fortune).toBeNull()
  })

  it('sin estado usa la ficha tal cual', () => {
    const kael = pilot.pack.characters.get('kael')!
    const sheet = characterSheet(kael, { visibility: characterVisibility(sessionOf(pilot.pack, '001'), kael, new Set()), modifier })
    expect(sheet.hp).toEqual({ current: kael.hp, max: kael.hp })
    expect(sheet.inventory).toEqual([])
    expect(sheet.conditions).toEqual([])
  })
})

describe('helpers de ficha', () => {
  it('formatModifier lleva signo', () => {
    expect(formatModifier(2)).toBe('+2')
    expect(formatModifier(0)).toBe('+0')
    expect(formatModifier(-1)).toBe('-1')
  })

  it('humanizeId', () => {
    expect(humanizeId('llave-de-hierro-sin-cerradura')).toBe('Llave de hierro sin cerradura')
  })

  it('abilityUsage', () => {
    const base = { id: 'x', name: 'X', type: 'rasgo' as const, effect: 'e' }
    expect(abilityUsage({ ...base, uses: 1, per: 'descanso corto' })).toBe('1 por descanso corto')
    expect(abilityUsage({ ...base, uses: 2 })).toBe('2 por descanso')
    expect(abilityUsage({ ...base, uses: null })).toBe('a voluntad')
    expect(abilityUsage(base)).toBeNull()
  })
})
