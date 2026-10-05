import type { CampaignEvent } from '@rpg-ngn/content'
import { refId, refKind } from '@rpg-ngn/content'
import { updateCharacter, updateNpc, type InventoryItem, type WorldState } from '@rpg-ngn/core'

/**
 * Objetos ganados y perdidos, comunes a todos los rulesets. Vivian solo en el
 * d20: los tres sistemas sin combate lanzaban "no conoce el effect gain" y el
 * turno entero fallaba y se repetia, aunque sus prompts ofrecen la rosa de la
 * Mascarada y la carta lacrada de la corte (mesa 42, 04-10; docs/27, F5).
 *
 *   - gain {item, holder?, note?, source?}   objeto ganado por el actor o por `holder`
 *   - lose {item, holder?}                   objeto perdido
 */

export type Effect = Record<string, unknown>

export function str(effect: Effect, key: string, event: CampaignEvent): string {
  const value = effect[key]
  if (typeof value !== 'string' || value === '') {
    throw new Error(`${event.id}: el effect "${String(effect['op'])}" requiere "${key}" como texto`)
  }
  return value
}

export function optionalStr(effect: Effect, key: string): string | undefined {
  const value = effect[key]
  return typeof value === 'string' && value !== '' ? value : undefined
}

function holderOf(effect: Effect, event: CampaignEvent): string {
  const holder = optionalStr(effect, 'holder') ?? optionalStr(effect, 'who') ?? event.actor
  if (!holder) {
    throw new Error(`${event.id}: el effect "${String(effect['op'])}" no tiene holder ni el evento tiene actor`)
  }
  return holder
}

function addItem(world: WorldState, holder: string, item: InventoryItem): WorldState {
  const id = refId(holder)
  switch (refKind(holder)) {
    case 'character':
      return updateCharacter(world, id, (c) => ({ ...c, inventory: [...c.inventory, item] }))
    case 'npc':
      return updateNpc(world, id, (n) => ({ ...n, inventory: [...n.inventory, item] }))
    default:
      throw new Error(`${holder} no puede tener inventario (solo character:* y npc:*)`)
  }
}

function removeItem(world: WorldState, holder: string, itemId: string, eventId: string): WorldState {
  const id = refId(holder)
  const drop = (inventory: InventoryItem[]): InventoryItem[] => {
    const index = inventory.findIndex((i) => i.id === itemId)
    if (index === -1) {
      throw new Error(`${eventId}: ${holder} no tiene "${itemId}" para perderlo`)
    }
    return [...inventory.slice(0, index), ...inventory.slice(index + 1)]
  }
  switch (refKind(holder)) {
    case 'character':
      return updateCharacter(world, id, (c) => ({ ...c, inventory: drop(c.inventory) }))
    case 'npc':
      return updateNpc(world, id, (n) => ({ ...n, inventory: drop(n.inventory) }))
    default:
      throw new Error(`${holder} no puede tener inventario (solo character:* y npc:*)`)
  }
}

/** Aplica `gain` o `lose`; null si el effect no es de inventario. */
export function applyInventoryEffect(world: WorldState, effect: Effect, event: CampaignEvent): WorldState | null {
  const op = String(effect['op'] ?? '')
  if (op === 'gain') {
    const item: InventoryItem = { id: str(effect, 'item', event), since: event.id }
    const note = optionalStr(effect, 'note')
    const source = optionalStr(effect, 'source')
    if (note) item.note = note
    if (source) item.note = note ? `${note} (${source})` : source
    return addItem(world, holderOf(effect, event), item)
  }
  if (op === 'lose') return removeItem(world, holderOf(effect, event), str(effect, 'item', event), event.id)
  return null
}
