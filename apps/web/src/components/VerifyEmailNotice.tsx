'use client'

import { t } from '@rpg-ngn/i18n'
import { ApiError, type ApiClient } from '@rpg-ngn/api-client'
import { useEffect, useState } from 'react'

/**
 * Aviso de correo sin confirmar, con el boton para pedir el enlace otra vez.
 * Confirmarlo es lo que hace falta para crear mesas (ser anfitrion); entrar a
 * la mesa de alguien no lo pide. Con el correo confirmado no se ve.
 */
export function VerifyEmailNotice({ client }: { client: ApiClient }) {
  const [verified, setVerified] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    let alive = true
    client
      .profile()
      .then((p) => alive && setVerified(p.emailVerified))
      .catch(() => alive && setVerified(true))
    return () => {
      alive = false
    }
  }, [client])

  if (verified !== false) return null

  const resend = async () => {
    setBusy(true)
    setNotice(null)
    try {
      setNotice({ ok: true, text: await client.resendVerification() })
    } catch (caught) {
      const text = caught instanceof ApiError && caught.status === 429 ? t('play.verifyThrottled') : caught instanceof Error ? caught.message : String(caught)
      setNotice({ ok: false, text })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card stack" style={{ marginBottom: 16 }}>
      <div className="label" style={{ marginTop: 0 }}>
        {t('verifyNotice.confirmaTuCorreo')}
      </div>
      <p style={{ margin: 0 }}>{t('verifyNotice.paraCrearMesasY')}</p>
      {notice ? <div className={notice.ok ? 'ok' : 'error'}>{notice.text}</div> : null}
      <div className="row">
        <button type="button" className="btn primary" disabled={busy} onClick={() => void resend()}>
          {busy ? <span className="spinner" aria-hidden /> : null}
          Enviarme el enlace otra vez
        </button>
      </div>
    </div>
  )
}
