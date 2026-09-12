'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, type FormEvent } from 'react'
import { useSession } from '../lib/session'
import { displayServerUrl } from '../lib/storage'

/**
 * Acceso: URL de la API (por defecto el propio origen de la web, que Next
 * reenvia a la API), correo y contraseña. El token queda en localStorage
 * (provisional) hasta cerrar sesion.
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
    <main className="page">
      <header className="hero">
        <p className="motto">&ldquo;Extraños hoy, quizás una leyenda mañana.&rdquo;</p>
        <h1>rpg-ngn</h1>
        <p className="tagline">La mesa en el navegador</p>
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
            <span>Servidor de la API</span>
            <input className="input" value={server} onChange={(e) => setServer(e.target.value)} placeholder="http://192.168.100.11:8010" autoComplete="url" inputMode="url" />
            <span className="hint" style={{ textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-serif)' }}>
              Con la dirección de esta misma web, las peticiones pasan por su proxy y no hace falta CORS.
            </span>
          </label>
          <label className="field">
            <span>Correo</span>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required autoFocus />
          </label>
          <label className="field">
            <span>Contraseña</span>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          </label>
          {error ? <div className="error">{error}</div> : null}
          <div className="row">
            <button type="submit" className="btn primary" disabled={busy || !email || !password}>
              {busy ? <span className="spinner" aria-hidden /> : null}
              Entrar
            </button>
            <span className="hint">La sesión se guarda en este navegador hasta que salgas.</span>
          </div>
        </form>
      )}
      <footer className="hint" style={{ textAlign: 'center', marginTop: 28, fontVariant: 'small-caps', letterSpacing: '0.1em', fontStyle: 'normal' }}>
        El mundo es más grande cuando se comparte
      </footer>
    </main>
  )
}
