import { seededRandom } from '@rpg-ngn/core'
import { describe, expect, it } from 'vitest'
import { appendRoll, quickRoll, QUICK_DICE } from './quick-roll.js'

describe('quickRoll', () => {
  it('tira con el generador que se le da y arma la frase para pegar', () => {
    const expected = seededRandom(3)
    const value = expected.nextInt(20) + 1
    const roll = quickRoll('1d20', seededRandom(3))
    expect(roll).toEqual({ die: '1d20', result: value, rolls: [value], text: `Tiro 1d20: ${value}` })
  })

  it('con varios dados detalla cada uno y el modificador', () => {
    const expected = seededRandom(5)
    const dados = [expected.nextInt(6) + 1, expected.nextInt(6) + 1]
    const roll = quickRoll('2d6', seededRandom(5))
    expect(roll.result).toBe(dados[0]! + dados[1]!)
    expect(roll.text).toBe(`Tiro 2d6: ${roll.result} [${dados.join(' + ')}]`)
  })

  it('todos los dados de la lista rapida son validos y caen en su rango', () => {
    for (const die of QUICK_DICE) {
      const roll = quickRoll(die, seededRandom(11))
      expect(roll.result).toBeGreaterThanOrEqual(roll.rolls.length)
      expect(roll.rolls.every((r) => r >= 1)).toBe(true)
    }
  })
})

describe('appendRoll', () => {
  const roll = { die: '1d20', result: 14, rolls: [14], text: 'Tiro 1d20: 14' }

  it('con el cuadro vacio deja solo la tirada', () => {
    expect(appendRoll('', roll)).toBe('Tiro 1d20: 14')
    expect(appendRoll('   ', roll)).toBe('Tiro 1d20: 14')
  })

  it('no pisa lo escrito y puntua segun como termine', () => {
    expect(appendRoll('Fuerzo la cerradura', roll)).toBe('Fuerzo la cerradura. Tiro 1d20: 14')
    expect(appendRoll('Fuerzo la cerradura.', roll)).toBe('Fuerzo la cerradura. Tiro 1d20: 14')
    expect(appendRoll('¿Puedo?', roll)).toBe('¿Puedo? Tiro 1d20: 14')
  })
})

describe('safeRandom', () => {
  it('sin crypto en el entorno no lanza: cae a Math.random', async () => {
    const { safeRandom, quickRoll } = await import('./quick-roll.js')
    const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto')
    Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true })
    try {
      expect(safeRandom().describe()).toBe('math-random')
      const roll = quickRoll('1d20')
      expect(roll.result).toBeGreaterThanOrEqual(1)
      expect(roll.result).toBeLessThanOrEqual(20)
    } finally {
      if (original) Object.defineProperty(globalThis, 'crypto', original)
    }
  })
})
