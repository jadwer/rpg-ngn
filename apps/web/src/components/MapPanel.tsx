'use client'

import { packMapUrl, type PackMapView } from '@rpg-ngn/api-client'
import type { CharacterState } from '@rpg-ngn/core'
import { currentMapIndex, type Fingers, fingersFrom, mapEdges, mapView, whereEveryoneIs, ZOOM_IDENTITY, ZOOM_STEP, ZOOM_WHEEL, zoomGesture, type ZoomState, zoomStep } from '@rpg-ngn/ui-logic'
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react'

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
  /** Abierto desde fuera (la barra del juego); sin esto lo abre su propia linea. */
  open?: boolean | undefined
  onOpenChange?: ((open: boolean) => void) | undefined
  /** false: sin la linea plegada, solo el modal. */
  showLine?: boolean | undefined
}

/**
 * Zoom del mapa (Gabino, 26-09): rueda o pellizco para acercar, arrastrar
 * para moverse, botones y doble clic para volver. Transformacion CSS sobre
 * una capa interior: la caja sigue midiendo lo que la imagen, asi los puntos
 * en porcentaje no se mueven de su sitio. El calculo vive en ui-logic
 * (`map-zoom`), el mismo que usa la app; aqui solo los punteros.
 */
function useMapZoom() {
  const [z, setZ] = useState<ZoomState>(ZOOM_IDENTITY)
  const zRef = useRef(z)
  zRef.current = z
  const box = useRef<HTMLDivElement | null>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const base = useRef<ZoomState & Fingers>({ ...ZOOM_IDENTITY, count: 0, cx: 0, cy: 0, dist: 0 })

  const size = () => ({ w: box.current?.clientWidth ?? 0, h: box.current?.clientHeight ?? 0 })
  const fingers = () => fingersFrom([...pointers.current.values()])
  const rebase = () => {
    base.current = { ...zRef.current, ...fingers() }
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    // Los botones de zoom viven dentro del lienzo: su clic no es un arrastre.
    if ((e.target as HTMLElement).closest('button')) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Sin captura el arrastre sigue funcionando mientras el puntero este encima.
    }
    rebase()
  }
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const { w, h } = size()
    const next = zoomGesture(base.current, fingers(), w, h)
    if (next === null) rebase()
    else setZ(next)
  }
  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId)
    rebase()
  }
  const step = (factor: number) =>
    setZ((cur) => {
      const { w, h } = size()
      return zoomStep(cur, factor, w, h)
    })
  const onWheel = (e: ReactWheelEvent<HTMLDivElement>) => step(e.deltaY < 0 ? ZOOM_WHEEL : 1 / ZOOM_WHEEL)
  const reset = () => setZ(ZOOM_IDENTITY)
  return { z, box, reset, zoomIn: () => step(ZOOM_STEP), zoomOut: () => step(1 / ZOOM_STEP), handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onWheel, onDoubleClick: reset } }
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
export function MapPanel({ packId, maps, world, party, viewerCharacterId, nameOf, portraitOf, open: controlled, onOpenChange, showLine = true }: Props) {
  const zoom = useMapZoom()
  const [own, setOwn] = useState(false)
  const open = controlled ?? own
  const setOpen = (value: boolean) => {
    if (onOpenChange) onOpenChange(value)
    else setOwn(value)
  }
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
      {showLine ? (
        <section className="mapa" aria-label="Mapa de la partida">
          <button type="button" className="head" onClick={() => setOpen(true)}>
            <span className="t">Mapa: {view.map.name}</span>
            <span className="s">{resumen}</span>
            <span className="muted">abrir</span>
          </button>
        </section>
      ) : null}

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
                      <button key={m.id} type="button" role="tab" aria-selected={i === index} aria-pressed={i === index} onClick={() => {
                        setChosen(i)
                        zoom.reset()
                      }}>
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
            <div className={`lienzo zoomable${zoom.z.s > 1 ? ' acercado' : ''}`} ref={zoom.box} {...zoom.handlers}>
              <div className="capa" style={{ transform: `translate(${zoom.z.x}px, ${zoom.z.y}px) scale(${zoom.z.s})` }}>
              {src ? <img src={src} alt={view.map.name} draggable={false} /> : null}
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
              <div className="zoom-botones">
                <button type="button" aria-label="Acercar" onClick={zoom.zoomIn}>
                  +
                </button>
                <button type="button" aria-label="Alejar" onClick={zoom.zoomOut}>
                  −
                </button>
              </div>
            </div>
            <footer>
              <p className="hint">Rueda o pellizco para acercar, arrastra para moverte; doble clic vuelve al mapa entero.</p>
              {view.offMap.length ? <p className="hint">De camino o fuera de escena: {view.offMap.map(nameOf).join(', ')}.</p> : null}
              {view.map.description ? <p className="hint">{view.map.description}</p> : null}
            </footer>
          </div>
        </div>
      ) : null}
    </>
  )
}
