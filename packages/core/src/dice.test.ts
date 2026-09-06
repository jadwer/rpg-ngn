import { describe, expect, it } from 'vitest'
import { parseDice, rollD20, rollDice } from './dice.js'
import { recordedRandom, seededRandom } from './random.js'

describe('parseDice', () => {
  it('lee NdM, NdM+K y NdM-K', () => {
    expect(parseDice('1d20')).toEqual({ count: 1, sides: 20, modifier: 0 })
    expect(parseDice('2d6+3')).toEqual({ count: 2, sides: 6, modifier: 3 })
    expect(parseDice(' 1d8-1 ')).toEqual({ count: 1, sides: 8, modifier: -1 })
  })

  it('rechaza formas invalidas', () => {
    expect(() => parseDice('d20')).toThrow(SyntaxError)
    expect(() => parseDice('1d20+')).toThrow(SyntaxError)
    expect(() => parseDice('0d6')).toThrow(RangeError)
    expect(() => parseDice('1d1')).toThrow(RangeError)
  })
})

describe('rollDice', () => {
  it('suma los dados y el modificador y registra la fuente', () => {
    const roll = rollDice('2d6+3', recordedRandom([4, 5], 'physical'))

    expect(roll).toEqual({ spec: '2d6+3', rolls: [4, 5], modifier: 3, total: 12, source: 'physical' })
  })

  it('es reproducible con semilla', () => {
    expect(rollDice('3d8', seededRandom(1))).toEqual(rollDice('3d8', seededRandom(1)))
  })
})

describe('rollD20', () => {
  it('tira un solo dado sin ventaja ni desventaja', () => {
    expect(rollD20(recordedRandom([17]))).toEqual({ rolls: [17], result: 17, source: 'physical' })
  })

  it('con ventaja se queda el mayor; con desventaja el menor', () => {
    expect(rollD20(recordedRandom([6, 12]), { advantage: true }).result).toBe(12)
    expect(rollD20(recordedRandom([11, 7]), { disadvantage: true }).result).toBe(7)
  })

  it('ventaja y desventaja juntas se anulan', () => {
    const roll = rollD20(recordedRandom([9]), { advantage: true, disadvantage: true })

    expect(roll.rolls).toEqual([9])
    expect(roll.result).toBe(9)
  })
})
