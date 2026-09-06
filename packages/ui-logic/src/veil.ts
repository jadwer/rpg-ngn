import type { Character, Session } from '@rpg-ngn/content'

/**
 * Velado de fichas. La linea (IL2 de docs/10) es campos publicos contra campos
 * con carga narrativa: raza, clase, stats, ataques y habilidades de combate
 * son publicos; bio, objetivo, cita y capacidades cuentan quien es el
 * personaje, y en una sesion planeada para jugadores nuevos (premisa de
 * amnesia) se ocultan hasta que alguien lo juega. A quien ya tuvo dueño lo
 * conoce la mesa, y ocultarlo no protege nada. Misma regla que apps/sheets.
 */

export const VEILABLE_FIELDS = ['bio', 'goal', 'quote', 'abilities'] as const
export type VeilableField = (typeof VEILABLE_FIELDS)[number]

export interface CharacterVisibility {
  /** true si algun campo esta oculto. */
  veiled: boolean
  fields: Record<VeilableField, boolean>
}

export interface SessionVisibility {
  recap: boolean
  openThreads: boolean
  /** La sesion deja elegir personaje entre `availableCharacters`. */
  choosing: boolean
}

export interface VeilOptions {
  /** Campos que la sesion vela; por defecto los cuatro con carga narrativa. */
  veiledFields?: readonly VeilableField[]
}

/** Personajes que alguien ha jugado en cualquier sesion del pack. */
export function everPlayed(sessions: Iterable<Session>): Set<string> {
  const played = new Set<string>()
  for (const session of sessions) {
    for (const member of session.party) played.add(member.character)
  }
  return played
}

/** Una sesion vela fichas si esta planeada y ofrece personajes a elegir. */
export function sessionVeils(session: Session): boolean {
  return session.status === 'planned' && (session.availableCharacters?.length ?? 0) > 0
}

export function characterVisibility(
  session: Session,
  character: Pick<Character, 'id'>,
  played: ReadonlySet<string>,
  options: VeilOptions = {},
): CharacterVisibility {
  const hidden = sessionVeils(session) && !played.has(character.id)
  const veiledFields = new Set(options.veiledFields ?? VEILABLE_FIELDS)
  const fields = Object.fromEntries(VEILABLE_FIELDS.map((f) => [f, !(hidden && veiledFields.has(f))])) as Record<VeilableField, boolean>
  return { veiled: hidden && veiledFields.size > 0, fields }
}

/** Recap y cabos sueltos solo existen en sesiones jugadas; una planeada nunca los muestra. */
export function sessionVisibility(session: Session): SessionVisibility {
  const played = session.status === 'played'
  return {
    recap: played && !!session.recap,
    openThreads: played && (session.openThreads?.length ?? 0) > 0,
    choosing: sessionVeils(session),
  }
}

export type CharacterSlot = { kind: 'taken'; player: string } | { kind: 'free' } | { kind: 'absent' }

/** Que papel tiene un personaje en la sesion: jugado por alguien, libre para elegir, o fuera de la mesa. */
export function characterSlot(session: Session, characterId: string): CharacterSlot {
  const member = session.party.find((p) => p.character === characterId)
  if (member) return { kind: 'taken', player: member.player }
  if (session.availableCharacters?.includes(characterId)) return { kind: 'free' }
  return { kind: 'absent' }
}
