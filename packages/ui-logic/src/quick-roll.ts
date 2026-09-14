import { rollDice, webCryptoRandom, type RandomSource } from '@rpg-ngn/core'

/**
 * Tirada rapida desde el cuadro de respuesta. No es una segunda fuente de
 * verdad: cuando el DM pide una tirada, el engine la resuelve solo (evento
 * `roll` sin `result`). Esto es para el jugador que quiere tirar por su
 * cuenta al declarar algo ("saco la ganzua y tiro"), y lo unico que hace es
 * escribir el resultado en su texto, que es lo que el DM ya sabe leer.
 *
 * Usa el mismo generador del motor (Web Crypto), asi que el numero es tan
 * bueno como el que tiraria el engine; queda registrado como tirada
 * reportada por el jugador (`source: physical`) cuando el DM la recoge.
 */
export const QUICK_DICE = ['1d20', '1d12', '1d10', '1d8', '1d6', '1d4', '2d6'] as const
export type QuickDie = (typeof QUICK_DICE)[number]

export interface QuickRoll {
  die: string
  result: number
  rolls: number[]
  /** Frase lista para pegar en la respuesta: "Tiro 1d20: 14". */
  text: string
}

export function quickRoll(die: string, rng: RandomSource = webCryptoRandom()): QuickRoll {
  const rolled = rollDice(die, rng)
  const detail = rolled.rolls.length > 1 ? ` [${rolled.rolls.join(' + ')}${rolled.modifier !== 0 ? ` ${rolled.modifier > 0 ? '+' : '-'} ${Math.abs(rolled.modifier)}` : ''}]` : ''
  return { die, result: rolled.total, rolls: rolled.rolls, text: `Tiro ${die}: ${rolled.total}${detail}` }
}

/**
 * Añade la tirada al texto que el jugador lleva escrito, separada por un
 * espacio si ya habia algo. No pisa lo escrito: el jugador sigue mandando su
 * accion, con el numero dentro.
 */
export function appendRoll(text: string, roll: QuickRoll): string {
  const trimmed = text.trimEnd()
  if (trimmed === '') return roll.text
  const separator = /[.!?]$/.test(trimmed) ? ' ' : '. '
  return `${trimmed}${separator}${roll.text}`
}
