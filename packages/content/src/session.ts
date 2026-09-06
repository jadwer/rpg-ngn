import { z } from 'zod'
import { IsoDate, KebabId } from './common.js'
import { SessionId } from './event.js'

/**
 * Datos publicos de sesion (05): logistica y lo que un jugador puede leer.
 * Hallazgo IL5 de 10: mezcla contenido, estado y nombres de personas; se
 * separa cuando exista la entidad Player en el event model (BL1).
 */

export const FortuneTier = z.strictObject({
  /** `1-3` o `20`. */
  range: z.string().regex(/^\d{1,2}(?:-\d{1,2})?$/),
  label: z.string().min(1),
})

export const PartyMember = z.strictObject({
  player: z.string().min(1),
  character: KebabId,
})

export const SessionStatus = z.enum(['planned', 'played', 'cancelled'])

export const Session = z.strictObject({
  id: SessionId,
  title: z.string().min(1),
  date: IsoDate,
  status: SessionStatus,
  briefing: z.string().min(1),
  howToPlay: z.array(z.string().min(1)).min(1),
  fortune: z.array(FortuneTier).min(1),
  /** Personajes entre los que eligen los jugadores nuevos. */
  availableCharacters: z.array(KebabId).optional(),
  party: z.array(PartyMember),
  notes: z.string().optional(),
  recap: z.string().optional(),
  openThreads: z.array(z.string().min(1)).optional(),
})

export type Session = z.infer<typeof Session>
