import { t } from '@rpg-ngn/i18n'
import type { BlessingState } from '@rpg-ngn/api-client'

/**
 * Lo que dice el aviso diario de la Bendicion del bardo sobre los dias que
 * quedan: los que faltan por recoger contando hoy (la API ya descuenta hoy si
 * se recogio), o que hoy es el ultimo.
 */
export function blessingDaysText(state: Pick<BlessingState, 'daysLeft' | 'claimable'>): string {
  if (state.claimable && state.daysLeft <= 1) return t('blessing.lastDay')
  return state.daysLeft === 1 ? t('blessing.daysLeftOne') : t('blessing.daysLeftMany', { n: state.daysLeft })
}

/** Si el aviso a pantalla completa debe aparecer: hay Bendicion y hoy no se ha recogido. */
export function blessingDue(state: Pick<BlessingState, 'active' | 'claimable'> | null | undefined): boolean {
  return !!state && state.active && state.claimable
}
