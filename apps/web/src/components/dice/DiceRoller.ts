/**
 * La interfaz de quien pinta un dado. La mesa no sabe si detras hay sprites
 * de la lamina, numeros o un dado 3D con fisicas: le da el dado, la funcion
 * que trae el numero (del servidor) y espera a que aterrice. El resultado
 * llega primero y la animacion aterriza en el, nunca al reves: asi un dado
 * fisico puede sustituir a los sprites sin tocar la mesa (Gabino, 25-09).
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
