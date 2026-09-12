'use client'

import Link from 'next/link'
import type { StoredUser } from '../lib/storage'

interface Props {
  title: string
  user: StoredUser
  /** Ruta del boton de la izquierda (por defecto la lista de mesas); null lo oculta. */
  back?: { href: string; label: string } | null
  onLogout?: (() => void) | undefined
}

/** Barra superior de las pantallas con sesion: volver, titulo, y el menu de la cuenta (perfil, ajustes, salir). */
export function UserBar({ title, user, back = { href: '/mesas', label: 'Mesas' }, onLogout }: Props) {
  return (
    <div className="topbar">
      {back ? (
        <Link href={back.href} className="btn ghost small">
          {back.label}
        </Link>
      ) : null}
      <h1>{title}</h1>
      <nav className="account" aria-label="Cuenta">
        <Link href="/perfil" className="who" title="Tu perfil">
          {user.name}
        </Link>
        <Link href="/ajustes" className="btn ghost small" title="Voz e idioma de lectura">
          Ajustes
        </Link>
        {onLogout ? (
          <button type="button" className="btn ghost small" onClick={onLogout}>
            Salir
          </button>
        ) : null}
      </nav>
    </div>
  )
}
