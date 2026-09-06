import { describe, expect, it } from 'vitest'
import { adjust, clamp, isDepleted, resource, restore, spend } from './resource.js'

describe('resource', () => {
  it('se crea lleno por defecto y acota el valor inicial', () => {
    expect(resource(12)).toEqual({ current: 12, max: 12 })
    expect(resource(12, 40)).toEqual({ current: 12, max: 12 })
    expect(resource(12, -3)).toEqual({ current: 0, max: 12 })
    expect(() => resource(-1)).toThrow(RangeError)
    expect(() => resource(1.5)).toThrow(RangeError)
  })

  it('gasta y restaura sin salirse de [0, max]', () => {
    const hp = resource(10)
    expect(spend(hp, 4)).toEqual({ current: 6, max: 10 })
    expect(spend(hp, 40)).toEqual({ current: 0, max: 10 })
    expect(restore(spend(hp, 4), 2)).toEqual({ current: 8, max: 10 })
    expect(restore(hp, 5)).toEqual({ current: 10, max: 10 })
  })

  it('adjust usa el signo', () => {
    const hp = resource(10, 5)
    expect(adjust(hp, -3)).toEqual({ current: 2, max: 10 })
    expect(adjust(hp, 3)).toEqual({ current: 8, max: 10 })
    expect(adjust(hp, 0)).toEqual(hp)
  })

  it('rechaza cantidades negativas o no enteras', () => {
    expect(() => spend(resource(10), -1)).toThrow(RangeError)
    expect(() => restore(resource(10), 0.5)).toThrow(RangeError)
  })

  it('isDepleted y clamp', () => {
    expect(isDepleted(resource(10, 0))).toBe(true)
    expect(isDepleted(resource(10, 1))).toBe(false)
    expect(clamp(5, 0, 3)).toBe(3)
    expect(clamp(-5, 0, 3)).toBe(0)
  })
})
