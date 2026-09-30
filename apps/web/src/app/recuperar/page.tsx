'use client'

import { t } from '@rpg-ngn/i18n'
import { createApiClient, normalizeBaseUrl } from '@rpg-ngn/api-client'
import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { WEB_HEADER, useSession } from '../../lib/session'

/**
 * Olvide mi contraseña: pide a la API el correo de recuperacion
 * (`POST /api/auth/forgot-password`). Solo funciona si el servidor tiene
 * correo configurado (MAIL_MAILER); en local va al log. La API responde lo
 * mismo exista o no la cuenta.
 */
export default function ForgotPasswordPage() {
  const session = useSession()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const api = createApiClient({ baseUrl: normalizeBaseUrl(session.serverUrl), tokenProvider: () => null, fetch: (url, init) => fetch(url, { ...init, headers: { ...init.headers, ...WEB_HEADER }, credentials: 'same-origin' }) })
      setDone(await api.forgotPassword(email))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="page narrow">
      <header className="hero">
        <h1>
          <Link href="/" className="plain">
            Ad Astra Mentis
          </Link>
        </h1>
        <p className="tagline">{t('auth.recoverTitle')}</p>
      </header>
      <hr className="rule" />
      {done ? (
        <div className="card stack">
          <p>{done}</p>
          <p className="hint">{t('auth.recoverNoMail')}</p>
          <Link href="/entrar" className="btn">
            {t('auth.backToSignIn')}
          </Link>
        </div>
      ) : (
        <form className="card stack" onSubmit={(e) => void submit(e)}>
          <p className="hint">{t('auth.recoverHint')}</p>
          <label className="field">
            <span>{t('auth.email')}</span>
            <input className="input" type="email" name="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required autoFocus />
          </label>
          {error ? <div className="error">{error}</div> : null}
          <div className="row">
            <button type="submit" className="btn primary" disabled={busy || !email}>
              {busy ? <span className="spinner" aria-hidden /> : null}
              {t('auth.sendLink')}
            </button>
            <Link href="/entrar" className="hint">
              {t('auth.backToSignIn')}
            </Link>
          </div>
        </form>
      )}
    </main>
  )
}
