'use client'

import { packMapUrl, type PackMapView } from '@rpg-ngn/api-client'
import type { CharacterState } from '@rpg-ngn/core'
import { mapEdges, mapView, whereEveryoneIs } from '@rpg-ngn/ui-logic'
import { useMemo, useState } from 'react'

interface Props {
  packId: string
  map: PackMapView | null
  /** Fichas vivas por id, de la proyeccion de mundo que la mesa ya pide. */
  world: Record<string, CharacterState> | undefined
  party: readonly string[]
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
 * Se pliega, porque en una partida la narracion manda y el mapa se consulta
 * a ratos.
 */
export function MapPanel({ packId, map, world, party, nameOf, portraitOf }: Props) {
  const [open, setOpen] = useState(false)
  const view = useMemo(() => mapView(map, world, party), [map, world, party])
  const edges = useMemo(() => (view ? mapEdges(view.pins) : []), [view])
  if (!view) return null

  const src = packMapUrl(packId, view.map.image)
  const resumen = whereEveryoneIs(view, nameOf)

  return (
    <section className="mapa" aria-label="Mapa de la partida">
      <button type="button" className="head" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="t">Mapa: {view.map.name}</span>
        <span className="s">{resumen}</span>
        <span className="muted">{open ? 'ocultar' : 'mostrar'}</span>
      </button>
      {open ? (
        <div className="body">
          <div className="lienzo">
            {src ? <img src={src} alt={view.map.name} /> : null}
            {/* Los caminos: de aqui solo se va a donde el pack dice. */}
            <svg className="caminos" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
              {edges.map((e) => (
                <line key={`${e.from.id}-${e.to.id}`} x1={e.from.x} y1={e.from.y} x2={e.to.x} y2={e.to.y} />
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
          {view.offMap.length ? <p className="hint">De camino o fuera de escena: {view.offMap.map(nameOf).join(', ')}.</p> : null}
          {view.map.description ? <p className="hint">{view.map.description}</p> : null}
        </div>
      ) : null}
    </section>
  )
}
