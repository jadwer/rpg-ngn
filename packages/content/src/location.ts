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
})

export type Location = z.infer<typeof Location>
