import type { SessionArc } from '@rpg-ngn/content'
import type { SessionLength, TurnPacing } from '@rpg-ngn/engine-contract'

/**
 * El reloj de la historia (docs/26, H1). Una sesion con largo tiene un
 * presupuesto de turnos y cinco tramos; el motor le dice al director en que
 * tramo va y que tiene que entregar, y el director escribe el contenido. Sin
 * reloj (largo `libre`, o mesas de antes del 04-10) todo sigue como antes.
 *
 * Nacio de la partida del 03-10: 12 turnos en casi dos horas sin un solo
 * cierre, y un jugador pidiendo "ya solo quiero saber quien es el asesino".
 */

/** Turnos por sesion, con la apertura incluida. */
export const SESSION_TURNS: Record<Exclude<SessionLength, 'libre'>, number> = { corta: 8, media: 14, larga: 22 }

export type StoryPhase = 'gancho' | 'complicacion' | 'escalada' | 'climax' | 'cierre'

export interface StoryClock {
  turn: number
  /** Presupuesto con las extensiones del anfitrion. */
  total: number
  phase: StoryPhase
  /** El primer turno de su tramo: toca un logro y recordar el objetivo. */
  phaseStart: boolean
  /** El siguiente turno es el ultimo. */
  penultimate: boolean
  /** Desde aqui un final del arco con su condicion cumplida puede cerrar antes (H4). */
  earlyEnding: boolean
}

/** Presupuesto de una sesion: el del mundo (arco de autor) manda sobre el largo de la mesa. */
export function sessionBudget(pacing: TurnPacing | undefined, arcTurns?: number): number | null {
  // Una sesion con arco de autor (H4) tiene reloj aunque la mesa juegue libre.
  if (arcTurns !== undefined) return arcTurns + (pacing?.extra ?? 0)
  if (!pacing) return null
  const base = pacing.length === 'libre' ? null : SESSION_TURNS[pacing.length]
  return base === null ? null : base + pacing.extra
}

function phaseAt(turn: number, total: number): StoryPhase {
  if (turn <= 1) return 'gancho'
  if (turn >= total) return 'cierre'
  // Lo que queda entre el gancho y el cierre se reparte por fraccion: la
  // complicacion hasta el 35%, la escalada hasta el 65% y el climax hasta el
  // penultimo. Con 8 turnos: 2-3, 4-5, 6-7.
  const span = total - 2
  const at = (turn - 1) / span
  if (at <= 0.35) return 'complicacion'
  if (at <= 0.7) return 'escalada'
  return 'climax'
}

/** Donde va la sesion en este turno, o null si no hay reloj. */
export function storyClock(turn: number, pacing: TurnPacing | undefined, arc?: Pick<SessionArc, 'turns' | 'endings'>): StoryClock | null {
  const total = sessionBudget(pacing, arc?.turns.target)
  if (total === null) return null
  // "Pedir el final": el anfitrion corta y el turno siguiente es el cierre.
  const phase = pacing?.wrap ? 'cierre' : phaseAt(turn, total)
  const previous = turn > 1 ? phaseAt(turn - 1, total) : null
  const earlyEnding = phase !== 'cierre' && (arc?.endings?.length ?? 0) > 0 && turn >= (arc?.turns.min ?? 2)
  return { turn, total, phase, phaseStart: phase !== previous, penultimate: phase !== 'cierre' && turn === total - 1, earlyEnding }
}

const PHASE_GOAL: Record<StoryPhase, string> = {
  gancho: 'Abre con fuerza: un incidente que ya está pasando y exige decidir.',
  complicacion: 'El problema se enreda: una pista que abre otra pregunta, un obstáculo, alguien que miente.',
  escalada: 'Sube lo que está en juego: una consecuencia real de lo que hicieron, un peligro que se acerca, una puerta que se cierra.',
  climax: 'La confrontación o la revelación mayor de la sesión. Todo lo sembrado converge; nada de pistas nuevas sueltas.',
  cierre: 'Último turno: resuelve la pregunta central de la sesión con lo que los jugadores hicieron, da un desenlace claro y termina la sesión.',
}

const PHASE_NAME: Record<StoryPhase, string> = {
  gancho: 'gancho',
  complicacion: 'complicación',
  escalada: 'escalada',
  climax: 'clímax',
  cierre: 'cierre',
}

/**
 * La seccion del contexto con el reloj: tramo, que entregar, limite de texto
 * y como cerrar. Va en el mensaje de usuario (el system prompt se queda
 * estable para la cache).
 */
export function clockLayer(clock: StoryClock, partySize: number, arc?: SessionArc): string {
  const words = partySize === 1 ? 220 : 180
  const lines = [
    '# Reloj de la historia',
    '',
    `Turno ${clock.turn} de ${clock.total}. Tramo: ${PHASE_NAME[clock.phase]}. ${PHASE_GOAL[clock.phase]}`,
    'Cada turno cambia algo: una pista, una consecuencia o un peligro nuevo. Cierra una pregunta chica y abre otra. Un turno que no mueve nada no cuenta.',
    `Texto: como máximo ${words} palabras en total${partySize === 1 ? '' : ' y 2 diálogos de NPC de hasta dos frases'}. Menos es mejor: la mesa lee en voz alta y quiere decidir.`,
  ]
  if (clock.phaseStart && clock.phase !== 'gancho') {
    lines.push('Empieza un tramo nuevo: recuerda en una frase, dentro de la ficción, qué buscan los personajes en esta sesión, y marca lo que acaban de conseguir con un logro: {"kind":"milestone","title":"..."}. El logro es lo que ganaron, no lo que averiguaron: de 3 a 8 palabras, en pasado, con un verbo de acción distinto cada vez ("Sacaron a Osric de la mina", "Se ganaron la confianza de Tomás"), sin revelar secretos y sin empezar por "Confirmaron".')
  }
  if (clock.penultimate) lines.push('El turno siguiente es el ÚLTIMO de la sesión: deja a la mesa ante la decisión final.')
  // Donde deberia ir la trama segun el turno (H5): los puntos del autor se
  // reparten en el presupuesto. Sin esto el director se quedaba en el primero
  // y el desenlace ya no cabia (prueba del one-shot, 05-10).
  const beats = arc?.beats ?? []
  if (beats.length > 0 && clock.phase !== 'cierre') {
    const at = Math.min(beats.length - 1, Math.floor(((clock.turn - 1) / Math.max(1, clock.total - 1)) * beats.length))
    lines.push(`Ritmo de la trama: vas por el punto ${at + 1} de ${beats.length} ("${beats[at]}"). Si vas atrás, avanza hasta él en este turno, aunque tengas que saltar tiempo con una transición breve.`)
  }
  const endings = arc?.endings ?? []
  if (endings.length > 0) {
    lines.push('Finales posibles de esta sesión (elige el que hayan ganado con lo que hicieron; el id va en la línea close):')
    for (const ending of endings) lines.push(`- "${ending.id}": ${ending.when}${ending.default ? ' (si ninguno se cumple, este)' : ''}`)
    if (clock.earlyEnding) lines.push('Si con lo que declararon se cumple la condición de un final, CIERRA en este mismo turno: narra ese desenlace completo y termina con {"kind":"close","ending":"<id>"}. No lo alargues ni lo dejes para después. Si no se cumple, sigue la historia.')
  }
  if (clock.phase === 'cierre') {
    lines.push(
      'Este turno CIERRA la sesión. Narra el desenlace a partir de lo que declararon; no devuelvas la palabra ni hagas preguntas, no emitas "suggest" ni "addressed".',
      endings.length > 0
        ? 'Marca lo que lograron con un "milestone" y termina con {"kind":"close","ending":"<id>","cliffhanger":"..."}: el final que ganaron y, si la historia sigue, una frase con lo que queda pendiente, sin secretos ni lo que los personajes todavía no saben.'
        : 'Marca lo que lograron con un "milestone" y termina con {"kind":"close","cliffhanger":"..."}: el cliffhanger es una frase con lo que queda pendiente para la próxima sesión (vacío si la historia termina aquí). El cliffhanger lo leen los jugadores: nada de secretos ni de lo que los personajes todavía no saben.',
    )
  }
  return lines.join('\n')
}
