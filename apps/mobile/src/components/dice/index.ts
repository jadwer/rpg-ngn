/**
 * El dado que pinta la mesa. Cambiar de presentador (sprites hoy, un dado
 * 3D con fisicas mañana) es cambiar esta linea: la mesa solo conoce
 * `DiceRollerProps`.
 */
export { SpriteDie as DiceRoller } from './SpriteDie'
export type { DiceRollerProps, RollOutcome } from './DiceRoller'
