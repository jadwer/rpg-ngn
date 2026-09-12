'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type FormEvent } from 'react'
import { ServerField } from '../../components/ServerField'
import { useSession } from '../../lib/session'
import { displayServerUrl } from '../../lib/storage'

/**
 * Registro: nombre, correo, contraseña y confirmacion. Con la verificacion
 * de correo apagada en la API (ATOMO_REQUIRE_EMAIL_VERIFICATION=false) se
 * entra directo; con ella encendida se muestra el aviso y se espera el
 * enlace del correo.
 */
export default function RegisterPage() {
  const session = useSession()
  const router = useRouter()
  const [server, setServer] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<string | null>(null)

  useEffect(() => {
    if (session.stage.name === 'ready') router.replace('/mesas')
  }, [session.stage, router])

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
    else router.replace('/mesas')
  }

  return (
    <main className="page narrow">
      <header className="hero">
        <h1>
          <Link href="/" className="plain">
            rpg-ngn
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
            ¿Ya tienes cuenta? <Link href="/entrar">Entra aquí</Link>.
          </p>
          <ServerField value={server} onChange={setServer} />
        </form>
      )}
    </main>
  )
}
