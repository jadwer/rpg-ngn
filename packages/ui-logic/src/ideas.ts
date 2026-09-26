/**
 * "Otras" ideas (E10b): que boton ve el jugador segun lo que la API le
 * deja pedir. La primera ronda de cada turno es gratis; las siguientes son
 * para mesas con clave propia o para quien compro un paquete de 10 USD o
 * mas (Gabino, 25-09). Sin React: lo mismo en la web y en la app.
 */

export type IdeasMore = 'free' | 'unlocked' | 'locked' | 'exhausted' | 'none'

export interface MoreIdeasButton {
  label: string
  enabled: boolean
  /** Por que no se puede, para decirlo debajo del boton. */
  hint: string | null
}

/** Null cuando no hay boton que enseñar (tope del turno, o no le toca). */
export function moreIdeasButton(more: IdeasMore): MoreIdeasButton | null {
  switch (more) {
    case 'free':
      return { label: 'Otras ideas', enabled: true, hint: null }
    case 'unlocked':
      return { label: 'Otras ideas', enabled: true, hint: null }
    case 'locked':
      return { label: 'Otras ideas', enabled: false, hint: 'La primera ronda es gratis. Para pedir más, usa tu propia clave del proveedor o el paquete Campaña.' }
    default:
      return null
  }
}
