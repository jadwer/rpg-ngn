'use client'

import type { ReactNode } from 'react'

interface Props {
  title: string
  onClose: () => void
  children: ReactNode
  className?: string | undefined
}

/** Panel lateral (a pantalla completa en el telefono) para lo que se abre desde la barra del juego. */
export function Drawer({ title, onClose, children, className }: Props) {
  return (
    <aside className={`aside drawer${className ? ` ${className}` : ''}`} aria-label={title}>
      <div className="head">
        <span style={{ width: 64 }} />
        <h2>{title}</h2>
        <button type="button" className="btn ghost small" onClick={onClose}>
          Cerrar
        </button>
      </div>
      <div className="content">{children}</div>
    </aside>
  )
}
