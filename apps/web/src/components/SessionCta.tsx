'use client'

import Link from 'next/link'
import { useSession } from '../lib/session'

/** Botones de la landing: entrar o crear cuenta; con sesion viva, directo a las mesas. */
export function SessionCta() {
  const session = useSession()

  if (session.stage.name === 'ready' && session.user) {
    return (
      <div className="cta">
        <Link href="/mesas" className="btn primary">
          Tus mesas
        </Link>
        <span className="hint">Sigues dentro como {session.user.name}.</span>
      </div>
    )
  }

  return (
    <div className="cta">
      <Link href="/entrar" className="btn primary">
        Entrar
      </Link>
      <Link href="/crear-cuenta" className="btn">
        Crear cuenta
      </Link>
    </div>
  )
}
