import type { ReactNode } from 'react'

/**
 * Una seccion de hoja (Lectura, Anfitrion, Jugadores, Nueva mesa): superficie
 * translucida sobre la textura del panel y su titulo en Cinzel dorado, igual
 * que en la app (27-09). Antes cada seccion era una etiqueta gris suelta.
 */
export function Panel({ title, children, className, labelledBy }: { title?: string; children: ReactNode; className?: string; labelledBy?: string }) {
  return (
    <section className={`hoja-panel${className ? ` ${className}` : ''}`} aria-label={labelledBy ?? title}>
      {title ? <h3 className="hoja-titulo">{title}</h3> : null}
      {children}
    </section>
  )
}
