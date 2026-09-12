'use client'

import type { ApiClient } from '@rpg-ngn/api-client'
import { useRouter } from 'next/navigation'
import { useEffect, type ReactNode } from 'react'
import { useSession } from '../lib/session'
import type { StoredUser } from '../lib/storage'

interface Props {
  children: (session: { client: ApiClient; user: StoredUser; unauthorized: (notice?: string) => void; logout: () => void }) => ReactNode
}

/** Pantallas que requieren sesion: mientras arranca, un aviso; sin sesion, al acceso. */
export function RequireSession({ children }: Props) {
  const session = useSession()
  const router = useRouter()

  useEffect(() => {
    if (session.stage.name === 'anonymous') router.replace('/')
  }, [session.stage, router])

  if (session.stage.name !== 'ready' || !session.client || !session.user) {
    return (
      <div className="page" style={{ textAlign: 'center', paddingTop: 80 }}>
        <span className="spinner" aria-hidden /> <span className="hint">Buscando la mesa...</span>
      </div>
    )
  }

  return <>{children({ client: session.client, user: session.user, unauthorized: session.unauthorized, logout: session.logout })}</>
}
