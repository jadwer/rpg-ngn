'use client'

import { ApiError, createApiClient, normalizeBaseUrl, type InvitePreview } from '@rpg-ngn/api-client'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { WEB_HEADER, useSession } from '../../../lib/session'

/**
 * Donde acaba el enlace de una mesa (docs/18, D-UX-1).
 *
 * Es la pantalla que sustituye a los seis pasos de antes (dar tu correo por
 * WhatsApp, solicitud de amistad, aceptarla, esperar la invitacion). Por eso
 * hace dos cosas y ninguna mas:
 *
 * 1. **Dice a que te invitan antes de pedirte nada**: nombre de la mesa, quien
 *    invita y cuantos sitios quedan. Sin cuenta y sin haber entrado.
 * 2. Si ya tienes sesion, entras de un clic. Si no, te manda a crear cuenta y
 *    **vuelves aqui**, porque perder el enlace por el camino es la forma mas
 *    facil de perder a la persona.
 */
export default function UnirsePage() {
  const params = useParams<{ token: string }>()
  const token = typeof params.token === 'string' ? params.token : ''
  const router = useRouter()
  const session = useSession()

  const [preview, setPreview] = useState<InvitePreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  const anonClient = useCallback(
    () =>
      createApiClient({
        baseUrl: normalizeBaseUrl(session.serverUrl),
        tokenProvider: () => null,
        fetch: (url, init) => fetch(url, { ...init, headers: { ...init.headers, ...WEB_HEADER }, credentials: 'same-origin' }),
      }),
    [session.serverUrl],
  )

  useEffect(() => {
    if (!token) return
    let alive = true
    void anonClient()
      .invitePreview(token)
      .then(
        (p) => {
          if (alive) setPreview(p)
        },
        (caught: unknown) => {
          if (alive) setError(caught instanceof Error ? caught.message : String(caught))
        },
      )
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [token, anonClient])

  const entrar = async () => {
    setBusy(true)
    setError(null)
    try {
      const tableId = await (session.client ?? anonClient()).acceptInvite(token)
      router.push(`/mesas/${tableId}`)
    } catch (caught) {
      if (caught instanceof ApiError && caught.isUnauthorized) {
        // Sin sesion: que vuelva aqui despues de entrar o registrarse.
        router.push(`/entrar?volver=${encodeURIComponent(`/unirse/${token}`)}`)
        return
      }
      setError(caught instanceof Error ? caught.message : String(caught))
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
        <p className="tagline">Te invitaron a una mesa</p>
      </header>
      <hr className="rule" />

      {loading ? <p className="hint">Buscando la mesa...</p> : null}

      {!loading && error && !preview ? (
        <div className="card stack">
          <p>{error}</p>
          <p className="hint">Si crees que es un error, pídele al anfitrión que te mande el enlace otra vez.</p>
          <Link href="/" className="btn">
            Ir al inicio
          </Link>
        </div>
      ) : null}

      {preview ? (
        <div className="card stack">
          <h2 className="invite-name">{preview.tableName}</h2>
          {preview.hostName ? <p className="hint">Te invita {preview.hostName}.</p> : null}
          <p className="hint">
            {preview.alreadyMember
              ? 'Ya eres parte de esta mesa.'
              : preview.seatsLeft === 1
                ? 'Queda un sitio libre.'
                : `Quedan ${preview.seatsLeft} sitios libres.`}
          </p>

          {error ? <div className="error">{error}</div> : null}

          <div className="row">
            <button type="button" className="btn primary" disabled={busy} onClick={() => void entrar()}>
              {busy ? <span className="spinner" aria-hidden /> : null}
              {preview.alreadyMember ? 'Ir a la mesa' : 'Entrar a la mesa'}
            </button>
          </div>

          {!session.client ? (
            <p className="hint">
              Si no tienes cuenta, te pediremos crearla (nombre, correo y contraseña) y volverás aquí. <Link href="/terminos">Términos</Link> y{' '}
              <Link href="/privacidad">aviso de privacidad</Link>.
            </p>
          ) : null}

          <p className="hint">Aquí el director de juego es el motor: no hace falta que nadie del grupo sepa dirigir una partida.</p>
        </div>
      ) : null}
    </main>
  )
}
