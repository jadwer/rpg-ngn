import type { TurnProgress, TurnSummary } from './turn.js'

/**
 * La mesa vista como personas, no como una linea de texto (docs/14, punto 7;
 * docs/16, estados 3 a 6): quien ya respondio, quien esta tecleando, quien
 * piensa, quien tuvo que irse y quien narra en voz alta. Y la cuenta atras
 * cancelable del cierre (docs/18, D-UX-3), que corre en todos los
 * dispositivos desde el mismo instante porque lo pone la API.
 */

export interface SeatMember {
  id: string | number
  role: 'host' | 'player'
  characterId: string | null
  userName: string | null
  present?: boolean | undefined
}

/** Un aviso de la API: alguien narra, escribe o puso el turno en espera. */
export interface SeatPresence {
  memberId: number
  characterId: string | null
}

export type SeatState = 'ready' | 'writing' | 'thinking' | 'away' | 'narrating' | 'watching'

export interface Seat {
  memberId: string
  characterId: string | null
  /** Nombre del personaje si tiene, si no el de la persona. */
  name: string
  role: 'host' | 'player'
  state: SeatState
  mine: boolean
}

export const SEAT_LABELS: Record<SeatState, string> = {
  ready: 'Listo',
  writing: 'Escribiendo',
  thinking: 'Pensando',
  away: 'Se tuvo que ir',
  narrating: 'Narra en voz alta',
  watching: 'Mira la mesa',
}

interface SeatsInput {
  members: readonly SeatMember[]
  turn: TurnSummary | null
  typing: readonly SeatPresence[]
  narrators: readonly SeatPresence[]
  /** Quien tuvo que irse segun el estado en vivo; `members[].present` solo se refresca con las propias acciones. */
  away?: readonly SeatPresence[] | undefined
  viewerMemberId: string | number
  nameOf: (characterId: string) => string
}

/**
 * Un asiento por miembro, con su estado. El orden es el de la mesa. Sin
 * turno abierto nadie "piensa": los que tienen personaje quedan en `ready`
 * (estan sentados) y los que no, en `watching`.
 */
export function seats({ members, turn, typing, narrators, away = [], viewerMemberId, nameOf }: SeatsInput): Seat[] {
  const responded = new Set(turn?.responded ?? [])
  const required = new Set(turn?.required ?? [])
  const typingIds = new Set(typing.map((t) => String(t.memberId)))
  const narratingIds = new Set(narrators.map((n) => String(n.memberId)))
  const awayIds = new Set(away.map((a) => String(a.memberId)))
  const open = turn?.status === 'open'

  return members.map((m) => {
    const memberId = String(m.id)
    let state: SeatState
    if (m.present === false || awayIds.has(memberId)) state = 'away'
    else if (narratingIds.has(memberId)) state = 'narrating'
    else if (!m.characterId) state = 'watching'
    else if (open && responded.has(m.characterId)) state = 'ready'
    else if (open && typingIds.has(memberId)) state = 'writing'
    else if (open && required.has(m.characterId)) state = 'thinking'
    else state = 'ready'
    return {
      memberId,
      characterId: m.characterId,
      name: m.characterId ? nameOf(m.characterId) : (m.userName ?? 'Alguien'),
      role: m.role,
      state,
      mine: memberId === String(viewerMemberId),
    }
  })
}

/** Resumen corto para la barra: "2 de 4 listos", "todos listos", o quien escribe. */
export function seatsSummary(list: readonly Seat[]): string {
  const playing = list.filter((s) => s.characterId && s.state !== 'away')
  if (playing.length === 0) return 'Nadie sentado todavía'
  const ready = playing.filter((s) => s.state === 'ready').length
  const writing = playing.filter((s) => s.state === 'writing')
  if (writing.length === 1) return `${writing[0]!.name} está escribiendo`
  if (writing.length > 1) return `${writing.length} escribiendo`
  if (ready === playing.length) return 'Todos listos'
  return `${ready} de ${playing.length} listos`
}

/** Segundos que se cuentan antes de cerrar solo; lo fija docs/18, D-UX-3. */
export const COUNTDOWN_SECONDS = 10

export interface Countdown {
  /** Hay cuenta atras en marcha (turno abierto, completo y sin espera). */
  active: boolean
  /** Segundos que faltan, redondeados hacia arriba; 0 cuando toca cerrar. */
  remaining: number
  /** Alguien la cancelo: se cierra a mano. */
  held: boolean
  heldByName: string | null
}

export interface CountdownTurn extends TurnSummary {
  completedAt?: string | null | undefined
  held?: boolean | undefined
  heldBy?: { characterId: string | null; name: string | null } | null | undefined
}

export interface CountdownInput {
  turn: CountdownTurn | null
  progress: TurnProgress
  /**
   * Cuando este cliente vio el turno completo (ms de su propio reloj), o
   * null. Se cuenta desde ahi y no desde `completedAt` para que un reloj
   * desviado no cierre antes de tiempo; `completedAt` sirve para saber que
   * el turno se completo (y se vuelve a completar si alguien reescribe).
   */
  startedAt: number | null
  now: number
  seconds?: number
  nameOf?: (characterId: string) => string
}

/**
 * Estado de la cuenta atras. Corre solo cuando el turno esta abierto, no
 * falta nadie y nadie la puso en espera. Varios clientes llegan a cero casi
 * a la vez: el primero cierra y los demas reciben conflicto y refrescan.
 */
export function countdown({ turn, progress, startedAt, now, seconds = COUNTDOWN_SECONDS, nameOf }: CountdownInput): Countdown {
  const none: Countdown = { active: false, remaining: seconds, held: false, heldByName: null }
  if (!turn || turn.status !== 'open') return none
  const held = turn.held === true
  const heldByName = held ? (turn.heldBy?.characterId && nameOf ? nameOf(turn.heldBy.characterId) : (turn.heldBy?.name ?? null)) : null
  if (!progress.complete || !turn.completedAt || startedAt === null) return { ...none, held, heldByName }
  if (held) return { active: false, remaining: seconds, held: true, heldByName }
  const elapsed = Math.max(0, (now - startedAt) / 1000)
  return { active: true, remaining: Math.max(0, Math.ceil(seconds - elapsed)), held: false, heldByName: null }
}

/** La frase de la cuenta atras, con el boton al lado: "El director narra en 7 s". */
export function countdownLine(state: Countdown): string {
  if (state.held) return state.heldByName ? `En espera: ${state.heldByName} pidió un momento.` : 'En espera: alguien pidió un momento.'
  if (!state.active) return ''
  return state.remaining <= 0 ? 'El director narra...' : `El director narra en ${state.remaining} s`
}

/**
 * La espera como ficcion (docs/16, "el destino se prepara"): entre 5 y 25
 * segundos por turno que hoy son un indicador tecnico. Una frase por turno,
 * estable mientras dura la espera, y otra cada tanto para que no parezca
 * congelada.
 */
export const WAITING_PHRASES: readonly string[] = [
  'El destino se prepara.',
  'Los dados ya cayeron; el relato se escribe.',
  'El director ordena lo que acaba de pasar.',
  'Algo se mueve al otro lado de la escena.',
  'La historia toma aire.',
  'Lo que hicieron ya no se puede deshacer.',
]

/** Frase de espera para este turno y este momento; cambia cada `everyMs`. */
export function waitingPhrase(turnNumber: number, now: number, everyMs = 6000): string {
  const step = Math.floor(now / everyMs)
  return WAITING_PHRASES[(turnNumber * 7 + step) % WAITING_PHRASES.length]!
}
