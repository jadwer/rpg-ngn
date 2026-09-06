import { describe, expect, it } from 'vitest'
import { stableStringify } from './serialize.js'

describe('stableStringify', () => {
  it('ordena claves en todos los niveles y conserva el orden de los arrays', () => {
    const a = stableStringify({ b: 1, a: { d: [3, 1, 2], c: null } })
    const b = stableStringify({ a: { c: null, d: [3, 1, 2] }, b: 1 })

    expect(a).toBe(b)
    expect(a).toBe('{\n  "a": {\n    "c": null,\n    "d": [\n      3,\n      1,\n      2\n    ]\n  },\n  "b": 1\n}\n')
  })

  it('omite undefined en objetos y lo vuelve null en arrays', () => {
    expect(stableStringify({ a: undefined, b: 2 }, 0)).toBe('{"b":2}\n')
    expect(stableStringify([1, undefined, 'x'], 0)).toBe('[1,null,"x"]\n')
  })

  it('serializa primitivos', () => {
    expect(stableStringify('hola', 0)).toBe('"hola"\n')
    expect(stableStringify(3, 0)).toBe('3\n')
  })
})
