import type { TurnBlock } from './blocks.js'

/**
 * Desde donde leer en voz alta al pulsar el boton de narracion de la
 * cabecera: el primer bloque despues de la ultima declaracion de un
 * jugador, que es donde empieza lo que narro el director este turno. Sin
 * declaraciones (la apertura), desde el principio. Null si no hay nada.
 */
export function latestNarrationStart(blocks: readonly TurnBlock[]): string | null {
  let lastPlayer = -1
  blocks.forEach((b, i) => {
    if (b.kind === 'dialogue' && b.speaker.ref.startsWith('character:')) lastPlayer = i
  })
  const from = blocks.slice(lastPlayer + 1).find((b) => b.kind === 'narration' || b.kind === 'dialogue')
  return from?.id ?? blocks[0]?.id ?? null
}

/** Lo que dice `GET v1/tables/{table}/dm`. */
export interface TableDmInfo {
  source: 'own' | 'quota' | 'free' | 'none'
  kind: string | null
  model: string | null
  firstTurnsLeft: number | null
}

/** Nombre legible de un modelo ("claude-sonnet-5" -> "Claude Sonnet 5"). */
export function modelLabel(model: string | null): string {
  if (!model) return 'el director de la mesa'
  const base = model.replace(/-\d{8}$/, '')
  return base
    .split('-')
    .map((p) => (/^\d/.test(p) ? p.replace(/-/g, '.') : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(' ')
    .replace(/(\d) (\d)/g, '$1.$2')
}

/**
 * Con que narra la mesa y quien lo paga, en una frase. Existe porque elegir
 * "Anthropic" no decia si era la clave del dueño o la del servidor.
 */
export function tableDmText(info: TableDmInfo): string {
  const who = modelLabel(info.model)
  switch (info.source) {
    case 'own':
      return `Narra ${who} con tu propia clave: no gasta turnos del cupo.`
    case 'free':
      return info.kind === 'scripted' ? 'Narra un director con guion, sin costo.' : `Narra ${who} en un servidor propio, sin costo.`
    case 'none':
      return 'Esta mesa no tiene director disponible: revisa los ajustes.'
    case 'quota':
      if (info.firstTurnsLeft && info.firstTurnsLeft > 0) {
        return `Narra ${who} con tu cupo. Te ${info.firstTurnsLeft === 1 ? 'queda 1 turno' : `quedan ${info.firstTurnsLeft} turnos`} con este modelo; después, uno más económico. Con tu propia clave narra siempre el que elijas.`
      }
      return `Narra ${who} con tu cupo. Con tu propia clave narra el modelo que elijas.`
  }
}

/**
 * Inercia del dado de mantener presionado (Gabino, 23-09): al soltar, el
 * dado sigue girando al menos 1 s y hasta 5 s, mas cuanto mas se mantuvo.
 * El resultado no depende de esto: se tira con el generador al terminar.
 */
export const HOLD_RELEASE_MIN_MS = 1000
export const HOLD_RELEASE_MAX_MS = 5000

export function holdReleaseMs(heldMs: number): number {
  return Math.round(Math.min(HOLD_RELEASE_MAX_MS, Math.max(HOLD_RELEASE_MIN_MS, HOLD_RELEASE_MIN_MS + Math.max(0, heldMs))))
}

/**
 * Los intervalos entre caras mientras el dado frena: empiezan rapidos y se
 * alargan hasta sumar la duracion, como un dado que pierde impulso.
 */
export function settleSchedule(totalMs: number, first = 50, growth = 1.18): number[] {
  const steps: number[] = []
  let elapsed = 0
  let step = first
  while (elapsed + step < totalMs) {
    steps.push(Math.round(step))
    elapsed += step
    step *= growth
  }
  if (totalMs - elapsed > 0) steps.push(Math.round(totalMs - elapsed))
  return steps
}
