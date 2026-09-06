import { z } from 'zod'
import { KebabId } from './common.js'

/**
 * Mision (01). El progreso vive en el estado de campaña; aqui solo la
 * definicion canonica.
 */
export const QuestObjective = z.strictObject({
  id: KebabId,
  text: z.string().min(1),
  optional: z.boolean().default(false),
})

export const Quest = z.strictObject({
  id: KebabId,
  title: z.string().min(1),
  summary: z.string().min(1),
  giver: KebabId.optional(),
  location: KebabId.optional(),
  objectives: z.array(QuestObjective).min(1),
})

export type Quest = z.infer<typeof Quest>
