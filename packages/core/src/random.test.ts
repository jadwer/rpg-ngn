import { describe, expect, it } from 'vitest'
import { recordedRandom, seededRandom, webCryptoRandom } from './random.js'

describe('seededRandom', () => {
  it('es determinista para la misma semilla y distinto entre semillas', () => {
    const a = seededRandom(42)
    const b = seededRandom(42)
    const c = seededRandom(43)
    const seqA = Array.from({ length: 10 }, () => a.nextInt(20))
    const seqB = Array.from({ length: 10 }, () => b.nextInt(20))
    const seqC = Array.from({ length: 10 }, () => c.nextInt(20))

    expect(seqA).toEqual(seqB)
    expect(seqA).not.toEqual(seqC)
    expect(a.describe()).toBe('seed:42')
  })

  it('se mantiene dentro del rango', () => {
    const rng = seededRandom(7)
    for (let i = 0; i < 2000; i += 1) {
      const v = rng.nextInt(6)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(6)
    }
  })

  it('rechaza limites invalidos', () => {
    expect(() => seededRandom(1).nextInt(0)).toThrow(RangeError)
    expect(() => seededRandom(1).nextInt(2.5)).toThrow(RangeError)
  })
})

describe('recordedRandom', () => {
  it('devuelve las caras registradas en orden, como indices', () => {
    const rng = recordedRandom([20, 1, 6])

    expect(rng.nextInt(20)).toBe(19)
    expect(rng.nextInt(20)).toBe(0)
    expect(rng.nextInt(6)).toBe(5)
    expect(rng.describe()).toBe('physical')
  })

  it('falla si se piden mas valores o una cara que no cabe en el dado', () => {
    expect(() => recordedRandom([]).nextInt(20)).toThrow(/mas valores/)
    expect(() => recordedRandom([7]).nextInt(6)).toThrow(/no cabe/)
    expect(() => recordedRandom([0]).nextInt(6)).toThrow(/no cabe/)
    expect(() => recordedRandom([1]).nextInt(0)).toThrow(RangeError)
  })

  it('acepta una etiqueta de fuente propia', () => {
    expect(recordedRandom([3], 'mesa:dados-de-jaz').describe()).toBe('mesa:dados-de-jaz')
  })
})

describe('webCryptoRandom', () => {
  it('usa globalThis.crypto y respeta el rango', () => {
    const rng = webCryptoRandom()
    for (let i = 0; i < 500; i += 1) {
      const v = rng.nextInt(20)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(20)
    }
    expect(rng.describe()).toBe('csprng:webcrypto')
    expect(() => rng.nextInt(0)).toThrow(RangeError)
  })

  it('descarta valores fuera del limite de rechazo', () => {
    const original = globalThis.crypto
    let calls = 0
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: {
        getRandomValues<T extends ArrayBufferView>(array: T): T {
          calls += 1
          // Primero un valor en la zona de rechazo para 20 caras, luego uno valido.
          ;(array as unknown as Uint32Array)[0] = calls === 1 ? 4294967295 : 21
          return array
        },
      },
    })
    try {
      expect(webCryptoRandom().nextInt(20)).toBe(1)
      expect(calls).toBe(2)
    } finally {
      Object.defineProperty(globalThis, 'crypto', { configurable: true, value: original })
    }
  })

  it('falla al construirse si no hay Web Crypto', () => {
    const original = globalThis.crypto
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: undefined })
    try {
      expect(() => webCryptoRandom()).toThrow(/getRandomValues/)
    } finally {
      Object.defineProperty(globalThis, 'crypto', { configurable: true, value: original })
    }
  })
})
