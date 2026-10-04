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

/**
 * Un final de la sesion (docs/26, H4). `when` es la condicion en prosa que
 * el director lee para elegirlo; el titulo y el texto de la tarjeta salen de
 * aqui, nunca del modelo.
 */
export const SessionEnding = z.strictObject({
  id: KebabId,
  when: z.string().min(1),
  title: z.string().min(1),
  text: z.string().min(1).optional(),
  /** Termina la historia entera: la mesa queda "Terminada". */
  final: z.boolean().optional(),
  /** El que vale si el director no elige uno valido en el turno de cierre. Uno por sesion. */
  default: z.boolean().optional(),
  /** La sesion que sigue si se juega este final ("001", "002"). */
  next: SessionId.optional(),
})
export type SessionEnding = z.infer<typeof SessionEnding>

/**
 * La forma que el autor le da a una sesion (docs/26, H4): capitulo,
 * presupuesto de turnos, gancho, objetivo visible, puntos de trama
 * obligados, desenlace inevitable y finales con rama. Todo opcional menos
 * el presupuesto; una sesion sin `arc` se juega como siempre.
 */
export const SessionArc = z.strictObject({
  chapter: z.strictObject({ number: z.number().int().positive(), title: z.string().min(1) }).optional(),
  turns: z.strictObject({
    target: z.number().int().min(3).max(40),
    /** Desde que turno un final con condicion puede cerrar antes del presupuesto. Por omision, 2. */
    min: z.number().int().min(2).optional(),
  }),
  /** El incidente de apertura, escrito por el autor. */
  hook: z.string().min(1).optional(),
  /** Lo que buscan los personajes; los jugadores lo ven siempre. */
  objective: z.string().min(1).optional(),
  /** Puntos de trama obligados, en orden (capa del GM). */
  beats: z.array(z.string().min(1)).optional(),
  /** Desenlace inevitable (capa del GM): las decisiones cambian el como, nunca el que. */
  fixedOutcome: z.string().min(1).optional(),
  endings: z.array(SessionEnding).optional(),
  /** Tarjeta de cierre cuando la sesion no tiene finales con rama. */
  endCard: z.strictObject({ title: z.string().min(1).optional(), text: z.string().min(1).optional() }).optional(),
})
export type SessionArc = z.infer<typeof SessionArc>

export const Session = z.strictObject({
  id: SessionId,
  title: z.string().min(1),
  date: IsoDate,
  status: SessionStatus,
  briefing: z.string().min(1),
  howToPlay: z.array(z.string().min(1)).min(1),
  /**
   * Tabla de Fortuna de la sesion: si esta, el motor tira 1d20 por cada
   * personaje presente al abrirla y el ruleset guarda el resultado. Es una
   * mecanica que el pack elige, no algo que toda sesion deba tener (antes
   * era obligatoria por herencia del piloto; opcional desde el 23-09).
   */
  fortune: z.array(FortuneTier).min(1).optional(),
  /** Personajes entre los que eligen los jugadores nuevos. */
  availableCharacters: z.array(KebabId).optional(),
  /**
   * Lugar donde arranca la party al abrir la sesion. Sin esto nadie tiene
   * ubicacion hasta que el GM mueva a alguien, y el mapa de la mesa sale
   * vacio de gente toda la primera escena. El autor del pack decide el
   * sitio (el baile empieza en el salon); el GM los mueve despues.
   */
  startLocation: KebabId.optional(),
  party: z.array(PartyMember),
  notes: z.string().optional(),
  recap: z.string().optional(),
  openThreads: z.array(z.string().min(1)).optional(),
  arc: SessionArc.optional(),
})

export type Session = z.infer<typeof Session>
