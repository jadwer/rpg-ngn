import type { DeductionView } from '@rpg-ngn/api-client'
import type { TurnProgress } from './turn.js'
import { t } from '@rpg-ngn/i18n'

/**
 * Lo que la mesa pinta en una partida de roles ocultos (Turno de noche en la
 * Persefone, 08-10). La API ya filtra lo que cada asiento puede saber; aqui
 * solo se decide como se dice. Web y app usan lo mismo.
 */

/** La linea de cabecera: fase, tareas de la tripulacion y cuantos siguen vivos. */
export function deductionHeader(view: DeductionView): string {
  return [view.phase === 'reunion' ? t('deduction.meeting') : t('deduction.actionTurn'), t('deduction.tasks', { done: view.tasks.done, total: view.tasks.total }), t('deduction.aliveCount', { count: view.alive.length })].join(' · ')
}

/** El rol propio con su consejo, o el aviso de fantasma. Null si quien mira no juega. */
export function deductionRole(view: DeductionView): { title: string; hint: string; tone: 'crew' | 'host' | 'ghost' } | null {
  if (!view.me?.role) return null
  if (!view.me.alive) return { title: view.me.role === 'huesped' ? t('deduction.youAreHost') : t('deduction.youAreCrew'), hint: t('deduction.ghost'), tone: 'ghost' }
  return view.me.role === 'huesped' ? { title: t('deduction.youAreHost'), hint: t('deduction.hostHint'), tone: 'host' } : { title: t('deduction.youAreCrew'), hint: t('deduction.crewHint'), tone: 'crew' }
}

/** Las tareas propias con el nombre de su sala (los trae el reparto; si no, el id). */
export function deductionTasks(view: DeductionView, roomName: (id: string) => string): Array<{ id: string; label: string; done: boolean }> {
  return (view.me?.tasks ?? []).map((task) => ({ id: task.id, label: `${task.name ?? task.id} · ${task.roomName ?? roomName(task.room)}`, done: task.done }))
}

/** El nombre de una sala: el de las tareas propias si lo traen, o el id legible ("sala-comun" -> "Sala comun"). */
export function deductionRoomName(view: DeductionView | null | undefined, id: string): string {
  const known = view?.me?.tasks.find((t) => t.room === id && t.roomName)?.roomName
  if (known) return known
  const words = id.replace(/-/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/** Avisos publicos: sabotaje activo y cuerpos encontrados. */
export function deductionAlerts(view: DeductionView, name: (id: string) => string, roomName: (id: string) => string): string[] {
  const alerts: string[] = []
  if (view.sabotage) alerts.push(view.sabotage.kind === 'reactor' ? t('deduction.sabotageReactor') : t('deduction.sabotageLights'))
  if (view.bodies.length) alerts.push(`${t('deduction.bodies')}: ${view.bodies.map((b) => `${name(b.who)} (${roomName(b.room)})`).join(', ')}`)
  return alerts
}

/**
 * La votacion de una reunion para quien mira: a quien puede votar (vivos
 * menos el mismo), su voto actual, y si puede votar (los fantasmas no).
 * Null fuera de una reunion o si no juega.
 */
export function deductionBallot(view: DeductionView, name: (id: string) => string, self: string | null): { canVote: boolean; options: Array<{ id: string; label: string; chosen: boolean }>; skipChosen: boolean; current: string | null; waiting: string } | null {
  if (view.phase !== 'reunion' || !view.me?.role) return null
  const vote = view.me.vote
  const current = vote ? (vote.target ? t('deduction.yourVote', { name: name(vote.target) }) : t('deduction.yourVoteSkip')) : null
  return {
    canVote: view.me.alive,
    options: view.alive.filter((id) => id !== self).map((id) => ({ id, label: t('deduction.voteFor', { name: name(id) }), chosen: vote?.target === id })),
    skipChosen: vote !== null && vote.target === null,
    current,
    waiting: view.pendingVotes.length ? t('deduction.waitingVotes', { names: view.pendingVotes.map(name).join(', ') }) : t('deduction.voted', { count: view.voted.length }),
  }
}

/**
 * En una reunion, quien falta para cerrar el turno son los vivos que no han
 * votado (no los que no han escrito: se puede votar sin hablar). Fuera de una
 * reunion, lo de siempre.
 */
export function deductionPending(view: DeductionView | null | undefined, usual: readonly string[]): string[] {
  if (!view || view.phase !== 'reunion') return [...usual]
  return [...view.pendingVotes]
}

/**
 * El progreso del turno en una reunion: completo cuando votaron todos los
 * vivos, y entonces se puede cerrar aunque nadie haya escrito. Un fantasma no
 * responde en una reunion. Fuera de una reunion, el de siempre.
 */
export function deductionProgress(progress: TurnProgress, view: DeductionView | null | undefined, open: boolean, host: boolean): TurnProgress {
  if (!view || view.phase !== 'reunion' || progress.narrating) return progress
  const complete = view.pendingVotes.length === 0
  const ghost = view.me !== null && !view.me.alive
  return { ...progress, pending: [...view.pendingVotes], complete, canClose: open && complete, canForceClose: open && !complete && host, canRespond: progress.canRespond && !ghost }
}
