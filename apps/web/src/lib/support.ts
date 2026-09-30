import { language } from '@rpg-ngn/i18n'

/** Fecha completa de un reporte o mensaje ("30 sept 2026, 17:05"); vacio si no hay. */
export function absoluteDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(language() === 'en' ? 'en-US' : 'es-MX', { dateStyle: 'medium', timeStyle: 'short' })
}
