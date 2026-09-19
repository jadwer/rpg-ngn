/**
 * Quien tira los dados de la mesa (`settings.dice` de la API).
 *
 * Con dados reales encima de la mesa, el numero que escribe un jugador vale:
 * es lo que pide el contrato de realidad para una partida presencial. Sin
 * verse las caras eso es una puerta abierta a la trampa, asi que el servidor
 * tira y el numero escrito se ignora.
 */

export type DiceMode = 'table' | 'engine'

export const DICE_MODES: readonly DiceMode[] = ['table', 'engine']

export function isDiceMode(value: unknown): value is DiceMode {
  return value === 'table' || value === 'engine'
}

/** El modo de la mesa; `table` si no eligio, que es como se jugaba antes. */
export function diceModeOf(settings: Record<string, unknown> | null | undefined): DiceMode {
  const value = settings?.['dice']
  return isDiceMode(value) ? value : 'table'
}

/** Nombre del modo en el panel del anfitrion. */
export function diceModeLabel(mode: DiceMode): string {
  return mode === 'engine' ? 'Los tira el servidor' : 'Los tira la mesa'
}

/** Que implica cada modo, en lo que le pasa a quien juega. */
export function diceModeHint(mode: DiceMode): string {
  return mode === 'engine'
    ? 'El servidor tira por todos. Si alguien escribe un número en su respuesta, no cuenta. Es lo que conviene cuando no están en la misma sala.'
    : 'Si escribes el número que sacaste con tus dados, vale. Para jugar con dados de verdad en la mesa; en partidas a distancia deja tirar al servidor.'
}

/** Los ajustes con el modo cambiado, conservando premisa, proveedor y lo demas. */
export function withDiceMode(settings: Record<string, unknown> | null | undefined, mode: DiceMode): Record<string, unknown> {
  const { dice: _previous, ...rest } = settings ?? {}
  // `table` es el valor por defecto: no hace falta guardarlo.
  return mode === 'table' ? rest : { ...rest, dice: mode }
}
