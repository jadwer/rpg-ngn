import type { CreditBalance, CreditPack } from '@rpg-ngn/api-client'

/**
 * Creditos de prepago: como se presentan los paquetes y el saldo.
 *
 * Se venden turnos, no tiempo ni sesiones, porque es lo unico que
 * correlaciona con el coste. La pantalla habla de turnos y de partidas, no
 * de tokens: al jugador no le dice nada un numero de tokens.
 */

/** Precio con su moneda, desde la unidad menor que manda la API. */
function money(amountMinor: number, currency: string): string {
  const amount = amountMinor / 100
  const entero = Number.isInteger(amount)
  const sign = currency === 'usd' || currency === 'mxn' ? '$' : ''
  return `${sign}${amount.toFixed(entero ? 0 : 2)} ${currency.toUpperCase()}`
}

/**
 * El precio del paquete, y entre parentesis lo que se cobra si es en otra
 * moneda: "$2 USD ($37 MXN)" (Gabino, 26-09: precio en dolares, cobro en
 * pesos al tipo del dia).
 */
export function packPrice(pack: Pick<CreditPack, 'amount' | 'currency' | 'charge'>): string {
  const price = money(pack.amount, pack.currency)
  const charge = pack.charge
  return charge && charge.currency !== pack.currency ? `${price} (${money(charge.amount, charge.currency)})` : price
}

/** Lo que de verdad se cobra, para el boton de pagar: "$37 MXN". */
export function packCharge(pack: Pick<CreditPack, 'amount' | 'currency' | 'charge'>): string {
  return pack.charge ? money(pack.charge.amount, pack.charge.currency) : money(pack.amount, pack.currency)
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

/**
 * El saldo, dicho en lo que le importa a quien juega.
 *
 * Con clave propia el cupo no se gasta, asi que anunciar "te quedan 80 turnos,
 * unas 4 partidas" promete un limite que no existe y esconde el que si importa
 * (lo que el proveedor le cobre). El saldo sigue ahi, guardado, por si quita
 * la clave.
 */
export function balanceText(balance: CreditBalance, ownKey = false): string {
  if (ownKey) {
    const guardados = balance.remainingTurns > 0 ? ` Tienes ${balance.remainingTurns} en reserva por si la quitas.` : ''
    return `Juegas con tu clave: estos turnos no se gastan.${guardados}`
  }
  if (balance.remainingTurns === 0) return 'Te quedaste sin turnos. Recarga para seguir jugando.'
  const sesiones = Math.floor(balance.remainingTurns / TURNS_PER_SESSION)
  const turnos = `${balance.remainingTurns} ${balance.remainingTurns === 1 ? 'turno' : 'turnos'}`
  if (sesiones < 1) return `Te quedan ${turnos}: para terminar la partida que tienes empezada.`
  return `Te quedan ${turnos}, unas ${sesiones} ${sesiones === 1 ? 'partida' : 'partidas'}.`
}

/** Si conviene avisarle de que se le acaba. Con clave propia no se le acaba. */
export function lowBalance(balance: CreditBalance, ownKey = false): boolean {
  return !ownKey && balance.remainingTurns > 0 && balance.remainingTurns < TURNS_PER_SESSION
}

/**
 * A donde manda la app para recargar.
 *
 * Se recarga en **nuestra web**, no en una pagina de Stripe: quien solo
 * conoce la app descubre asi que hay un sitio detras. El pago dentro de la
 * app queda pendiente (el SDK de Stripe es nativo y hoy romperia Expo Go).
 *
 * La URL sale de la del servidor con el que habla la app, quitando el puerto
 * de la API: en produccion la web y la API comparten origen, y en local el
 * `:8010` se cambia por el `:3010` de la web.
 */
export function topUpUrl(serverUrl: string): string {
  try {
    const url = new URL(serverUrl)
    // En desarrollo la API va en 8010 y la web en 3010; en produccion ambas
    // cuelgan del mismo dominio sin puerto.
    if (url.port === '8010') url.port = '3010'
    else if (url.port !== '') url.port = ''
    return `${url.origin}/ajustes`
  } catch {
    return ''
  }
}
