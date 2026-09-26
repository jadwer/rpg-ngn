'use client'

import { createApiClient, normalizeBaseUrl, type ApiClient } from '@rpg-ngn/api-client'
import Link from 'next/link'
import { useMemo, type ReactNode } from 'react'
import { WEB_HEADER, useSession } from '../../lib/session'
import { LogoHorizontal } from '../Brand'
import { AppShell } from './AppShell'

/**
 * Para las paginas que se ven sin cuenta (Explorar mundos): con sesion, el
 * marco comun y el cliente con token; sin ella, una barra con el logo y
 * "Entrar", y un cliente sin token.
 */
export function PublicOrApp({ children }: { children: (client: ApiClient, signedIn: boolean) => ReactNode }) {
  const session = useSession()
  const publicClient = useMemo(
    () =>
      createApiClient({
        baseUrl: normalizeBaseUrl(session.serverUrl),
        tokenProvider: () => null,
        fetch: (url, init) => fetch(url, { ...init, headers: { ...init.headers, ...WEB_HEADER }, credentials: 'omit' }),
      }),
    [session.serverUrl],
  )

  // Mientras arranca no se sabe si hay cuenta: sin esto, quien tiene sesion
  // veia un instante la barra de "Entrar" y la pagina se montaba dos veces.
  if (session.stage.name === 'booting') return <div className="shell fondo-mesas" />

  if (session.client && session.user) {
    return (
      <AppShell user={session.user} onLogout={session.logout}>
        {children(session.client, true)}
      </AppShell>
    )
  }
  return (
    <div className="shell fondo-mesas">
      <header className="shell-top">
        <Link href="/" className="shell-logo" aria-label="Ad Astra Mentis, inicio">
          <LogoHorizontal height={34} />
        </Link>
        <div className="shell-actions">
          <Link href="/entrar?volver=/mundos/explorar" className="btn small">
            Entrar
          </Link>
          <Link href="/crear-cuenta?volver=/mundos/explorar" className="btn primary small">
            Crear cuenta
          </Link>
        </div>
      </header>
      <main className="shell-main">{children(publicClient, false)}</main>
    </div>
  )
}
