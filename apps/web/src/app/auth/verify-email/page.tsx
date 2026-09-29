'use client'

import { createApiClient, normalizeBaseUrl } from '@rpg-ngn/api-client'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { WEB_HEADER, useSession } from '../../../lib/session'

/**
 * Confirmar el correo con el enlace que llego por correo (el de bienvenida o
 * uno pedido de nuevo en Mi cuenta).
 *
 * La ruta la arma `atomo-auth`: `<frontend>/auth/verify-email?id&hash&expires&signature`.
 * La pagina llama a la API con esa misma consulta; sin la firma del servidor,
 * o pasado el plazo, la API responde 403. Confirmar el correo es lo que hace
 * falta para crear mesas (ser anfitrion); entrar a la de otro no lo pide.
 */
export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmail />
    </Suspense>
  )
}

type Estado = { kind: 'working' } | { kind: 'done'; message: string } | { kind: 'failed'; message: string } | { kind: 'incomplete' }

function VerifyEmail() {
  const session = useSession()
  const params = useSearchParams()
  const link = { id: params.get('id') ?? '', hash: params.get('hash') ?? '', expires: params.get('expires') ?? '', signature: params.get('signature') ?? '' }
  const complete = link.id !== '' && link.hash !== '' && link.expires !== '' && link.signature !== ''
  const [estado, setEstado] = useState<Estado>(complete ? { kind: 'working' } : { kind: 'incomplete' })

  useEffect(() => {
    if (!complete) return
    let alive = true
    const api = createApiClient({
      baseUrl: normalizeBaseUrl(session.serverUrl),
      tokenProvider: () => null,
      fetch: (url, init) => fetch(url, { ...init, headers: { ...init.headers, ...WEB_HEADER }, credentials: 'same-origin' }),
    })
    api
      .verifyEmail(link)
      .then((message) => alive && setEstado({ kind: 'done', message }))
      .catch(() =>
        alive &&
        setEstado({ kind: 'failed', message: 'Este enlace ya no sirve: caducó o llegó incompleto. Pide otro en Mi cuenta y ábrelo tal cual viene en el correo.' }),
      )
    return () => {
      alive = false
    }
    // El enlace no cambia mientras la pagina esta abierta: se confirma una vez.
  }, [])

  return (
    <main className="page narrow">
      <header className="hero">
        <h1>
          <Link href="/" className="plain">
            Ad Astra Mentis
          </Link>
        </h1>
        <p className="tagline">Confirmar tu correo</p>
      </header>
      <hr className="rule" />

      <div className="card stack">
        {estado.kind === 'working' ? <p>Confirmando tu correo…</p> : null}
        {estado.kind === 'done' ? (
          <>
            <p>Listo: tu correo quedó confirmado. Ya puedes crear mesas y ser anfitrión.</p>
            <Link href="/mesas" className="btn">
              Ir a mis mesas
            </Link>
          </>
        ) : null}
        {estado.kind === 'failed' || estado.kind === 'incomplete' ? (
          <>
            <p>{estado.kind === 'failed' ? estado.message : 'Este enlace está incompleto. Ábrelo tal cual viene en el correo, sin recortarlo.'}</p>
            <Link href="/perfil" className="btn">
              Pedir otro enlace
            </Link>
          </>
        ) : null}
      </div>
    </main>
  )
}
