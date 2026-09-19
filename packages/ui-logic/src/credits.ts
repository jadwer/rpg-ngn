import type { CreditBalance, CreditPack } from '@rpg-ngn/api-client'

/**
 * Creditos de prepago: como se presentan los paquetes y el saldo.
 *
 * Se venden turnos, no tiempo ni sesiones, porque es lo unico que
 * correlaciona con el coste. La pantalla habla de turnos y de partidas, no
 * de tokens: al jugador no le dice nada un numero de tokens.
 */

/** Precio con su moneda, desde la unidad menor que manda la API. */
export function packPrice(pack: Pick<CreditPack, 'amount' | 'currency'>): string {
  const amount = pack.amount / 100
  const entero = Number.isInteger(amount)
  return `${pack.currency === 'usd' ? '$' : ''}${amount.toFixed(entero ? 0 : 2)} ${pack.currency.toUpperCase()}`
}

/**
 * Cuantas partidas da un paquete, en redondo.
 *
 * Una sesion de dos horas con cuatro jugadores lleva entre 15 y 20 turnos
 * (medido el 2026-09-19). Se usa el numero alto para no prometer de mas: es
 * peor quedarse corto que sorprender con mas partidas de las dichas.
 */
const TURNS_PER_SESSION = 20

export function packSessions(pack: Pick<CreditPack, 'turns'>): number {
  return Math.floor(pack.turns / TURNS_PER_SESSION)
}

/** Lo que se lee bajo el precio: que da el paquete, en partidas. */
export function packValue(pack: Pick<CreditPack, 'turns' | 'available'>): string {
  if (!pack.available || pack.turns === 0) return 'Pronto'
  const sesiones = packSessions(pack)
  if (sesiones < 1) return `${pack.turns} turnos`
  return `${pack.turns} turnos, unas ${sesiones} ${sesiones === 1 ? 'partida' : 'partidas'}`
}

/** Los que se pueden comprar hoy, primero los mas baratos. */
export function buyablePacks(packs: readonly CreditPack[]): CreditPack[] {
  return packs.filter((p) => p.available && p.turns > 0).sort((a, b) => a.amount - b.amount)
}

/** Los que se anuncian pero todavia no se venden. */
export function comingSoonPacks(packs: readonly CreditPack[]): CreditPack[] {
  return packs.filter((p) => !p.available).sort((a, b) => a.amount - b.amount)
}

/** El saldo, dicho en lo que le importa a quien juega. */
export function balanceText(balance: CreditBalance): string {
  if (balance.remainingTurns === 0) return 'Te quedaste sin turnos. Recarga para seguir jugando.'
  const sesiones = Math.floor(balance.remainingTurns / TURNS_PER_SESSION)
  const turnos = `${balance.remainingTurns} ${balance.remainingTurns === 1 ? 'turno' : 'turnos'}`
  if (sesiones < 1) return `Te quedan ${turnos}: para terminar la partida que tienes empezada.`
  return `Te quedan ${turnos}, unas ${sesiones} ${sesiones === 1 ? 'partida' : 'partidas'}.`
}

/** Si conviene avisarle de que se le acaba. */
export function lowBalance(balance: CreditBalance): boolean {
  return balance.remainingTurns > 0 && balance.remainingTurns < TURNS_PER_SESSION
}
