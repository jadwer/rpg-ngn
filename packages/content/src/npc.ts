import { z } from 'zod'
import { EntityRef, KebabId } from './common.js'

/**
 * NPC (01, contenido canonico). Nada aqui es secreto: el repo es publico.
 * Lo que un NPC sabe y no debe decir vive en las notas del GM o en la capa
 * `gm` del estado de campaña.
 */
export const Npc = z.strictObject({
  id: KebabId,
  name: z.string().min(1),
  /** Lo que un recien llegado percibe de este NPC. */
  description: z.string().min(1),
  /** Retrato relativo al pack; requerido por la vista de dialogo (09). */
  portrait: z.string().min(1).nullable().default(null),
  location: KebabId.optional(),
  goals: z.array(z.string().min(1)).default([]),
  /**
   * Enemigo con vida (combate por elementos, Las Siete Coronas): sus puntos de
   * vida y, si tiene, su elemento propio (solo para narrarlo).
   */
  combat: z.strictObject({ hp: z.number().int().positive(), element: z.enum(['fuego', 'agua', 'hielo', 'rayo', 'viento', 'roca', 'flora']).optional() }).optional(),
  /** Hechos que este NPC puede compartir, como refs `fact:*`. */
  knows: z.array(EntityRef).default([]),
  relationships: z
    .array(
      z.strictObject({
        with: EntityRef,
        kind: z.string().min(1),
      }),
    )
    .default([]),
})

export type Npc = z.infer<typeof Npc>
