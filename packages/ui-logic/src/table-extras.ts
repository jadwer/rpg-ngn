import { t } from '@rpg-ngn/i18n'
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

/** Lo que dice `GET v1/tables/{table}/gm`. */
export interface TableGmInfo {
  source: 'own' | 'quota' | 'free' | 'none'
  kind: string | null
  model: string | null
  firstTurnsLeft: number | null
  /** El escalon del narrador cuando paga el cupo: comprado, cuenta nueva, bendicion o gratis. */
  tier?: 'paid' | 'first' | 'blessing' | 'free' | null
}

/** Nombre legible de un modelo ("claude-sonnet-5" -> "Claude Sonnet 5"). */
export function modelLabel(model: string | null): string {
  if (!model) return t('table.gm.fallbackModel')
  const base = model.replace(/-\d{8}$/, '')
  return base
    .split('-')
    .map((p) => (/^\d/.test(p) ? p.replace(/-/g, '.') : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(' ')
    .replace(/(\d) (\d)/g, '$1.$2')
    .replace(/^Deepseek\b/, 'DeepSeek')
    .replace(/^Gpt\b/, 'GPT')
}

/**
 * Con que narra la mesa y quien lo paga, en una frase. Existe porque elegir
 * "Anthropic" no decia si era la clave del dueño o la del servidor.
 */
export function tableGmText(info: TableGmInfo): string {
  const who = modelLabel(info.model)
  switch (info.source) {
    case 'own':
      return t('table.gm.own', { who })
    case 'free':
      return info.kind === 'scripted' ? t('table.gm.scripted') : t('table.gm.selfHosted', { who })
    case 'none':
      return t('table.gm.none')
    case 'quota':
      if (info.firstTurnsLeft && info.firstTurnsLeft > 0) {
        return info.firstTurnsLeft === 1 ? t('table.gm.quotaFirstOne', { who }) : t('table.gm.quotaFirstMany', { who, count: info.firstTurnsLeft })
      }
      return t('table.gm.quota', { who })
  }
}

export interface NarratorBadge {
  /** "Narrador maestro", "Narrador de oficio"... */
  label: string
  /** La letra chica: con que modelo narra (aviso legal, 21-10). */
  detail: string
  /** El escalon, para el estilo de la etiqueta. */
  level: 'master' | 'craft' | 'apprentice' | 'own'
  /** Hay un narrador mejor al alcance: el anfitrion ve "Mejora tu narrador". */
  canUpgrade: boolean
}

/**
 * La etiqueta del narrador de la mesa (decidido con Gabino el 22-10): dice
 * con que modelo narra, que es aviso obligado, y a la vez enseña que hay un
 * escalon mejor. Null si no aplica (GM con guion o sin GM).
 */
export function narratorBadge(info: TableGmInfo): NarratorBadge | null {
  const who = modelLabel(info.model)
  if (info.source === 'own' || (info.source === 'free' && info.kind !== 'scripted')) {
    return { label: t('table.narrator.own'), detail: t('table.narrator.ownDetail', { who }), level: 'own', canUpgrade: false }
  }
  if (info.source !== 'quota') return null
  const detail = t('table.narrator.detail', { who })
  switch (info.tier) {
    case 'paid':
    case 'first':
      return { label: t('table.narrator.master'), detail, level: 'master', canUpgrade: false }
    case 'blessing':
      return { label: t('table.narrator.craft'), detail, level: 'craft', canUpgrade: true }
    default:
      return { label: t('table.narrator.apprentice'), detail, level: 'apprentice', canUpgrade: true }
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
