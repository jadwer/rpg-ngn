/**
 * Quien tira los dados de la mesa (`settings.dice` de la API).
 *
 * Tres modos desde el 25-09 (Gabino):
 *
 * - `engine`: el motor tira un d20 por personaje antes de llamar al modelo y
 *   el DM narra la consecuencia en el mismo turno. Rapido, sin dado a la vista.
 * - `dice`: el DM pide la tirada y no narra la consecuencia; el jugador suelta
 *   el dado en pantalla y el numero lo pone el servidor. Lo que el jugador
 *   escriba como numero no cuenta. Es el modo por omision: es la experiencia
 *   que Gabino quiere ("es increible jugar con la tirada a mano") sin abrir
 *   la puerta a escribir "saque 20".
 * - `table`: partida presencial con dados de verdad; el jugador escribe el
 *   numero que saco y ese vale. Eleccion consciente del anfitrion.
 */

export type DiceMode = 'engine' | 'dice' | 'table'

/** En el orden en que se ofrecen: primero el de por omision. */
export const DICE_MODES: readonly DiceMode[] = ['dice', 'engine', 'table']

export const DEFAULT_DICE_MODE: DiceMode = 'dice'

export function isDiceMode(value: unknown): value is DiceMode {
  return value === 'engine' || value === 'dice' || value === 'table'
}

/** El modo de la mesa; el de por omision si no eligio o si el valor no vale. */
export function diceModeOf(settings: Record<string, unknown> | null | undefined): DiceMode {
  const value = settings?.['dice']
  return isDiceMode(value) ? value : DEFAULT_DICE_MODE
}

/** Nombre del modo en el panel del anfitrion. */
export function diceModeLabel(mode: DiceMode): string {
  switch (mode) {
    case 'engine':
      return 'Los tira el servidor'
    case 'dice':
      return 'Tiras el dado en pantalla'
    case 'table':
      return 'Dados de verdad en la mesa'
  }
}

/** Que implica cada modo, en lo que le pasa a quien juega. */
export function diceModeHint(mode: DiceMode): string {
  switch (mode) {
    case 'engine':
      return 'El servidor tira por todos y el resultado sale en la narración del mismo turno. Si alguien escribe un número en su respuesta, no cuenta. El más rápido.'
    case 'dice':
      return 'Cuando tu acción tiene riesgo, el director te pide tirar: sueltas el dado y el número lo pone el servidor. Nadie puede escribir "saqué 20". La consecuencia llega al turno siguiente.'
    case 'table':
      return 'Si escribes el número que sacaste con tus dados, vale. Solo para jugar con dados de verdad en la misma mesa; a distancia cualquiera puede escribir "saqué 20".'
  }
}

/**
 * Los ajustes con el modo cambiado, conservando premisa, proveedor y lo demas.
 * Se guarda siempre explicito, incluido el de por omision: un ajuste que "no
 * hace falta guardar porque es el de por defecto" es justo lo que se rompe
 * cuando el por defecto cambia (y cambio el 25-09, de `engine` a `dice`).
 */
export function withDiceMode(settings: Record<string, unknown> | null | undefined, mode: DiceMode): Record<string, unknown> {
  return { ...(settings ?? {}), dice: mode }
}
