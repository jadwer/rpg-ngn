'use client'

import { t } from '@rpg-ngn/i18n'
import { ApiError, type ApiClient, type SupportTicket } from '@rpg-ngn/api-client'
import { SUPPORT_MESSAGE_MAX, SUPPORT_MESSAGE_MIN, SUPPORT_SUBJECT_MAX, supportAbout, supportContext } from '@rpg-ngn/ui-logic'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { Drawer } from './Drawer'
import { Panel } from './Panel'

interface Props {
  client: ApiClient
  onClose: () => void
  /** Desde la mesa: se ofrece adjuntarla (el turno en curso si lo hay). */
  table?: { tableId: string | number; turnId?: number | null | undefined } | null | undefined
  onUnauthorized?: (() => void) | undefined
}

/**
 * Reportar un problema: el mismo panel lateral que los de la barra del juego,
 * para abrirlo desde la mesa o desde Mi cuenta. Desde la mesa la adjunta por
 * defecto, asi el equipo sabe donde paso sin preguntar. Al enviar deja el
 * enlace al reporte, que es el mismo que llega por correo.
 */
export function ReportProblem({ client, onClose, table, onUnauthorized }: Props) {
  const path = usePathname() ?? '/'
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [attach, setAttach] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState<SupportTicket | null>(null)

  const length = message.trim().length
  const tooShort = length < SUPPORT_MESSAGE_MIN

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (tooShort || busy) return
    setBusy(true)
    setError(null)
    try {
      const about = supportAbout(table ?? null, attach)
      const context = supportContext({ path, userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null })
      const ticket = await client.createSupportTicket({ subject, message, context, ...(about ? { about } : {}) })
      setSent(ticket)
    } catch (caught) {
      if (caught instanceof ApiError && caught.isUnauthorized && onUnauthorized) onUnauthorized()
      // El ApiError ya trae el `error` del servidor o el primer mensaje de validacion.
      else setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Drawer title={t('support.reportarUnProblema')} onClose={onClose} className="report-drawer">
      <div className="hojas">
        {sent ? (
          <Panel title={t('support.reportarUnProblema')}>
            <div className="ok" role="status">
              {t('support.recibido')}
            </div>
            <div className="row">
              <Link href={`/soporte/${sent.id}`} className="btn primary" onClick={onClose}>
                {t('support.verReporte')}
              </Link>
              <button type="button" className="btn ghost small" onClick={onClose}>
                {t('support.cerrar')}
              </button>
            </div>
          </Panel>
        ) : (
          <Panel title={t('support.reportarUnProblema')}>
            <form className="stack" onSubmit={(e) => void submit(e)}>
              <label className="field">
                <span>{t('support.asunto')}</span>
                <input className="input" name="asunto" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t('support.asuntoPlaceholder')} maxLength={SUPPORT_SUBJECT_MAX} />
              </label>
              <label className="field">
                <span>{t('support.quepaso')}</span>
                <textarea
                  className="textarea"
                  name="mensaje"
                  rows={6}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t('support.mensajePlaceholder')}
                  minLength={SUPPORT_MESSAGE_MIN}
                  maxLength={SUPPORT_MESSAGE_MAX}
                  required
                  autoFocus
                />
              </label>
              {tooShort ? <p className="hint">{t('support.minimoCaracteres', { min: SUPPORT_MESSAGE_MIN, count: length })}</p> : null}
              {table ? (
                <>
                  <label className="check">
                    <input type="checkbox" checked={attach} onChange={(e) => setAttach(e.target.checked)} />
                    {t('support.adjuntarEstaMesa')}
                  </label>
                  {attach ? <p className="hint">{t('support.adjuntarHint')}</p> : null}
                </>
              ) : null}
              {error ? <div className="error">{error}</div> : null}
              <div className="row">
                <button type="submit" className="btn primary" disabled={busy || tooShort}>
                  {busy ? <span className="spinner" aria-hidden /> : null}
                  {busy ? t('support.enviando') : t('support.enviarReporte')}
                </button>
                <Link href="/soporte" className="btn ghost small" onClick={onClose}>
                  {t('support.misReportes')}
                </Link>
              </div>
            </form>
          </Panel>
        )}
      </div>
    </Drawer>
  )
}
