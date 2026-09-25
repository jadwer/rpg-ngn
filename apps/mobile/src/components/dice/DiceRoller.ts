/**
 * La interfaz de quien pinta un dado en la app, la misma que en la web. La
 * mesa le da el dado y la funcion que trae el numero (del servidor) y espera
 * a que aterrice; sprites hoy, un dado 3D con fisicas mañana, sin tocar la
 * mesa (Gabino, 25-09). El resultado llega primero, la animacion aterriza en el.
 */
export interface RollOutcome {
  result: number
  /** Cada dado por separado cuando hay varios (2d6, ventaja). */
  rolls?: number[] | undefined
}

export interface DiceRollerProps {
  die: string
  label?: string | undefined
  disabled?: boolean | undefined
  /** Trae el numero de verdad; se llama al soltar el dado. */
  resolve: () => Promise<RollOutcome>
  /** El dado termino de frenar y esta sobre el numero. */
  onLanded: (outcome: RollOutcome) => void
  onFailed?: ((error: unknown) => void) | undefined
  large?: boolean | undefined
}
