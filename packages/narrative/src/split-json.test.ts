import { describe, expect, it } from 'vitest'
import { splitJsonObjects } from './model-dm.js'

/**
 * Lo que rompio la apertura de la mesa "cinco personas" el 19-09: Haiku
 * devolvio los bloques uno detras de otro en la misma linea, la linea no
 * parseaba como un solo JSON y el turno fallo "sin bloques" con una
 * narracion perfecta dentro.
 */
describe('splitJsonObjects', () => {
  it('parte varios objetos seguidos en la misma linea', () => {
    const line = '{"kind":"block","block":{"type":"narration","text":"Llueve."}} {"kind":"block","block":{"type":"narration","text":"Truena."}}{"kind":"addressed","characterIds":["zahira"]}'
    const pieces = splitJsonObjects(line)
    expect(pieces).toHaveLength(3)
    expect(JSON.parse(pieces[2]!)).toEqual({ kind: 'addressed', characterIds: ['zahira'] })
  })

  it('no se deja engañar por llaves dentro de cadenas ni por escapes', () => {
    const line = '{"kind":"block","block":{"type":"dialogue","speaker":"Tomás","text":"Dijo \\"} {\\" y se fue."}} {"kind":"addressed","characterIds":[]}'
    const pieces = splitJsonObjects(line)
    expect(pieces).toHaveLength(2)
    expect((JSON.parse(pieces[0]!) as { block: { text: string } }).block.text).toBe('Dijo "} {" y se fue.')
  })

  it('una linea con un solo valor sale tal cual, y una sin JSON tambien', () => {
    expect(splitJsonObjects('{"kind":"addressed","characterIds":[]}')).toEqual(['{"kind":"addressed","characterIds":[]}'])
    expect(splitJsonObjects('prosa suelta')).toEqual(['prosa suelta'])
  })
})
