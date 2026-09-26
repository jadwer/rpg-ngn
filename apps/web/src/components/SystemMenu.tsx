'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import type { StoredUser } from '../lib/storage'

interface Props {
  user: StoredUser
  onLogout?: (() => void) | undefined
  /** `avatar`: la inicial y el nombre, como en la barra del marco comun (26-09). */
  variant?: 'burger' | 'avatar' | undefined
}

/**
 * Menu de sistema y sitio (docs/18, D-UX-6): mesas, perfil, ajustes, salir.
 * Es una hamburguesa porque durante la partida casi no se toca; lo del juego
 * (fichas, mapa, jugadores) va en su propia barra. El saldo vive aqui y no
 * en la mesa (D-UX-4).
 */
export function SystemMenu({ user, onLogout, variant = 'burger' }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="sysmenu" ref={ref}>
      {variant === 'avatar' ? (
        <button type="button" className="sysmenu-avatar" aria-label="Menú de tu cuenta" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          <span className="inicial" aria-hidden>
            {(user.name.trim()[0] ?? '?').toUpperCase()}
          </span>
          <span className="nombre">{user.name}</span>
          <span className="flecha" aria-hidden>
            ▾
          </span>
        </button>
      ) : (
        <button type="button" className="sysmenu-btn" aria-label="Menú del sitio" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          <span className="bars" aria-hidden>
            <i />
            <i />
            <i />
          </span>
        </button>
      )}
      {open ? (
        <nav className="sysmenu-panel" role="menu" aria-label="Sitio">
          <div className="who">{user.name}</div>
          <Link role="menuitem" href="/mesas" onClick={() => setOpen(false)}>
            Mesas
          </Link>
          <Link role="menuitem" href="/mesas/nueva" onClick={() => setOpen(false)}>
            Nueva mesa
          </Link>
          <Link role="menuitem" href="/mundos/explorar" onClick={() => setOpen(false)}>
            Explorar mundos
          </Link>
          <Link role="menuitem" href="/mundos" onClick={() => setOpen(false)}>
            Mis mundos
          </Link>
          <Link role="menuitem" href="/perfil" onClick={() => setOpen(false)}>
            Mi cuenta y créditos
          </Link>
          <Link role="menuitem" href="/ajustes" onClick={() => setOpen(false)}>
            Voz
          </Link>
          <Link role="menuitem" href="/guia" onClick={() => setOpen(false)}>
            Guía del anfitrión
          </Link>
          {onLogout ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                onLogout()
              }}
            >
              Salir
            </button>
          ) : null}
        </nav>
      ) : null}
    </div>
  )
}
