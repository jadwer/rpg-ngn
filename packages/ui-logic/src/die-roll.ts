import { parseDice } from '@rpg-ngn/core'
import { holdReleaseMs, settleSchedule } from './table-extras.js'

/**
 * La tirada de un dado en pantalla, sin React y sin saber como se pinta.
 *
 * Tres capas que no se conocen (Gabino, 25-09): el DM PIDE la tirada, el
 * servidor la RESUELVE y el cliente la PRESENTA. Esto es lo unico que la
 * presentacion comparte: mientras el dado frena van pasando caras al azar y,
 * cuando termina de frenar Y el numero ya llego, aterriza en el. **El
 * resultado va primero y la animacion despues**: por eso mañana un dado 3D
 * con fisicas puede sustituir a los sprites sin tocar motor ni API, porque
 * la fisica se dirige al numero ya decidido, nunca al reves.
 *
 * Los temporizadores y el azar de las caras se inyectan: asi se prueba con
 * reloj falso y sirve igual en la web y en React Native. Las caras que giran
 * salen de `Math.random` a proposito: no son la tirada, son el efecto, y en
 * la app compilada (Hermes) no hay `crypto` (APK v2, 25-09).
 */

export type DieRollPhase = 'idle' | 'holding' | 'settling' | 'landed'

export interface DieFaceRange {
  min: number
  max: number
}

/** Que caras puede enseñar un dado ("2d6": de 2 a 12; el modificador no se ve girar). */
export function faceRange(die: string): DieFaceRange {
  try {
    const { count, sides } = parseDice(die)
    return { min: count, max: count * sides }
  } catch {
    return { min: 1, max: 20 }
  }
}

/** Caras del dado ("2d6+1": 6); un dado invalido se trata como d20. */
export function sidesOf(die: string): number {
  try {
    return parseDice(die).sides
  } catch {
    return 20
  }
}

/** Una cara al azar dentro del rango; solo para el efecto de girar. */
export function spinFace(range: DieFaceRange, random: () => number = Math.random): number {
  return range.min + Math.floor(random() * (range.max - range.min + 1))
}

/** Cuanto frena y en que pasos, segun cuanto se mantuvo presionado. */
export function releasePlan(heldMs: number): { totalMs: number; steps: number[] } {
  const totalMs = holdReleaseMs(heldMs)
  return { totalMs, steps: settleSchedule(totalMs) }
}

export interface DieRollTimers {
  setTimeout: (fn: () => void, ms: number) => unknown
  clearTimeout: (handle: unknown) => void
}

export interface DieRollOptions {
  die: string
  /** Cuanto se mantuvo presionado; decide cuanto frena. */
  heldMs: number
  /** El numero de verdad. Con el servidor, la peticion sale al soltar. */
  resolve: () => Promise<number>
  /** Una cara mas del efecto de frenar. */
  onFace: (face: number) => void
  /** El numero ya llego (puede ser antes de terminar de frenar): un dado fisico usa esto para dirigirse a el. */
  onResolved?: ((result: number) => void) | undefined
  /** Termino de frenar y el numero esta: la cara final. */
  onLanded: (result: number) => void
  onFailed: (error: unknown) => void
  timers?: DieRollTimers | undefined
  random?: (() => number) | undefined
}

/**
 * Orquesta una tirada desde que se suelta el dado. Devuelve la funcion que
 * la cancela (desmontar el componente): no vuelve a llamar a nada despues.
 */
export function runDieRoll(options: DieRollOptions): () => void {
  const timers: DieRollTimers = options.timers ?? { setTimeout: (fn, ms) => setTimeout(fn, ms), clearTimeout: (h) => clearTimeout(h as ReturnType<typeof setTimeout>) }
  const range = faceRange(options.die)
  const handles: unknown[] = []
  let cancelled = false
  let settled = false
  let result: number | null = null
  let failed = false

  const land = () => {
    if (cancelled || !settled || result === null) return
    options.onLanded(result)
  }

  // La peticion sale al soltar, en paralelo con el frenado: lo normal es que
  // el numero llegue antes de que el dado pare y nadie note la espera.
  options
    .resolve()
    .then((value) => {
      if (cancelled) return
      result = value
      options.onResolved?.(value)
      land()
    })
    .catch((error: unknown) => {
      if (cancelled) return
      failed = true
      options.onFailed(error)
    })

  let at = 0
  for (const step of releasePlan(options.heldMs).steps) {
    at += step
    handles.push(timers.setTimeout(() => {
      if (cancelled || failed) return
      options.onFace(spinFace(range, options.random))
    }, at))
  }
  handles.push(timers.setTimeout(() => {
    if (cancelled || failed) return
    settled = true
    land()
  }, at))

  return () => {
    cancelled = true
    for (const handle of handles) timers.clearTimeout(handle)
  }
}
