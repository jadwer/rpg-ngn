'use client'

import Link from 'next/link'
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
    const outcome = await session.register(sameOrigin ? '' : server, { name, email, password, passwordConfirmation: confirmation })
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
        <p className="tagline">Crear cuenta</p>
      </header>
      <hr className="rule" />

      {pending ? (
        <div className="card stack">
          <p>{pending}</p>
          <p className="hint">Cuando hayas verificado el correo, entra con tu contraseña.</p>
          <Link href="/entrar" className="btn primary">
            Ir a entrar
          </Link>
        </div>
      ) : (
        <form className="card stack" onSubmit={(e) => void submit(e)}>
          <label className="field">
            <span>Tu nombre</span>
            <input className="input" name="nombre" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Como te verán en la mesa" maxLength={80} required autoFocus />
          </label>
          <label className="field">
            <span>Correo</span>
            <input className="input" type="email" name="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" required />
          </label>
          <label className="field">
            <span>Contraseña</span>
            <input className="input" type="password" name="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={8} required />
            <span className="hint" style={{ textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-serif)' }}>
              Al menos 8 caracteres.
            </span>
          </label>
          <label className="field">
            <span>Repite la contraseña</span>
            <input className="input" type="password" name="password_confirmation" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} autoComplete="new-password" minLength={8} required />
          </label>
          {tooShort ? <div className="error">La contraseña necesita al menos 8 caracteres.</div> : null}
          {mismatch ? <div className="error">Las contraseñas no coinciden.</div> : null}
          {error ? <div className="error">{error}</div> : null}
          <div className="row">
            <button type="submit" className="btn primary" disabled={busy || !name.trim() || !email || !password || !confirmation || mismatch || tooShort}>
              {busy ? <span className="spinner" aria-hidden /> : null}
              Crear cuenta
            </button>
            <span className="hint">Entras directo a tus mesas.</span>
          </div>
          <p className="hint">
            Al crear la cuenta declaras que eres mayor de 18 años y aceptas los <Link href="/terminos">términos y condiciones</Link> y el{' '}
            <Link href="/privacidad">aviso de privacidad</Link>.
          </p>
          <p className="hint">
            ¿Ya tienes cuenta? <Link href={`/entrar?volver=${encodeURIComponent(destino)}`}>Entra aquí</Link>.
          </p>
          <ServerField value={server} onChange={setServer} />
        </form>
      )}
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
