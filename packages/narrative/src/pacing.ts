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

/**
 * Si en este turno toca logro: al empezar un tramo (no el gancho) y en el
 * cierre. En sesiones de 6 turnos o menos casi cada turno empieza tramo, asi
 * que ahi solo al entrar a la escalada, al climax y en el cierre. El motor lo
 * usa tambien para descartar un logro que el modelo escriba fuera de turno.
 */
export function milestoneDue(clock: StoryClock): boolean {
  if (clock.phase === 'cierre') return true
  return clock.phaseStart && clock.phase !== 'gancho' && (clock.total > 6 || clock.phase === 'escalada' || clock.phase === 'climax')
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
/** Prefijo con el que un logro queda en la cronica como `world_event`, para que el GM del turno siguiente lo vea. */
export const MILESTONE_NOTE = 'Logro: '

export function clockLayer(clock: StoryClock, partySize: number, arc?: SessionArc, achieved: readonly string[] = []): string {
  const words = partySize === 1 ? 220 : 180
  const lines = [
    '# Reloj de la historia',
    '',
    `Turno ${clock.turn} de ${clock.total}. Tramo: ${PHASE_NAME[clock.phase]}. ${PHASE_GOAL[clock.phase]}`,
    'Cada turno cambia algo: una pista, una consecuencia o un peligro nuevo. Cierra una pregunta chica y abre otra. Un turno que no mueve nada no cuenta.',
    // Fallar avanza (docs/27, R2). La regla general dice "a veces no hay
    // nada"; con reloj eso mata la sesion: en la mesa 43 fallaron 4 tiradas
    // de 9 y ninguna dio nada, y la pista del cuerpo se perdio en un 2.
    'Aquí un fallo nunca deja el turno vacío: el personaje consigue lo que buscaba pagando un costo (lo ven, pierde un apoyo, llega tarde, sube la presión) o consigue otra cosa útil. Lo que la mesa necesita para avanzar no depende de un solo dado ni de una sola pregunta: el dado decide el costo y cuánto se sabe, no si se sabe. Lo que un jugador ganó con su acción lo aprovecha ese jugador, no otro.',
    'No repitas como desconocido lo que la mesa ya averiguó (está en "pistas" y en la crónica): si alguien pregunta por algo ya sabido, recuérdaselo en una frase y dale lo que sigue.',
    `Texto: como máximo ${words} palabras en total${partySize === 1 ? '' : ' y 2 diálogos de NPC de hasta dos frases'}. Menos es mejor: la mesa lee en voz alta y quiere decidir.`,
  ]
  // En sesiones de 6 turnos o menos casi cada turno empieza tramo: el logro
  // salia en casi todos y por cualquier cosa. Ahi solo al entrar a la
  // escalada y al climax (el del cierre se pide abajo).
  const milestoneNow = clock.phase !== 'cierre' && milestoneDue(clock)
  if (clock.phaseStart && clock.phase !== 'gancho' && !milestoneNow) lines.push('Empieza un tramo nuevo: recuerda en una frase, dentro de la ficción, qué busca la mesa en esta sesión.')
  if (milestoneNow) {
    lines.push('Empieza un tramo nuevo: recuerda en una frase, dentro de la ficción, qué buscan los personajes en esta sesión, y marca lo que acaban de conseguir con un logro: {"kind":"milestone","title":"..."}. El logro es lo que ganaron, no lo que averiguaron: de 3 a 8 palabras, en pasado, con un verbo de acción distinto cada vez ("Sacaron a Osric de la mina", "Se ganaron la confianza de Tomás"), sin revelar secretos y sin empezar por "Confirmaron".' + (partySize === 1 ? ' La mesa es de una sola persona: en singular ("Sacó", "Se ganó").' : '') + (achieved.length ? ` Logros ya dados en esta sesión, que no se repiten ni con otras palabras: ${achieved.map((a) => `"${a}"`).join(', ')}. Este tiene que ser algo nuevo que consiguieron desde entonces.` : ''))
  }
  // Sin dados de utileria (docs/27, R3): en la mesa 44 se tiro 12 con el
  // agente y 6 en la ventana, y nada podia cambiar. Vale con cualquier modo de dados.
  if (arc?.fixedOutcome) lines.push('Esta sesión tiene un desenlace inevitable: no pidas ni uses un dado para nada que ese desenlace ya decide. Un dado solo entra si cambia el cómo (qué pierde, a quién tiene de su lado, qué se lleva); un dado que no puede cambiar nada le cuesta a la mesa un turno por nada.')
  if (clock.penultimate) lines.push('El turno siguiente es el ÚLTIMO de la sesión: deja a la mesa ante la decisión final.')
  // Donde deberia ir la trama segun el turno (H5): los puntos del autor se
  // reparten en el presupuesto. Sin esto el director se quedaba en el primero
  // y el desenlace ya no cabia (prueba del one-shot, 05-10).
  const beats = arc?.beats ?? []
  if (beats.length > 0 && clock.phase !== 'cierre') {
    const at = Math.min(beats.length - 1, Math.floor(((clock.turn - 1) / Math.max(1, clock.total - 1)) * beats.length))
    const next = beats[at + 1]
    // Antes: "avanza hasta el en este turno aunque tengas que saltar tiempo".
    // El jugador dudo dos turnos y, al decir "voy", llego al choque, lo
    // culparon y ya iba en la patrulla en un solo turno (mesa 44).
    lines.push(`Ritmo de la trama: deberías ir por el punto ${at + 1} de ${beats.length} ("${beats[at]}").${next ? ` Después viene: "${next}".` : ''} Si vas atrás, acércate en este turno, pero no borres lo que el jugador acaba de abrir: si declaró ir a un lugar o empezar una escena, juégala al menos un intercambio antes de saltar. El ritmo se recupera acortando lo que sigue, nunca saltándote lo que el jugador eligió.`)
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
        ? 'Marca lo que lograron con un "milestone" (de 3 a 8 palabras, como los demás) y termina con {"kind":"close","ending":"<id>","cliffhanger":"..."}: el final que ganaron y, si la historia sigue, una frase con lo que queda pendiente, sin secretos ni lo que los personajes todavía no saben.'
        : 'Marca lo que lograron con un "milestone" (de 3 a 8 palabras, como los demás) y termina con {"kind":"close","cliffhanger":"..."}: el cliffhanger es una frase con lo que queda pendiente para la próxima sesión (vacío si la historia termina aquí). El cliffhanger lo leen los jugadores: nada de secretos ni de lo que los personajes todavía no saben.',
    )
  }
  return lines.join('\n')
}
