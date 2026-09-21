import { z } from 'zod'
import { KebabId } from './common.js'

/**
 * Un mapa de region: una imagen que dibuja el creador del pack y sobre la
 * que se posan los lugares. No es un tablero tactico: no hay casillas ni
 * nadie se coloca en una coordenada. Las coordenadas sirven para saber
 * DONDE PINTAR cada lugar encima de la imagen.
 *
 * Un pack puede tener varios: el pueblo y, aparte, los tres niveles de la
 * mina. Un lugar dice en cual esta (`map`) y en que punto (`x`, `y`).
 */
export const PackMap = z.strictObject({
  id: KebabId,
  name: z.string().min(1),
  /** Ruta de la imagen dentro del pack, como los retratos. */
  image: z.string().min(1),
  /** Que es y a que escala, para el DM y para quien lo mira. */
  description: z.string().min(1).optional(),
})

export type PackMap = z.infer<typeof PackMap>
