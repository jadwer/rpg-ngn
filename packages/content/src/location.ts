import { z } from 'zod'
import { KebabId } from './common.js'

/**
 * Lugar (01): la ficha completa y, aparte, lo que sabria un recien llegado.
 */
export const Location = z.strictObject({
  id: KebabId,
  name: z.string().min(1),
  description: z.string().min(1),
  /** Lo que se ve o se sabe al llegar, sin haber explorado. */
  newcomerView: z.string().min(1),
  connections: z.array(KebabId).default([]),
  tags: z.array(z.string().min(1)).default([]),
  /**
   * Donde cae este lugar en un mapa del pack. `map` es el id del mapa, y
   * `x`/`y` van en porcentaje del ancho y el alto de la imagen (0 a 100),
   * no en pixeles: asi la misma coordenada vale en un movil y en una
   * pantalla compartida. Opcional: un pack sin mapa sigue siendo valido y
   * sus lugares se muestran como lista.
   */
  map: KebabId.optional(),
  x: z.number().min(0).max(100).optional(),
  y: z.number().min(0).max(100).optional(),
})
  .refine((l) => (l.map === undefined) === (l.x === undefined) && (l.x === undefined) === (l.y === undefined), 'un lugar en un mapa necesita map, x e y; sin mapa, ninguno de los tres')

export type Location = z.infer<typeof Location>
