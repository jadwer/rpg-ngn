import type { CampaignEvent, Character } from '@rpg-ngn/content'
import { refId, refKind } from '@rpg-ngn/content'
import { adjust, resource, updateCharacter, updateNpc, type CharacterState, type Fortune, type InventoryItem, type WorldState } from '@rpg-ngn/core'
import { UnknownEffectError, type Ruleset } from './ruleset.js'

/**
 * fantasy-d20-lite: el ruleset del piloto. D20 simplificado, seis
 * caracteristicas, HP y CA de nivel 1, Fortuna abierta.
 *
 * Los ops de effect que arbitra:
 *   - memory_recovered {who}                 recuerdo recuperado (campaña de amnesia)
 *   - gain {item, holder?, note?, source?}   objeto ganado por el actor o por `holder`
 *   - lose {item, holder?}                   objeto perdido
 *   - hp {who, delta}                        daño o curacion
 *   - condition {who, add?} | {who, remove?} condicion activa
 */

export const FORTUNE_TIERS: ReadonlyArray<{ min: number; max: number; label: string }> = [
  { min: 1, max: 3, label: 'Mala suerte' },
  { min: 4, max: 6, label: 'Incómodo' },
  { min: 7, max: 14, label: 'Normal' },
  { min: 15, max: 17, label: 'Buena estrella' },
  { min: 18, max: 19, label: 'Afortunado' },
  { min: 20, max: 20, label: 'Destino' },
]

type Effect = Record<string, unknown>

function str(effect: Effect, key: string, event: CampaignEvent): string {
  const value = effect[key]
  if (typeof value !== 'string' || value === '') {
    throw new Error(`${event.id}: el effect "${String(effect['op'])}" requiere "${key}" como texto`)
  }
  return value
}

function optionalStr(effect: Effect, key: string): string | undefined {
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

function characterId(ref: string, event: CampaignEvent): string {
  if (refKind(ref) !== 'character') {
    throw new Error(`${event.id}: se esperaba character:*, llego ${ref}`)
  }
  return refId(ref)
}

export const fantasyD20Lite: Ruleset = {
  id: 'fantasy-d20-lite',
  version: '1.0.0',

  initialCharacterState(character: Character): CharacterState {
    return {
      id: character.id,
      hp: resource(character.hp),
      conditions: [],
      inventory: [],
      fortune: null,
      memoriesRecovered: 0,
      custom: { ac: character.ac },
    }
  },

  abilityModifier(score: number): number {
    return Math.floor((score - 10) / 2)
  },

  fortune(result: number): Fortune {
    const tier = FORTUNE_TIERS.find((t) => result >= t.min && result <= t.max)
    if (!tier) {
      throw new RangeError(`Fortuna fuera de 1..20: ${result}`)
    }
    return { result, tier: tier.label }
  },

  applyEffect(world: WorldState, effect: Effect, event: CampaignEvent): WorldState {
    const op = String(effect['op'])
    switch (op) {
      case 'memory_recovered': {
        const who = characterId(str(effect, 'who', event), event)
        return updateCharacter(world, who, (c) => ({ ...c, memoriesRecovered: c.memoriesRecovered + 1 }))
      }
      case 'gain': {
        const item: InventoryItem = { id: str(effect, 'item', event), since: event.id }
        const note = optionalStr(effect, 'note')
        const source = optionalStr(effect, 'source')
        if (note) item.note = note
        if (source) item.note = note ? `${note} (${source})` : source
        return addItem(world, holderOf(effect, event), item)
      }
      case 'lose':
        return removeItem(world, holderOf(effect, event), str(effect, 'item', event), event.id)
      case 'hp': {
        const who = characterId(str(effect, 'who', event), event)
        const delta = effect['delta']
        if (typeof delta !== 'number' || !Number.isInteger(delta)) {
          throw new Error(`${event.id}: el effect "hp" requiere "delta" entero`)
        }
        return updateCharacter(world, who, (c) => ({ ...c, hp: adjust(c.hp, delta) }))
      }
      case 'condition': {
        const who = characterId(str(effect, 'who', event), event)
        const add = optionalStr(effect, 'add')
        const remove = optionalStr(effect, 'remove')
        if (!add && !remove) {
          throw new Error(`${event.id}: el effect "condition" requiere "add" o "remove"`)
        }
        return updateCharacter(world, who, (c) => {
          let conditions = c.conditions
          if (add && !conditions.includes(add)) conditions = [...conditions, add]
          if (remove) conditions = conditions.filter((x) => x !== remove)
          return { ...c, conditions }
        })
      }
      default:
        throw new UnknownEffectError(op, 'fantasy-d20-lite')
    }
  },
}
