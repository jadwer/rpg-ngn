import type { CatalogWorldCard } from '@rpg-ngn/api-client'
import { cardView } from '@rpg-ngn/ui-logic'

/**
 * Lo que la app ensena de un mundo (Gabino, 02-10): el pase y los mundos en
 * venta no se venden en la app ni se manda a pagarlos fuera (regla de Google
 * Play para bienes digitales). Un mundo en venta se ve como detalle, sin
 * precio ni boton de compra; lo que ya es tuyo, gratis o del camino, igual
 * que en la web.
 */
export function appCardView(world: Parameters<typeof cardView>[0]): ReturnType<typeof cardView> {
  const view = cardView(world)
  return view.action === 'comprar' ? { ...view, action: 'detalle', price: null } : view
}

export type { CatalogWorldCard }
