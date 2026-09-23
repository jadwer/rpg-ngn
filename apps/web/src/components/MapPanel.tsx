'use client'

import { packMapUrl, type PackMapView } from '@rpg-ngn/api-client'
import type { CharacterState } from '@rpg-ngn/core'
import { currentMapIndex, mapEdges, mapView, whereEveryoneIs } from '@rpg-ngn/ui-logic'
import { useEffect, useMemo, useState } from 'react'

interface Props {
  packId: string
  /** Todos los mapas del pack; el que se enseña lo decide `currentMapIndex`. */
  maps: readonly PackMapView[]
  /** Fichas vivas por id, de la proyeccion de mundo que la mesa ya pide. */
  world: Record<string, CharacterState> | undefined
  party: readonly string[]
  /** Para abrir por omision el mapa donde esta el personaje de quien mira. */
  viewerCharacterId: string | null
  nameOf: (id: string) => string
  /** Retrato de un personaje, para el punto; null si no hay. */
  portraitOf: (id: string) => string | null
}

/**
 * El mapa de la mesa: la imagen que dibujo el creador del pack con los
 * lugares posados encima y quien esta en cada uno. No es un tablero
 * tactico, nadie se coloca en una casilla: las coordenadas del pack dicen
 * donde cae cada lugar, en porcentaje, y el estado dice quien esta alli.
 *
 * En el pie de la mesa solo vive la linea que resume donde esta la party; el
 * mapa se abre a pantalla completa. Dentro del pie se veia cortado en
 * escritorio, porque ese pie esta limitado al 55% del alto (Gabino, 21-09).
 */
export function MapPanel({ packId, maps, world, party, viewerCharacterId, nameOf, portraitOf }: Props) {
  const [open, setOpen] = useState(false)
  // El mapa elegido a mano en el modal; sin eleccion, el que toque por donde
  // esta la gente. Con un pack de dos mapas (pueblo y mina) enseñar siempre el
  // primero de la lista era enseñar la mina en una partida que empieza en la
  // posada.
  const [chosen, setChosen] = useState<number | null>(null)
  const index = chosen ?? currentMapIndex(maps, world, party, viewerCharacterId)
  const map = maps[index] ?? null
  const view = useMemo(() => mapView(map, world, party), [map, world, party])
  const edges = useMemo(() => (view ? mapEdges(view.pins) : []), [view])

  // Escape cierra, y mientras esta abierto la pagina de debajo no se mueve.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    const previo = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previo
    }
  }, [open])

  if (!view) return null

  const src = packMapUrl(packId, view.map.image)
  const resumen = whereEveryoneIs(view, nameOf)

  return (
    <>
      <section className="mapa" aria-label="Mapa de la partida">
        <button type="button" className="head" onClick={() => setOpen(true)}>
          <span className="t">Mapa: {view.map.name}</span>
          <span className="s">{resumen}</span>
          <span className="muted">abrir</span>
        </button>
      </section>

      {open ? (
        <div className="mapa-modal" role="dialog" aria-modal="true" aria-label={`Mapa: ${view.map.name}`} onClick={() => setOpen(false)}>
          <div className="caja" onClick={(e) => e.stopPropagation()}>
            <header>
              <div className="titulos">
                <h2>{view.map.name}</h2>
                <p className="hint">{resumen}</p>
                {maps.length > 1 ? (
                  <div className="segmented mapas" role="tablist" aria-label="Mapas del pack">
                    {maps.map((m, i) => (
                      <button key={m.id} type="button" role="tab" aria-selected={i === index} aria-pressed={i === index} onClick={() => setChosen(i)}>
                        {m.name}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <button type="button" className="btn ghost small" onClick={() => setOpen(false)}>
                Cerrar <span className="k">Esc</span>
              </button>
            </header>
            <div className="lienzo">
              {src ? <img src={src} alt={view.map.name} /> : null}
              {/* Los caminos: de aqui solo se va a donde el pack dice. */}
              <svg className="caminos" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
                {edges.map((e) => (
                  <line key={`s-${e.from.id}-${e.to.id}`} x1={e.from.x} y1={e.from.y} x2={e.to.x} y2={e.to.y} />
                ))}
                {edges.map((e) => (
                  <line className="oro" key={`o-${e.from.id}-${e.to.id}`} x1={e.from.x} y1={e.from.y} x2={e.to.x} y2={e.to.y} />
                ))}
              </svg>
              {view.pins.map((pin) => (
                <div key={pin.id} className={`pin${pin.who.length ? ' con-gente' : ''}`} style={{ left: `${pin.x}%`, top: `${pin.y}%` }}>
                  <span className="punto" aria-hidden />
                  <span className="etiqueta">{pin.name}</span>
                  {pin.who.length ? (
                    <span className="gente">
                      {pin.who.map((id) => {
                        const retrato = portraitOf(id)
                        return retrato ? <img key={id} src={retrato} alt={nameOf(id)} title={nameOf(id)} /> : <b key={id} title={nameOf(id)}>{nameOf(id).slice(0, 1)}</b>
                      })}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
            <footer>
              {view.offMap.length ? <p className="hint">De camino o fuera de escena: {view.offMap.map(nameOf).join(', ')}.</p> : null}
              {view.map.description ? <p className="hint">{view.map.description}</p> : null}
            </footer>
          </div>
        </div>
      ) : null}
    </>
  )
}
