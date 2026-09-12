'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type FormEvent } from 'react'
import { ServerField } from '../../components/ServerField'
import { useSession } from '../../lib/session'
import { displayServerUrl } from '../../lib/storage'

/**
 * Acceso: correo y contraseña. Por defecto entra por el proxy de Next y el
 * token queda en una cookie httpOnly; el campo "Servidor de la API" (plegado)
 * sigue ahi para pegarle a otra API directamente.
 */
export default function AccessPage() {
  const session = useSession()
  const router = useRouter()
  const [server, setServer] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (session.stage.name === 'ready') router.replace('/mesas')
  }, [session.stage, router])

  useEffect(() => {
    if (session.stage.name === 'anonymous') setServer((current) => current || displayServerUrl(session.serverUrl))
  }, [session.stage, session.serverUrl])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const sameOrigin = typeof window !== 'undefined' && server.trim().replace(/\/+$/, '') === window.location.origin
    const failure = await session.login(sameOrigin ? '' : server, email, password)
    setBusy(false)
    if (failure) setError(failure)
    else router.replace('/mesas')
  }

  const notice = session.stage.name === 'anonymous' ? session.stage.notice : null

  return (
    <main className="page narrow">
      <header className="hero">
        <p className="motto">&ldquo;Extraños hoy, quizás una leyenda mañana.&rdquo;</p>
        <h1>
          <Link href="/" className="plain">
            rpg-ngn
          </Link>
        </h1>
        <p className="tagline">Entrar a la mesa</p>
      </header>
      <hr className="rule" />

      {session.stage.name === 'booting' ? (
        <p className="hint" style={{ textAlign: 'center' }}>
          <span className="spinner" aria-hidden /> Buscando tu sesión...
        </p>
      ) : (
        <form className="card stack" onSubmit={(e) => void submit(e)}>
          {notice ? <div className="error">{notice}</div> : null}
          <label className="field">
            <span>Correo</span>
            <input className="input" type="email" name="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required autoFocus />
          </label>
          <label className="field">
            <span>Contraseña</span>
            <input className="input" type="password" name="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          </label>
          {error ? <div className="error">{error}</div> : null}
          <div className="row">
            <button type="submit" className="btn primary" disabled={busy || !email || !password}>
              {busy ? <span className="spinner" aria-hidden /> : null}
              Entrar
            </button>
            <Link href="/recuperar" className="hint">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <p className="hint">
            ¿Todavía no tienes cuenta? <Link href="/crear-cuenta">Créala aquí</Link>, toma un minuto.
          </p>
          <ServerField value={server} onChange={setServer} />
        </form>
      )}
      <footer className="hint" style={{ textAlign: 'center', marginTop: 28, fontVariant: 'small-caps', letterSpacing: '0.1em', fontStyle: 'normal' }}>
        El mundo es más grande cuando se comparte
      </footer>
    </main>
  )
}
