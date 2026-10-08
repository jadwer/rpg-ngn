'use client'

import type { DeductionView } from '@rpg-ngn/api-client'
import { t } from '@rpg-ngn/i18n'
import { deductionAlerts, deductionBallot, deductionHeader, deductionRole, deductionTasks } from '@rpg-ngn/ui-logic'

/**
 * La partida de roles ocultos en la mesa (Turno de noche en la Persefone,
 * 08-10): la fase, tu rol, tus tareas y, en una reunion, la papeleta. Lo que
 * se ve lo filtro la API; aqui solo se pinta. Con las piezas que ya existen
 * (scene-hero, botones de la mesa): el diseño fino es de Gabino.
 */
export function DeductionPanel({ view, self, nameOf, roomName, busy, onVote }: { view: DeductionView; self: string | null; nameOf: (id: string) => string; roomName: (id: string) => string; busy: boolean; onVote: (target: string | null) => void }) {
  const role = deductionRole(view)
  const tasks = deductionTasks(view, roomName)
  const alerts = deductionAlerts(view, nameOf, roomName)
  const ballot = deductionBallot(view, nameOf, self)
  return (
    <section className={`deduction-panel hide-on-screen deduction-${role?.tone ?? 'none'}`} aria-label={deductionHeader(view)}>
      <p className="deduction-phase">{deductionHeader(view)}</p>
      {role ? (
        <p className="deduction-role">
          <b>{role.title}.</b> {role.hint}
        </p>
      ) : null}
      {alerts.map((alert) => (
        <p key={alert} className="deduction-alert">
          {alert}
        </p>
      ))}
      {tasks.length ? (
        <div className="deduction-tasks">
          <b>{t('deduction.myTasks')}</b>
          <ul>
            {tasks.map((task) => (
              <li key={task.id} className={task.done ? 'done' : undefined}>
                {task.label}
                {task.done ? ` (${t('deduction.taskDone')})` : ''}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {ballot ? (
        <div className="deduction-ballot">
          <b>{t('deduction.vote')}</b>
          {ballot.canVote ? (
            <div className="deduction-options">
              {ballot.options.map((option) => (
                <button key={option.id} type="button" className={option.chosen ? 'primary' : 'ghost'} disabled={busy} aria-pressed={option.chosen} onClick={() => onVote(option.id)}>
                  {option.label}
                </button>
              ))}
              <button type="button" className={ballot.skipChosen ? 'primary' : 'ghost'} disabled={busy} aria-pressed={ballot.skipChosen} onClick={() => onVote(null)}>
                {t('deduction.skip')}
              </button>
            </div>
          ) : (
            <p>{t('deduction.ghostNoVote')}</p>
          )}
          {ballot.current ? <p className="deduction-current">{ballot.current}</p> : null}
          <p className="deduction-waiting">{ballot.waiting}</p>
        </div>
      ) : null}
    </section>
  )
}
