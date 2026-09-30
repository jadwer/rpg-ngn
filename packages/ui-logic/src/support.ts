import { language, t } from '@rpg-ngn/i18n'
import type { SupportStatus } from '@rpg-ngn/api-client'

/**
 * Reportar un problema (soporte): el nombre de cada estado y el contexto que
 * acompaña al reporte. Sin `window` ni React: la web le pasa la ruta y el
 * agente del navegador, y la app haria lo mismo con lo suyo.
 */

/** Largo minimo del primer mensaje y de una respuesta, igual que la API. */
export const SUPPORT_MESSAGE_MIN = 10
export const SUPPORT_REPLY_MIN = 2
export const SUPPORT_MESSAGE_MAX = 5000
export const SUPPORT_SUBJECT_MAX = 160

/** Tope de cada valor del contexto: un agente de navegador puede ser larguisimo. */
const CONTEXT_VALUE_MAX = 300

/** "Abierto", "En revision"... en el idioma de la interfaz; un estado desconocido sale tal cual. */
export function supportStatusLabel(status: SupportStatus | string): string {
  switch (status) {
    case 'open':
      return t('support.status.open')
    case 'in_progress':
      return t('support.status.in_progress')
    case 'waiting_user':
      return t('support.status.waiting_user')
    case 'resolved':
      return t('support.status.resolved')
    default:
      return status
  }
}

export interface SupportContextInput {
  /** La ruta donde se abrio el reporte (`/mesas/12`). */
  path: string
  /** `navigator.userAgent`; ui-logic no toca el navegador. */
  userAgent?: string | null | undefined
  /** Por defecto `web`. */
  app?: string | undefined
  /** Lo demas que el cliente quiera sumar; los vacios se descartan. */
  [key: string]: string | null | undefined
}

/**
 * El `context` que viaja con el reporte: de que cliente, desde que pantalla,
 * en que idioma y con que navegador. Solo cadenas, recortadas, y sin vacios.
 */
export function supportContext(extra: SupportContextInput): Record<string, string> {
  const { path, userAgent, app, ...rest } = extra
  const context: Record<string, string> = { app: app?.trim() || 'web', path, language: language() }
  if (userAgent?.trim()) context['userAgent'] = userAgent.trim()
  for (const [key, value] of Object.entries(rest)) {
    if (typeof value === 'string' && value.trim()) context[key] = value.trim()
  }
  for (const key of Object.keys(context)) context[key] = context[key]!.slice(0, CONTEXT_VALUE_MAX)
  return context
}

/**
 * A que apunta un reporte abierto desde la mesa: el turno en curso si lo hay
 * (lo mas preciso), si no la mesa. Sin mesa o sin adjuntar, nada.
 */
export function supportAbout(table: { tableId: string | number; turnId?: string | number | null | undefined } | null, attach: boolean): { type: 'table' | 'turn'; id: string } | undefined {
  if (!table || !attach) return undefined
  if (table.turnId !== null && table.turnId !== undefined && String(table.turnId) !== '') return { type: 'turn', id: String(table.turnId) }
  return { type: 'table', id: String(table.tableId) }
}

/** Fecha completa de un reporte o mensaje ("30 sept 2026, 17:05") en el idioma de la interfaz; vacio si no hay. */
export function supportDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(language() === 'en' ? 'en-US' : 'es-MX', { dateStyle: 'medium', timeStyle: 'short' })
}
