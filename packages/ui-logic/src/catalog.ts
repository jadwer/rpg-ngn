import type { CatalogWorldCard, SeasonPassOffer, WorldState } from '@rpg-ngn/api-client'
import { packPrice } from './credits.js'

/**
 * Las tarjetas de Explorar mundos (`conceptboard_catalog.png`, docs/24
 * seccion 3): que dice cada estado y que hace su boton. Sin React.
 */

export type CardAction = 'jugar' | 'comprar' | 'anadir' | 'bloqueado' | 'detalle'

export interface CardView {
  /** "Oficial · Valdoria", "Comunidad · por Nara". */
  byline: string
  /** Precio o estado en una linea: "Gratis", "3 USD", "Incluido en tu pase". */
  price: string | null
  /** Sello arriba de la portada: "Ya es tuyo", "Incluido en tu pase". */
  badge: string | null
  action: CardAction
  label: string
  /** 0 a 1 en el camino de temporada; null fuera de el. */
  progress: number | null
  /** "Se desbloquea en 18 capitulos". */
  hint: string | null
}

export function cardView(world: Pick<CatalogWorldCard, 'state' | 'origin' | 'catalog' | 'price' | 'path' | 'name'> & { source?: string | null }): CardView {
  const byline = world.origin === 'oficial' ? 'Oficial' : `Comunidad · por ${world.catalog.author}`
  const base = { byline, badge: null, progress: null, hint: null } as const
  switch (world.state as WorldState) {
    case 'gratis':
      return { ...base, price: 'Gratis', action: 'jugar', label: 'Jugar' }
    case 'tuyo':
      return { ...base, price: null, badge: world.source === 'pase' ? 'Incluido en tu pase' : 'Ya es tuyo', action: 'jugar', label: 'Jugar' }
    case 'pase':
      return { ...base, price: null, badge: 'Incluido en tu pase', action: 'jugar', label: 'Jugar' }
    case 'venta':
      return { ...base, price: world.price ? packPrice(world.price) : null, action: 'comprar', label: 'Comprar' }
    case 'camino': {
      const path = world.path
      const left = path ? Math.max(0, path.threshold - path.have) : null
      return { ...base, price: null, action: 'bloqueado', label: 'Ver detalles', progress: path ? Math.min(1, path.have / Math.max(1, path.threshold)) : 0, hint: left !== null ? `Se desbloquea en ${left} ${left === 1 ? 'capítulo' : 'capítulos'} o con el pase` : 'Se desbloquea jugando o con el pase' }
    }
    case 'comunidad':
      return { ...base, price: 'Gratis', action: 'anadir', label: 'Añadir a mis mundos' }
    default:
      return { ...base, price: null, action: 'detalle', label: 'Ver detalles' }
  }
}

/** "3-5", "1-4": jugadores en la etiqueta corta de la tarjeta. */
export function playersTag(players: { min: number; max: number }): string {
  return players.min === players.max ? String(players.min) : `${players.min}-${players.max}`
}

export function durationLabel(duration: 'corta' | 'media' | 'larga'): string {
  return { corta: 'Corta', media: 'Media', larga: 'Larga' }[duration]
}

/**
 * El camino de la temporada para pintarlo: cuanto se lleva (0 a 1 contra el
 * ultimo umbral) y cada parada en su sitio de la linea.
 */
export function seasonProgress(path: { chapters: number; worlds: ReadonlyArray<{ packId: string; threshold: number; unlocked: boolean }> }): {
  progress: number
  stops: Array<{ packId: string; threshold: number; unlocked: boolean; at: number }>
} {
  const top = Math.max(1, ...path.worlds.map((w) => w.threshold))
  return {
    progress: Math.min(1, path.chapters / top),
    stops: path.worlds.map((w) => ({ ...w, at: w.threshold / top })),
  }
}

/**
 * El bloque del pase de temporada (tablero A: "Capitulos x2, 5 USD, pago
 * unico"). Null sin temporada en curso.
 */
export function passView(offer: SeasonPassOffer | null): { price: string; priceLine: string; perks: string[]; owned: boolean; label: string } | null {
  if (!offer) return null
  return {
    price: packPrice(offer),
    // La linea de precio que pintan web y app, igual en las dos (VAM 26-09, A9).
    priceLine: offer.owned ? 'Ya es tuyo esta temporada' : `${packPrice(offer)}, pago único`,
    perks: ['Capítulos x2 toda la temporada', 'Los mundos del camino, abiertos desde ya', 'Hasta 5 mundos propios'],
    owned: offer.owned,
    label: offer.owned ? 'Tu pase está activo' : 'Comprar el pase',
  }
}

/** La tarjeta dorada tras pagar el pase o un mundo, con el tono de la de los paquetes. */
export function catalogBlessing(kind: 'pase' | 'mundo', name: string): { title: string; text: string; farewell: string } {
  return {
    title: 'Habéis efectuado una adquisición magnífica',
    text:
      kind === 'pase'
        ? `Los heraldos ya proclaman vuestro pase de ${name}: capítulos dobles y los caminos de la temporada abiertos a vuestro paso.`
        : `Las puertas de ${name} se abren para vos; los escribas ya lo inscriben entre vuestros mundos.`,
    farewell: 'Que los altos espíritus acompañen vuestras aventuras.',
  }
}

/**
 * Lo que dice cada parada del camino de temporada, igual en web y app (VAM
 * 26-09, A1: habia cuatro copias con textos distintos). Umbral cero es gratis;
 * abierto si ya es tuyo o lo juegas; si no, cuantos capitulos pide.
 */
export function stopLabel(stop: { threshold: number; unlocked: boolean }): string {
  if (stop.threshold === 0) return 'Gratis'
  if (stop.unlocked) return 'Abierto'
  return `${stop.threshold} ${stop.threshold === 1 ? 'capítulo' : 'capítulos'}`
}

/** El camino en una linea ("Los Nueve Viajeros: gratis · La Mascarada: 20 capítulos"), para donde no cabe la linea grafica. */
export function seasonPathLine(worlds: ReadonlyArray<{ packId: string; threshold: number; unlocked: boolean }>, names: Readonly<Record<string, string>>): string {
  return worlds.map((w) => `${names[w.packId] ?? w.packId}: ${stopLabel(w).toLowerCase()}`).join('  ·  ')
}
