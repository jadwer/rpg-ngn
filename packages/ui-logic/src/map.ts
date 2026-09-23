import type { PackMapView } from '@rpg-ngn/api-client'
import type { CharacterState } from '@rpg-ngn/core'

/**
 * Que pintar sobre el mapa de una mesa: cada lugar con su punto y quien
 * esta alli. No es un tablero tactico; las coordenadas dicen donde cae el
 * lugar sobre la imagen que dibujo el creador del pack, en porcentaje.
 */

export interface MapPin {
  id: string
  name: string
  /** Porcentaje del ancho y del alto de la imagen. */
  x: number
  y: number
  /** Quien esta aqui, por id de personaje. */
  who: string[]
  /** A que otros lugares se llega desde aqui. */
  connections: string[]
}

export interface MapView {
  map: PackMapView
  pins: MapPin[]
  /** Personajes de la party que ahora mismo no estan en ningun lugar. */
  offMap: string[]
}

/**
 * Cruza el mapa del pack con el estado vivo. `world` son las fichas por id
 * (la proyeccion de mundo que la mesa ya pide); `party` acota a quien esta
 * jugando, para no pintar a los nueve personajes del pack.
 */
export function mapView(map: PackMapView | null, world: Record<string, CharacterState> | undefined, party: readonly string[]): MapView | null {
  if (!map) return null
  const enJuego = party.length > 0 ? party.filter((id) => world?.[id]) : Object.keys(world ?? {})

  const porLugar = new Map<string, string[]>()
  const offMap: string[] = []
  for (const id of enJuego) {
    const donde = world?.[id]?.location
    if (!donde) {
      offMap.push(id)
      continue
    }
    porLugar.set(donde, [...(porLugar.get(donde) ?? []), id])
  }

  const pins = map.places.map((place) => ({
    id: place.id,
    name: place.name,
    x: place.x,
    y: place.y,
    who: porLugar.get(place.id) ?? [],
    connections: [...place.connections],
  }))

  return { map, pins, offMap }
}

/** Las aristas del mapa, sin repetir el par en los dos sentidos. */
export function mapEdges(pins: readonly MapPin[]): Array<{ from: MapPin; to: MapPin }> {
  const porId = new Map(pins.map((p) => [p.id, p]))
  const vistas = new Set<string>()
  const edges: Array<{ from: MapPin; to: MapPin }> = []
  for (const pin of pins) {
    for (const otro of pin.connections) {
      const destino = porId.get(otro)
      if (!destino) continue
      const clave = [pin.id, otro].sort().join('|')
      if (vistas.has(clave)) continue
      vistas.add(clave)
      edges.push({ from: pin, to: destino })
    }
  }
  return edges
}

/** Lo que se lee bajo el mapa: donde esta la party, en una linea. */
export function whereEveryoneIs(view: MapView | null, nameOf: (id: string) => string): string {
  if (!view) return ''
  const partes = view.pins.filter((p) => p.who.length > 0).map((p) => `${p.name}: ${p.who.map(nameOf).join(', ')}`)
  if (view.offMap.length) partes.push(`De camino: ${view.offMap.map(nameOf).join(', ')}`)
  return partes.length ? partes.join(' · ') : 'Nadie situado en el mapa todavía'
}

/**
 * Con varios mapas por pack, cual enseñar primero. Antes los clientes hacian
 * `maps[0]` a secas, y en el piloto eso era la mina (por orden alfabetico) y
 * no el pueblo donde empieza la partida. Lo vio la primera mesa de Valdoria
 * con dos mapas.
 *
 * Orden: el mapa donde esta el personaje de quien mira; si no tiene sitio, el
 * que reune a mas gente de la party; si nadie esta en ninguno, el primero.
 */
export function currentMapIndex(
  maps: readonly PackMapView[],
  world: Record<string, CharacterState> | undefined,
  party: readonly string[],
  viewerCharacterId: string | null,
): number {
  if (maps.length <= 1) return 0
  const mapOf = (characterId: string): number => {
    const donde = world?.[characterId]?.location
    if (!donde) return -1
    return maps.findIndex((m) => m.places.some((p) => p.id === donde))
  }
  if (viewerCharacterId) {
    const propio = mapOf(viewerCharacterId)
    if (propio >= 0) return propio
  }
  const cuenta = maps.map(() => 0)
  for (const id of party) {
    const i = mapOf(id)
    if (i >= 0) cuenta[i] = (cuenta[i] ?? 0) + 1
  }
  const max = Math.max(...cuenta)
  return max > 0 ? cuenta.indexOf(max) : 0
}
