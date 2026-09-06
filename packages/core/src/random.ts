/**
 * Fuente de azar inyectable (IA3 de docs/10). core no importa nada de
 * plataforma: las implementaciones que necesitan crypto de Node viven fuera.
 *
 * `describe()` es lo que se registra en `resolved.source` de cada tirada:
 * `seed:42` es reproducible en replay; `csprng:webcrypto` solo es legible.
 */
export interface RandomSource {
  /** Entero uniforme en [0, maxExclusive). */
  nextInt(maxExclusive: number): number
  describe(): string
}

function assertBound(maxExclusive: number): void {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
    throw new RangeError(`nextInt: el limite debe ser un entero positivo, llego ${String(maxExclusive)}`)
  }
}

/**
 * PRNG determinista (mulberry32). Para tests, replays y tiradas verificables
 * con semilla registrada. No es criptografico.
 */
export function seededRandom(seed: number): RandomSource {
  let state = seed >>> 0
  return {
    nextInt(maxExclusive) {
      assertBound(maxExclusive)
      state = (state + 0x6d2b79f5) >>> 0
      let t = state
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      const unit = ((t ^ (t >>> 14)) >>> 0) / 4294967296
      return Math.floor(unit * maxExclusive)
    },
    describe: () => `seed:${seed}`,
  }
}

/**
 * Devuelve valores fijados de antemano. Sirve para reproducir una tirada
 * fisica (la mesa tiro dados reales y el DM tecleo el numero) o para tests.
 * Los valores son resultados de dado (1..sides), no indices.
 */
export function recordedRandom(faces: readonly number[], source = 'physical'): RandomSource {
  let index = 0
  return {
    nextInt(maxExclusive) {
      assertBound(maxExclusive)
      const face = faces[index]
      if (face === undefined) {
        throw new RangeError(`recordedRandom: se pidieron mas valores (${index + 1}) de los registrados (${faces.length})`)
      }
      if (!Number.isInteger(face) || face < 1 || face > maxExclusive) {
        throw new RangeError(`recordedRandom: el valor ${face} no cabe en un dado de ${maxExclusive} caras`)
      }
      index += 1
      return face - 1
    },
    describe: () => source,
  }
}

/**
 * CSPRNG sobre Web Crypto, disponible en Node 22, navegadores y Expo con
 * polyfill. No se importa nada: si `globalThis.crypto` no existe, falla al
 * construirse y no en mitad de una tirada.
 */
export function webCryptoRandom(): RandomSource {
  const crypto = (globalThis as { crypto?: { getRandomValues<T extends ArrayBufferView>(array: T): T } }).crypto
  if (!crypto || typeof crypto.getRandomValues !== 'function') {
    throw new Error('webCryptoRandom: globalThis.crypto.getRandomValues no esta disponible en este entorno')
  }
  const buffer = new Uint32Array(1)
  return {
    nextInt(maxExclusive) {
      assertBound(maxExclusive)
      // Rechazo para evitar sesgo por modulo.
      const limit = 4294967296 - (4294967296 % maxExclusive)
      let value: number
      do {
        crypto.getRandomValues(buffer)
        value = buffer[0]!
      } while (value >= limit)
      return value % maxExclusive
    },
    describe: () => 'csprng:webcrypto',
  }
}
