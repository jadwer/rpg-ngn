'use client'

import Link from 'next/link'
import type { StoredUser } from '../lib/storage'
import { SystemMenu } from './SystemMenu'

interface Props {
  title: string
  user: StoredUser
  /** Ruta del boton de la izquierda (por defecto la lista de mesas); null lo oculta. */
  back?: { href: string; label: string } | null
  onLogout?: (() => void) | undefined
}

/** Barra superior de las pantallas con sesion: volver, titulo, y el menu del sitio (D-UX-6). */
export function UserBar({ title, user, back = { href: '/mesas', label: 'Mesas' }, onLogout }: Props) {
  return (
    <div className="topbar">
      {back ? (
        <Link href={back.href} className="btn ghost small">
          {back.label}
        </Link>
      ) : (
        <span style={{ width: 44 }} />
      )}
      <h1>{title}</h1>
      <SystemMenu user={user} onLogout={onLogout} />
    </div>
  )
}
