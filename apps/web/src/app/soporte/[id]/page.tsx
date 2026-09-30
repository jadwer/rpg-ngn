'use client'

import { t } from '@rpg-ngn/i18n'
import { ApiError, type ApiClient, type SupportTicket } from '@rpg-ngn/api-client'
import { SUPPORT_MESSAGE_MAX, SUPPORT_REPLY_MIN, supportStatusLabel } from '@rpg-ngn/ui-logic'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { RequireSession } from '../../../components/RequireSession'
import { AppShell } from '../../../components/shell/AppShell'
import { ShellIcon } from '../../../components/shell/icons'
import { absoluteDate } from '../../../lib/support'

export default function SupportTicketPage() {
  const params = useParams<{ id: string }>()
  return (
    <RequireSession>
      {({ client, user, unauthorized, logout }) => (
        <AppShell user={user} onLogout={logout}>
          <Conversation client={client} ticketId={params.id} unauthorized={unauthorized} />
        </AppShell>
      )}
    </RequireSession>
  )
}

/**
 * Un reporte y su conversacion con el equipo. Es la pagina a la que lleva el
 * correo de soporte. Responder un reporte resuelto lo vuelve a abrir, y se
 * avisa antes para que nadie lo haga sin querer.
 */
function Conversation({ client, ticketId, unauthorized }: { client: ApiClient; ticketId: string; unauthorized: (notice?: string) => void }) {
  const [ticket, setTicket] = useState<SupportTicket | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)
  const [replyError, setReplyError] = useState<string | null>(null)

  const fail = useCallback(
    (caught: unknown, set: (text: string) => void) => {
      if (caught instanceof ApiError && caught.isUnauthorized) unauthorized()
      else set(caught instanceof Error ? caught.message : String(caught))
    },
    [unauthorized],
  )

  useEffect(() => {
    let alive = true
    setError(null)
    void client.supportTicket(ticketId).then(
      (loaded) => {
        if (alive) setTicket(loaded)
      },
      (caught: unknown) => {
        if (alive) fail(caught, setError)
      },
    )
    return () => {
      alive = false
    }
  }, [client, ticketId, fail])

  const tooShort = reply.trim().length < SUPPORT_REPLY_MIN

  const send = async (event: FormEvent) => {
    event.preventDefault()
    if (tooShort || busy) return
    setBusy(true)
    setReplyError(null)
    try {
      setTicket(await client.replySupportTicket(ticketId, reply))
      setReply('')
    } catch (caught) {
      fail(caught, setReplyError)
    } finally {
      setBusy(false)
    }
  }

  const messages = (ticket?.messages ?? []).filter((m) => !m.internal)

  return (
    <div className="page en-shell narrow soporte">
      <Link href="/soporte" className="soporte-volver">
        <ShellIcon name="volver" /> {t('support.volverAMisReportes')}
      </Link>

      {error ? <div className="error">{error}</div> : null}
      {ticket === null && !error ? (
        <p className="hint">
          <span className="spinner" aria-hidden /> {t('support.cargando')}
        </p>
      ) : null}

      {ticket ? (
        <>
          <h1 className="pagina-titulo soporte-titulo">{ticket.subject}</h1>
          <div className="row" style={{ marginBottom: 16 }}>
            <span className={ticket.status === 'waiting_user' ? 'badge' : 'badge quiet'}>
              {t('support.estado')}: {supportStatusLabel(ticket.status)}
            </span>
            {ticket.about?.label ? <span className="hint">{t('support.sobre', { label: ticket.about.label })}</span> : null}
            {ticket.createdAt ? <span className="hint">{t('support.enviado', { when: absoluteDate(ticket.createdAt) })}</span> : null}
          </div>

          {messages.length === 0 ? <p className="hint">{t('support.sinMensajes')}</p> : null}
          <ol className="soporte-mensajes">
            {messages.map((m) => (
              <li key={m.id} className={`card soporte-msg${m.fromTeam ? ' equipo' : ' mio'}`}>
                <div className="soporte-autor">
                  <span className={m.fromTeam ? 'badge' : 'badge quiet'}>{m.fromTeam ? t('support.equipo') : t('support.tu')}</span>
                  {m.createdAt ? <span className="hint">{absoluteDate(m.createdAt)}</span> : null}
                </div>
                <p className="soporte-cuerpo">{m.body}</p>
              </li>
            ))}
          </ol>

          <form className="card stack" style={{ marginTop: 16 }} onSubmit={(e) => void send(e)}>
            <label className="field">
              <span>{t('support.responder')}</span>
              <textarea className="textarea" name="respuesta" rows={4} value={reply} onChange={(e) => setReply(e.target.value)} placeholder={t('support.respuestaPlaceholder')} maxLength={SUPPORT_MESSAGE_MAX} required />
            </label>
            {ticket.status === 'resolved' ? <p className="hint">{t('support.resueltoHint')}</p> : null}
            {replyError ? <div className="error">{replyError}</div> : null}
            <div className="row">
              <button type="submit" className="btn primary" disabled={busy || tooShort}>
                {busy ? <span className="spinner" aria-hidden /> : null}
                {busy ? t('support.enviando') : t('support.enviarRespuesta')}
              </button>
            </div>
          </form>
        </>
      ) : null}
    </div>
  )
}
