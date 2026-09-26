import { describe, expect, it } from 'vitest'
import { allFacesOf, diceFaces, droppedFace, facesOf, keptFace } from './dice.js'

describe('diceFaces', () => {
  it('con dos d20 solo uno cuenta y el otro se atenua; con 2d6 cuentan los dos', () => {
    expect(droppedFace('1d20', 17, [17, 3])).toBe(1)
    expect(droppedFace('1d20', 3, [17, 3])).toBe(0)
    expect(droppedFace('1d20+2', 19, [17, 3])).toBe(1)
    expect(droppedFace('2d6', 8, [3, 5])).toBeNull()
    expect(droppedFace('1d20', 14, [14])).toBeNull()
  })

  it('todas las caras de un dado, para precargarlas; nada si no hay lamina', () => {
    expect(allFacesOf('1d20')).toHaveLength(20)
    expect(allFacesOf('2d6+1').map((f) => f.asset).slice(0, 2)).toEqual(['d6-1', 'd6-2'])
    expect(allFacesOf('1d12')).toHaveLength(12)
    expect(allFacesOf('1d100')).toEqual([])
    expect(allFacesOf('nada')).toEqual([])
  })

  it('un dado solo sin modificador se pinta con el total', () => {
    expect(diceFaces('1d20', 14)).toEqual([{ sides: 20, value: 14, asset: 'd20-14' }])
    expect(diceFaces('1d6', 6)).toEqual([{ sides: 6, value: 6, asset: 'd6-6' }])
  })

  it('con los dados sueltos pinta cada uno, aunque haya modificador o varios dados', () => {
    expect(diceFaces('2d6+1', 8, [1, 6]).map((f) => f.asset)).toEqual(['d6-1', 'd6-6'])
    expect(diceFaces('1d20', 17, [17, 3]).map((f) => f.value)).toEqual([17, 3])
    expect(diceFaces('1d8+2', 7, [5]).map((f) => f.asset)).toEqual(['d8-5'])
  })

  it('sin dados sueltos, un total con modificador o de varios dados no se puede pintar', () => {
    expect(diceFaces('1d20+3', 17)).toEqual([])
    expect(diceFaces('2d6', 7)).toEqual([])
  })

  it('ignora dados sin lamina y valores fuera de rango', () => {
    expect(diceFaces('1d12', 7).map((f) => f.asset)).toEqual(['d12-7'])
    expect(diceFaces('1d100', 42, [42])).toEqual([])
    expect(diceFaces('1d20', 21)).toEqual([])
    expect(diceFaces('1d6', 0, [0, 3]).map((f) => f.value)).toEqual([3])
    expect(diceFaces('dado', 3)).toEqual([])
  })

  it('con ventaja o desventaja señala cual de los dos dados cuenta', () => {
    const base = { die: '1d20', result: 17, rolls: [17, 3] }
    expect(keptFace({ ...base, advantage: 'advantage' })).toBe(0)
    expect(keptFace({ ...base, result: 3, advantage: 'disadvantage' })).toBe(1)
    expect(keptFace({ ...base, advantage: null })).toBeNull()
    expect(keptFace({ die: '1d20', result: 9, rolls: null, advantage: 'advantage' })).toBeNull()
    expect(facesOf({ die: '1d20', result: 9, rolls: null })).toHaveLength(1)
  })
})
