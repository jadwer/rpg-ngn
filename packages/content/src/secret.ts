import { z } from 'zod'
import { EntityRef, FactRef, KebabId } from './common.js'
import { EventType } from './event.js'

/**
 * Secreto del pack: la capa `dm` de docs/04 y docs/08 como datos. Un
 * secreto es un hecho del mundo que existe pero que la party no sabe. Su
 * texto y sus `keywords` entran al contexto del modelo marcados como no
 * revelables, nunca a una proyeccion de jugador ni al visor de fichas.
 *
 * Se considera revelado a un personaje cuando el log tiene un evento
 * visible para el que cumple `revealWhen`, o un `secret_revealed` con ese
 * personaje entre los testigos. `packages/campaign` lo proyecta en
 * `knowledge[<personaje>].secrets` y el lint de `packages/narrative` corta
 * la narracion que use las `keywords` de un secreto que el receptor no
 * conoce (invariante 3 de docs/08).
 */

/**
 * Condicion de revelacion sobre un solo evento. Todas las claves presentes
 * deben cumplirse. `match` compara sin acentos ni mayusculas contra el texto
 * del evento (declared, payload.text, payload.note, payload.method).
 */
export const RevealOnEvent = z.strictObject({
  event: EventType,
  fact: FactRef.optional(),
  actor: EntityRef.optional(),
  target: EntityRef.optional(),
  match: z.string().min(1).optional(),
})
export type RevealOnEvent = z.infer<typeof RevealOnEvent>

/** Solo lo revela el DM a proposito, con un evento `secret_revealed`. */
export const RevealManual = z.strictObject({ manual: z.literal(true) })

export const RevealWhen = z.union([RevealOnEvent, RevealManual])
export type RevealWhen = z.infer<typeof RevealWhen>

/** A que entidad del mundo pertenece el secreto. */
export const SecretSubjectRef = z
  .string()
  .regex(/^(character|npc|location|quest|item|faction):[a-z0-9]+(?:-[a-z0-9]+)*$/, 'referencia `tipo:id` a personaje, NPC, lugar, mision, objeto o faccion')

export const Secret = z.strictObject({
  id: KebabId,
  about: SecretSubjectRef,
  /** El hecho, escrito para el DM. */
  text: z.string().min(1),
  /**
   * Marcadores del secreto en prosa: frases que solo aparecen si se esta
   * contando este hecho. El lint las busca en la narracion sin acentos ni
   * mayusculas; una frase demasiado generica produce falsos positivos.
   */
  keywords: z.array(z.string().min(2)).min(1),
  revealWhen: RevealWhen,
  /** Quien puede soltarlo en la ficcion (un NPC, normalmente). */
  revealedBy: EntityRef.optional(),
  /** Nota para el DM humano o para quien mantiene el pack. */
  note: z.string().optional(),
})

export type Secret = z.infer<typeof Secret>

export function isManualReveal(when: RevealWhen): when is z.infer<typeof RevealManual> {
  return 'manual' in when
}
