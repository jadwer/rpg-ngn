'use client'

import { t } from '@rpg-ngn/i18n'
import { ApiError, type ApiClient, type SupportTicketSummary } from '@rpg-ngn/api-client'
import { relativeTime, supportStatusLabel } from '@rpg-ngn/ui-logic'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { ReportProblem } from '../../components/ReportProblem'
import { RequireSession } from '../../components/RequireSession'
import { AppShell } from '../../components/shell/AppShell'
import { absoluteDate } from '../../lib/support'

export default function SupportPage() {
  return (
    <RequireSession>
      {({ client, user, unauthorized, logout }) => (
        <AppShell user={user} onLogout={logout}>
          <MyReports client={client} unauthorized={unauthorized} />
        </AppShell>
      )}
    </RequireSession>
  )
}

/** Mis reportes: lo que la persona envio, el mas reciente primero, con su estado. */
function MyReports({ client, unauthorized }: { client: ApiClient; unauthorized: (notice?: string) => void }) {
  const [tickets, setTickets] = useState<SupportTicketSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reporting, setReporting] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      setTickets(await client.supportTickets())
    } catch (caught) {
      if (caught instanceof ApiError && caught.isUnauthorized) unauthorized()
      else setError(caught instanceof Error ? caught.message : String(caught))
    }
  }, [client, unauthorized])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="page en-shell narrow soporte">
      <h1 className="pagina-titulo">{t('support.misReportes')}</h1>
      <div className="row" style={{ marginBottom: 16 }}>
        <button type="button" className="btn primary" onClick={() => setReporting(true)}>
          {t('support.reportarUnProblema')}
        </button>
      </div>

      {error ? <div className="error">{error}</div> : null}
      {tickets === null && !error ? (
        <p className="hint">
          <span className="spinner" aria-hidden /> {t('support.cargando')}
        </p>
      ) : null}

      {tickets !== null && tickets.length === 0 ? (
        <div className="card stack">
          <p style={{ margin: 0 }}>{t('support.vacio')}</p>
          <p className="hint" style={{ margin: 0 }}>
            {t('support.vacioHint')}
          </p>
        </div>
      ) : null}

      {tickets !== null && tickets.length > 0 ? (
        <ul className="soporte-lista">
          {tickets.map((ticket) => {
            const last = ticket.lastMessageAt ?? ticket.createdAt
            return (
              <li key={ticket.id}>
                <Link href={`/soporte/${ticket.id}`} className="card plain soporte-item">
                  <span className="soporte-asunto">{ticket.subject}</span>
                  <span className="row">
                    <span className={ticket.status === 'waiting_user' ? 'badge' : 'badge quiet'}>{supportStatusLabel(ticket.status)}</span>
                    {last ? (
                      <span className="hint" title={absoluteDate(last)}>
                        {t('support.ultimaActividad', { when: relativeTime(last) })}
                      </span>
                    ) : null}
                  </span>
                  {ticket.about?.label ? <span className="hint">{t('support.sobre', { label: ticket.about.label })}</span> : null}
                </Link>
              </li>
            )
          })}
        </ul>
      ) : null}

      {reporting ? (
        <ReportProblem
          client={client}
          onClose={() => {
            setReporting(false)
            void load()
          }}
          onUnauthorized={() => unauthorized()}
        />
      ) : null}
    </div>
  )
}
