import type { CampaignEvent, Character } from '@rpg-ngn/content'
import { refId, refKind } from '@rpg-ngn/content'
import { adjust, resource, updateCharacter, type CharacterState, type Fortune, type WorldState } from '@rpg-ngn/core'
import { applyInventoryEffect, optionalStr, str, type Effect } from './inventory.js'
import { UnknownEffectError, type Ruleset } from './ruleset.js'
import type { FortuneTier } from './fortune-tiers.js'

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

export const FORTUNE_TIERS: ReadonlyArray<FortuneTier> = [
  { min: 1, max: 3, key: 'd20.badLuck', label: 'Mala suerte' },
  { min: 4, max: 6, key: 'd20.awkward', label: 'Incómodo' },
  { min: 7, max: 14, key: 'd20.normal', label: 'Normal' },
  { min: 15, max: 17, key: 'd20.goodStar', label: 'Buena estrella' },
  { min: 18, max: 19, key: 'd20.lucky', label: 'Afortunado' },
  { min: 20, max: 20, key: 'd20.destiny', label: 'Destino' },
]


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
      case 'gain':
      case 'lose':
        return applyInventoryEffect(world, effect, event)!
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
