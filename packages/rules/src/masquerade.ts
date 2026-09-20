import type { CampaignEvent, Character } from '@rpg-ngn/content'
import type { CharacterState, Fortune, WorldState } from '@rpg-ngn/core'
import { UnknownEffectError, type Ruleset } from './ruleset.js'

/**
 * Mascarada: comedia de enredos sociales. Nadie pelea ni investiga un
 * crimen; la gente conversa, coquetea, miente sobre quien es y se
 * equivoca de persona. Es el tercer ruleset del motor, y el primero cuyo
 * estado son relaciones, no recursos.
 *
 * Tres cosas en `custom`, porque core no las modela:
 *
 * - **Prestigio** (0 a 10): que tan bien visto es el personaje en el salon.
 *   Empieza segun su faccion (la nobleza entra con ventaja). Sube con un
 *   baile memorable o un favor; baja con un desaire o una mentira pillada.
 * - **Escandalo** (0 a 10): cuanto se habla de el, y no bien. A 10 el
 *   anfitrion lo invita a retirarse y su noche termina.
 * - **Vinculos**: como esta el personaje con cada persona de la fiesta, un
 *   estado por persona (`interes`, `atraccion`, `confianza`, `quimica`,
 *   `decepcion`, `desconfianza`). Un vinculo nuevo con la misma persona
 *   sustituye al anterior: la noche cambia de opinion. El jugador no lo ve
 *   en pantalla; el DM si, y de ahi sale el resumen de la noche.
 *
 * Los rumores NO viven aqui: son un evento del dominio (`rumor_heard`) que
 * el reductor guarda en lo que ha oido cada personaje, porque un rumor puede
 * ser falso y eso no es conocimiento.
 *
 * `hp` existe porque `CharacterState` lo exige, pero aqui vale 1 y no se
 * toca: en una fiesta nadie sangra, se intoxica, y eso es un `condition`.
 */

const CLAMP = (value: number, max = 10): number => Math.max(0, Math.min(max, value))

/** Lo que significa una tirada en el salon: como te recibe la otra persona. */
export const MASQUERADE_TIERS: ReadonlyArray<{ min: number; max: number; label: string }> = [
  { min: 1, max: 1, label: 'Metes la pata delante de todos' },
  { min: 2, max: 7, label: 'Sonríe por cortesía' },
  { min: 8, max: 13, label: 'Te escucha, pero mira a otro lado' },
  { min: 14, max: 19, label: 'Se ríe de verdad' },
  { min: 20, max: 20, label: 'Se quita la máscara' },
]

/** Los estados de un vinculo, en el orden en que suelen aparecer en una noche. */
export const BOND_STATES = ['interes', 'atraccion', 'confianza', 'quimica', 'decepcion', 'desconfianza'] as const
export type BondState = (typeof BOND_STATES)[number]

export interface Bond {
  /** Referencia a la otra persona: `npc:<id>` o `character:<id>`. */
  with: string
  state: BondState
}

/** Prestigio inicial por faccion: en el salon, el apellido entra antes que uno. */
const PRESTIGE: Record<string, number> = {
  nobleza: 7,
  ejercito: 6,
  burguesia: 5,
  artistas: 4,
  servidumbre: 2,
}

export const masquerade: Ruleset = {
  id: 'masquerade',
  version: '1.0.0',

  initialCharacterState(character: Character): CharacterState {
    const faction = typeof character.faction === 'string' ? character.faction : ''
    return {
      id: character.id,
      // Nadie pelea aqui; el campo existe porque el estado de core lo pide.
      hp: { current: 1, max: 1 },
      conditions: [],
      inventory: [],
      fortune: null,
      memoriesRecovered: 0,
      custom: {
        prestige: PRESTIGE[faction] ?? 5,
        scandal: 0,
        bonds: [] as Bond[],
      },
    }
  },

  /** Mismo modificador que d20, por la misma razon que en la corte: los jugadores ya lo entienden. */
  abilityModifier(score: number): number {
    return Math.floor((score - 10) / 2)
  },

  /** En el salon la fortuna es como te recibe la otra persona. Las etiquetas son lo que ve el jugador. */
  fortune(result: number): Fortune {
    const tier = MASQUERADE_TIERS.find((t) => result >= t.min && result <= t.max)
    return { result, tier: tier?.label ?? 'Sin lectura' }
  },

  applyEffect(world: WorldState, effect: Record<string, unknown>, _event: CampaignEvent): WorldState {
    const op = String(effect['op'] ?? '')
    const whoRef = String(effect['who'] ?? '')
    const who = whoRef.includes(':') ? whoRef.split(':')[1]! : whoRef

    switch (op) {
      case 'prestige': {
        const character = world.characters[who]
        if (!character) return world
        const delta = Number(effect['delta'] ?? 0)
        const current = Number(character.custom['prestige'] ?? 0)
        return withCustom(world, who, { prestige: CLAMP(current + delta) })
      }

      case 'scandal': {
        const character = world.characters[who]
        if (!character) return world
        const delta = Number(effect['delta'] ?? 0)
        const current = Number(character.custom['scandal'] ?? 0)
        return withCustom(world, who, { scandal: CLAMP(current + delta) })
      }

      case 'bond': {
        const character = world.characters[who]
        if (!character) return world
        const withRef = String(effect['with'] ?? '')
        const state = String(effect['state'] ?? '')
        if (withRef === '' || !BOND_STATES.includes(state as BondState)) return world
        const bonds = ((character.custom['bonds'] as Bond[] | undefined) ?? []).filter((b) => b.with !== withRef)
        // Un estado nuevo con la misma persona sustituye al anterior.
        return withCustom(world, who, { bonds: [...bonds, { with: withRef, state: state as BondState }] })
      }

      case 'condition': {
        const character = world.characters[who]
        if (!character) return world
        const add = effect['add']
        const remove = effect['remove']
        let conditions = character.conditions
        if (typeof add === 'string' && !conditions.includes(add)) conditions = [...conditions, add]
        if (typeof remove === 'string') conditions = conditions.filter((c) => c !== remove)
        return {
          ...world,
          characters: { ...world.characters, [who]: { ...character, conditions } },
        }
      }

      default:
        throw new UnknownEffectError(op, 'masquerade')
    }
  },
}

/** El mundo con un personaje que cambia solo sus campos propios. */
function withCustom(world: WorldState, who: string, patch: Record<string, unknown>): WorldState {
  const character = world.characters[who]!
  return {
    ...world,
    characters: {
      ...world.characters,
      [who]: { ...character, custom: { ...character.custom, ...patch } },
    },
  }
}
