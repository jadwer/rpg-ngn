'use client'

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
            rpg-ngn
          </Link>
        </h1>
        <p className="tagline">Recuperar contraseña</p>
      </header>
      <hr className="rule" />
      {done ? (
        <div className="card stack">
          <p>{done}</p>
          <p className="hint">Si este servidor no tiene correo configurado, pídele al anfitrión de tu mesa que te ayude.</p>
          <Link href="/entrar" className="btn">
            Volver a entrar
          </Link>
        </div>
      ) : (
        <form className="card stack" onSubmit={(e) => void submit(e)}>
          <p className="hint">Escribe tu correo y, si el servidor tiene el correo configurado, te llegará un enlace para cambiar la contraseña.</p>
          <label className="field">
            <span>Correo</span>
            <input className="input" type="email" name="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required autoFocus />
          </label>
          {error ? <div className="error">{error}</div> : null}
          <div className="row">
            <button type="submit" className="btn primary" disabled={busy || !email}>
              {busy ? <span className="spinner" aria-hidden /> : null}
              Enviar enlace
            </button>
            <Link href="/entrar" className="hint">
              Volver a entrar
            </Link>
          </div>
        </form>
      )}
    </main>
  )
}
