import type { CampaignEvent, Character } from '@rpg-ngn/content'
import type { CharacterState, Fortune, WorldState } from '@rpg-ngn/core'

/**
 * Un ruleset compone las primitivas de core en un juego concreto (docs/02).
 * El reductor de packages/campaign lo recibe como parametro (BA2): que hace
 * un `effect` sobre el mundo lo decide el ruleset, con su version registrada
 * en el snapshot.
 */
export interface Ruleset {
  id: string
  version: string

  /** Estado inicial de un personaje a partir de su ficha del pack. */
  initialCharacterState(character: Character): CharacterState

  /** Modificador derivado de una caracteristica (fue, des, ...). */
  abilityModifier(score: number): number

  /** Tier de la tirada de Fortuna (docs/09: abierta, el jugador ve el tier). */
  fortune(result: number): Fortune

  /**
   * Aplica un effect al mundo. Devuelve el nuevo estado o lanza
   * UnknownEffectError si el op no pertenece a este ruleset.
   */
  applyEffect(world: WorldState, effect: Record<string, unknown>, event: CampaignEvent): WorldState
}

export class UnknownEffectError extends Error {
  constructor(
    public readonly op: string,
    public readonly rulesetId: string,
  ) {
    super(`el ruleset ${rulesetId} no conoce el effect "${op}"`)
    this.name = 'UnknownEffectError'
  }
}

export function rulesetRef(ruleset: Ruleset): string {
  return `${ruleset.id}@${ruleset.version}`
}
