'use client'

import { language, t } from '@rpg-ngn/i18n'
import { createApiClient, normalizeBaseUrl } from '@rpg-ngn/api-client'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useState, type FormEvent } from 'react'
import { WEB_HEADER, useSession } from '../../../lib/session'

/**
 * Poner una contraseña nueva con el enlace que llego por correo.
 *
 * Esta es la direccion a la que apunta el correo de recuperacion, y por eso
 * la ruta tiene que llamarse asi: la arma `atomo-auth` como
 * `<frontend>/auth/reset-password?token=...&email=...`. Sin esta pagina el
 * correo llevaba a un 404, que era el ultimo tramo roto de recuperar la
 * contraseña.
 *
 * El token caduca a los 60 minutos y al cambiarla se cierran las sesiones
 * abiertas en otros dispositivos, asi que hay que volver a entrar.
 */
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  )
}

function ResetPasswordForm() {
  const session = useSession()
  const params = useSearchParams()
  const token = params.get('token') ?? ''
  const email = params.get('email') ?? ''

  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const corta = password.length > 0 && password.length < 8
  const distintas = repeat.length > 0 && password !== repeat
  const puede = password.length >= 8 && password === repeat && !busy

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const api = createApiClient({
        baseUrl: normalizeBaseUrl(session.serverUrl),
        tokenProvider: () => null,
        fetch: (url, init) => fetch(url, { ...init, headers: { ...init.headers, ...WEB_HEADER }, credentials: 'same-origin' }),
        locale: () => language(),
      })
      setDone(await api.resetPassword({ token, email, password, passwordConfirmation: repeat }))
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
        <p className="tagline">{t('auth.resetTitle')}</p>
      </header>
      <hr className="rule" />

      {!token || !email ? (
        <div className="card stack">
          <p>{t('auth.linkIncomplete')}</p>
          <p className="hint">{t('auth.resetLinkHelp')}</p>
          <Link href="/recuperar" className="btn">
            {t('auth.askAnotherLink')}
          </Link>
        </div>
      ) : done ? (
        <div className="card stack">
          <p>{done}</p>
          <p className="hint">{t('auth.otherSessionsClosed')}</p>
          <Link href="/entrar" className="btn primary">
            {t('auth.signIn')}
          </Link>
        </div>
      ) : (
        <form className="card stack" onSubmit={(e) => void submit(e)}>
          <p className="hint">
            {t('auth.changingFor')} <strong>{email}</strong>.
          </p>
          <label className="field">
            <span>{t('auth.newPassword')}</span>
            <input className="input" type="password" name="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required autoFocus minLength={8} />
          </label>
          <label className="field">
            <span>{t('auth.repeatIt')}</span>
            <input className="input" type="password" name="password_confirmation" value={repeat} onChange={(e) => setRepeat(e.target.value)} autoComplete="new-password" required minLength={8} />
          </label>
          {corta ? <p className="hint">{t('auth.atLeast8')}</p> : null}
          {distintas ? <p className="hint">{t('auth.twoDiffer')}</p> : null}
          {error ? <div className="error">{error}</div> : null}
          <div className="row">
            <button type="submit" className="btn primary" disabled={!puede}>
              {busy ? <span className="spinner" aria-hidden /> : null}
              {t('auth.savePassword')}
            </button>
            <Link href="/recuperar" className="hint">
              {t('auth.askAnotherLink')}
            </Link>
          </div>
        </form>
      )}
    </main>
  )
}
