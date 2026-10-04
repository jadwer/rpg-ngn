import { t } from '@rpg-ngn/i18n'
import type { EndingBlock } from './blocks.js'

/**
 * El reloj de la historia en los clientes (docs/26, H1): el largo de sesion
 * de la mesa, la linea "Turno 5 de 8" y el titulo de la pantalla de fin. El
 * tramo y el cierre los decide el motor; aqui solo se pinta.
 */

export type SessionLength = 'corta' | 'media' | 'larga' | 'libre'

export const SESSION_LENGTHS: readonly SessionLength[] = ['corta', 'media', 'larga', 'libre']

/** El reloj de la mesa que manda la API en el estado; null si juega libre. */
export interface TablePacing {
  length: SessionLength
  turn: number
  total: number
  wrap: boolean
}

/**
 * El largo de la mesa (`settings.pacing.length`). Sin la clave es `libre`:
 * las mesas de antes del 04-10 no cambian.
 */
export function sessionLengthOf(settings: Record<string, unknown> | null | undefined): SessionLength {
  const pacing = settings?.['pacing']
  const length = pacing && typeof pacing === 'object' ? (pacing as { length?: unknown }).length : undefined
  return SESSION_LENGTHS.includes(length as SessionLength) ? (length as SessionLength) : 'libre'
}

export function withSessionLength(settings: Record<string, unknown> | null | undefined, length: SessionLength): Record<string, unknown> {
  return { ...(settings ?? {}), pacing: { length } }
}

/** Etiqueta de cada largo para el selector de la mesa. */
export function sessionLengthLabel(length: SessionLength): string {
  switch (length) {
    case 'corta':
      return t('ending.length.corta')
    case 'media':
      return t('ending.length.media')
    case 'larga':
      return t('ending.length.larga')
    case 'libre':
      return t('ending.length.libre')
  }
}

/** "Turno 5 de 8", o "Último turno". Null sin reloj o sin turno abierto. */
export function pacingLine(pacing: TablePacing | null | undefined): string | null {
  if (!pacing || pacing.turn <= 0) return null
  if (pacing.wrap || pacing.turn >= pacing.total) return t('ending.lastTurn')
  return t('ending.turnOf', { turn: pacing.turn, total: pacing.total })
}

/** El titulo grande de la pantalla de fin. */
export function endingTitle(block: Pick<EndingBlock, 'scope' | 'session' | 'title'>): string {
  if (block.title) return block.title
  if (block.scope === 'story') return t('ending.theEnd')
  const number = Number.parseInt(block.session, 10)
  if (block.scope === 'chapter') return Number.isFinite(number) ? t('ending.chapterEnd', { n: number }) : t('ending.chapterEndPlain')
  return Number.isFinite(number) ? t('ending.sessionEnd', { n: number }) : t('ending.sessionEndPlain')
}
