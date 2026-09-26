import type { CatalogWorldCard, WorldState } from '@rpg-ngn/api-client'

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

function money(amountMinor: number, currency: string): string {
  const amount = amountMinor / 100
  return `${Number.isInteger(amount) ? amount.toFixed(0) : amount.toFixed(2)} ${currency.toUpperCase()}`
}

export function cardView(world: Pick<CatalogWorldCard, 'state' | 'origin' | 'catalog' | 'price' | 'path' | 'name'>): CardView {
  const byline = world.origin === 'oficial' ? 'Oficial' : `Comunidad · por ${world.catalog.author}`
  const base = { byline, badge: null, progress: null, hint: null } as const
  switch (world.state as WorldState) {
    case 'gratis':
      return { ...base, price: 'Gratis', action: 'jugar', label: 'Jugar' }
    case 'tuyo':
      return { ...base, price: null, badge: 'Ya es tuyo', action: 'jugar', label: 'Jugar' }
    case 'pase':
      return { ...base, price: null, badge: 'Incluido en tu pase', action: 'jugar', label: 'Jugar' }
    case 'venta':
      return { ...base, price: world.price ? money(world.price.amount, world.price.currency) : null, action: 'comprar', label: 'Comprar' }
    case 'camino': {
      const path = world.path
      const left = path ? Math.max(0, path.threshold - path.have) : null
      return { ...base, price: null, action: 'bloqueado', label: 'Ver detalles', progress: path ? Math.min(1, path.have / Math.max(1, path.threshold)) : 0, hint: left !== null ? `Se desbloquea en ${left} ${left === 1 ? 'capítulo' : 'capítulos'}` : 'Se desbloquea jugando' }
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
