/**
 * Quien tira los dados de la mesa (`settings.dice` de la API).
 *
 * Por defecto tira el servidor: en una mesa en linea nadie ve los dados del
 * otro, y aceptar el numero que escribe un jugador es una puerta abierta a
 * la trampa. `table` existe para la partida presencial con dados de verdad
 * encima de la mesa, y es una eleccion consciente del anfitrion, no lo que
 * pasa cuando nadie eligio. (Estuvo al reves hasta el 19-09 y el control ni
 * siquiera existia en la app: Gabino lo señalo con razon dos veces.)
 */

export type DiceMode = 'table' | 'engine'

/** En el orden en que se ofrecen: primero el seguro. */
export const DICE_MODES: readonly DiceMode[] = ['engine', 'table']

export const DEFAULT_DICE_MODE: DiceMode = 'engine'

export function isDiceMode(value: unknown): value is DiceMode {
  return value === 'table' || value === 'engine'
}

/** El modo de la mesa; `engine` si no eligio o si el valor no vale. */
export function diceModeOf(settings: Record<string, unknown> | null | undefined): DiceMode {
  const value = settings?.['dice']
  return isDiceMode(value) ? value : DEFAULT_DICE_MODE
}

/** Nombre del modo en el panel del anfitrion. */
export function diceModeLabel(mode: DiceMode): string {
  return mode === 'engine' ? 'Los tira el servidor' : 'Los tira la mesa'
}

/** Que implica cada modo, en lo que le pasa a quien juega. */
export function diceModeHint(mode: DiceMode): string {
  return mode === 'engine'
    ? 'El servidor tira por todos y la mesa ve el número. Si alguien escribe un número en su respuesta, no cuenta. Es lo correcto a distancia.'
    : 'Si escribes el número que sacaste con tus dados, vale. Solo para jugar con dados de verdad en la misma mesa; a distancia cualquiera puede escribir "saqué 20".'
}

/**
 * Los ajustes con el modo cambiado, conservando premisa, proveedor y lo demas.
 * Se guarda siempre explicito, incluido `engine`: un ajuste que "no hace
 * falta guardar porque es el de por defecto" es justo lo que se rompe cuando
 * el por defecto cambia.
 */
export function withDiceMode(settings: Record<string, unknown> | null | undefined, mode: DiceMode): Record<string, unknown> {
  return { ...(settings ?? {}), dice: mode }
}
