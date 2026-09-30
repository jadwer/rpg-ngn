'use client'

import { t } from '@rpg-ngn/i18n'
import Link from 'next/link'
import { LanguageSwitch } from '../../components/LanguageSwitch'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState, type FormEvent } from 'react'
import { destinoSeguro } from '../../lib/volver'
import { ServerField } from '../../components/ServerField'
import { useSession } from '../../lib/session'
import { displayServerUrl } from '../../lib/storage'

/**
 * Registro: nombre, correo, contraseña y confirmacion. Con la verificacion
 * de correo apagada en la API (ATOMO_REQUIRE_EMAIL_VERIFICATION=false) se
 * entra directo; con ella encendida se muestra el aviso y se espera el
 * enlace del correo.
 */
function RegisterPageForm() {
  const session = useSession()
  const router = useRouter()
  // A donde volver: lo pone quien nos mando aqui (por ejemplo un enlace de
  // mesa). Sin esto, quien llega por invitacion acaba en su lista vacia.
  const destino = destinoSeguro(useSearchParams().get('volver'))
  const [server, setServer] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [adult, setAdult] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<string | null>(null)

  useEffect(() => {
    if (session.stage.name === 'ready') router.replace(destino)
  }, [session.stage, router, destino])

  useEffect(() => {
    if (session.stage.name === 'anonymous') setServer((current) => current || displayServerUrl(session.serverUrl))
  }, [session.stage, session.serverUrl])

  const mismatch = confirmation.length > 0 && password !== confirmation
  const tooShort = password.length > 0 && password.length < 8

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (mismatch || tooShort) return
    setBusy(true)
    setError(null)
    const sameOrigin = typeof window !== 'undefined' && server.trim().replace(/\/+$/, '') === window.location.origin
    const outcome = await session.register(sameOrigin ? '' : server, { name, email, password, passwordConfirmation: confirmation, ageConfirmed: adult })
    setBusy(false)
    if (!outcome.ok) setError(outcome.error)
    else if (outcome.pendingVerification) setPending(outcome.message)
    else router.replace(destino)
  }

  return (
    <main className="page narrow">
      <header className="hero">
        <h1>
          <Link href="/" className="plain">
            Ad Astra Mentis
          </Link>
        </h1>
        <p className="tagline">{t('auth.signUpTitle')}</p>
      </header>
      <hr className="rule" />

      {pending ? (
        <div className="card stack">
          <p>{pending}</p>
          <p className="hint">{t('auth.afterVerify')}</p>
          <Link href="/entrar" className="btn primary">
            {t('auth.goSignIn')}
          </Link>
        </div>
      ) : (
        <form className="card stack" onSubmit={(e) => void submit(e)}>
          <label className="field">
            <span>{t('auth.yourName')}</span>
            <input className="input" name="nombre" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder={t('auth.namePlaceholder')} maxLength={80} required autoFocus />
          </label>
          <label className="field">
            <span>{t('auth.email')}</span>
            <input className="input" type="email" name="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" required />
          </label>
          <label className="field">
            <span>{t('auth.password')}</span>
            <input className="input" type="password" name="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={8} required />
            <span className="hint" style={{ textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-serif)' }}>
              {t('auth.atLeast8')}
            </span>
          </label>
          <label className="field">
            <span>{t('auth.repeatPassword')}</span>
            <input className="input" type="password" name="password_confirmation" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} autoComplete="new-password" minLength={8} required />
          </label>
          {tooShort ? <div className="error">{t('auth.tooShort')}</div> : null}
          {mismatch ? <div className="error">{t('auth.mismatch')}</div> : null}
          <label className="check">
            <input type="checkbox" name="age_confirmed" checked={adult} onChange={(e) => setAdult(e.target.checked)} />
            {t('auth.adult')}
          </label>
          {error ? <div className="error">{error}</div> : null}
          <div className="row">
            <button type="submit" className="btn primary" disabled={busy || !name.trim() || !email || !password || !confirmation || mismatch || tooShort || !adult}>
              {busy ? <span className="spinner" aria-hidden /> : null}
              {t('auth.createAccount')}
            </button>
            <span className="hint">{t('auth.straightToTables')}</span>
          </div>
          <p className="hint">
            {t('auth.acceptPrefix')} <Link href="/terminos">{t('auth.terms')}</Link> {t('auth.andThe')}{' '}
            <Link href="/privacidad">{t('auth.privacy')}</Link>.
          </p>
          <p className="hint">
            {t('auth.haveAccount')} <Link href={`/entrar?volver=${encodeURIComponent(destino)}`}>{t('auth.signInHere')}</Link>.
          </p>
          <ServerField value={server} onChange={setServer} />
        </form>
      )}
      <div className="language-row">
        <LanguageSwitch compact />
      </div>
    </main>
  )
}

/**
 * `useSearchParams` obliga a Suspense: sin el, Next no puede prerenderizar
 * esta pagina y el build falla. El parametro `volver` lo usa el enlace de
 * invitacion para traer de vuelta a quien tuvo que registrarse.
 */
export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterPageForm />
    </Suspense>
  )
}
