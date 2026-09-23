'use client'

import Link from 'next/link'
import { useSession } from '../lib/session'

interface Props {
  /** `hero`: el boton grande de la portada; `nav`: los dos enlaces chicos de la barra; `landing`: el par clasico. */
  variant?: 'landing' | 'hero' | 'nav'
}

/** Botones de la portada: entrar o crear cuenta; con sesion viva, directo a las mesas. */
export function SessionCta({ variant = 'landing' }: Props) {
  const session = useSession()
  const dentro = session.stage.name === 'ready' && !!session.user

  if (variant === 'nav') {
    return dentro ? (
      <Link href="/mesas" className="btn primary small">
        Tus mesas
      </Link>
    ) : (
      <>
        <Link href="/entrar" className="btn ghost small">
          Iniciar sesión
        </Link>
        <Link href="/crear-cuenta" className="btn primary small">
          Comienza ahora
        </Link>
      </>
    )
  }

  if (variant === 'hero') {
    return dentro ? (
      <div className="cta">
        <Link href="/mesas" className="btn primary big">
          Ir a tus mesas
        </Link>
        <span className="hint">Sigues dentro como {session.user?.name}.</span>
      </div>
    ) : (
      <div className="cta">
        <Link href="/crear-cuenta" className="btn primary big">
          Comienza tu historia
        </Link>
        <Link href="/entrar" className="btn ghost">
          Ya tengo cuenta
        </Link>
      </div>
    )
  }

  if (dentro) {
    return (
      <div className="cta">
        <Link href="/mesas" className="btn primary">
          Tus mesas
        </Link>
        <span className="hint">Sigues dentro como {session.user?.name}.</span>
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
