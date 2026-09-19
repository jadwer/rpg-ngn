import type { CampaignEvent, Character } from '@rpg-ngn/content'
import type { CharacterState, Fortune, WorldState } from '@rpg-ngn/core'
import { UnknownEffectError, type Ruleset } from './ruleset.js'

/**
 * Intriga de corte: investigacion sin combate.
 *
 * Es el segundo ruleset del motor, y existe para probar que el eje
 * "agnostico de sistema" del ADR es real y no una promesa. Aqui no hay
 * puntos de vida ni iniciativa: nadie pelea, la gente conversa, observa y
 * miente. Lo que se gasta no es sangre sino **credito**, y lo que sube es
 * la **sospecha** que otros tienen de ti.
 *
 * Tres recursos, todos en `custom` porque core no los modela:
 *
 * - **Credito** (0 a 10): cuanto te abren las puertas los que mandan.
 *   Empieza segun el rango del personaje. Se gasta pidiendo favores y
 *   entrando donde no te llaman; se recupera sirviendo bien.
 * - **Sospecha** (0 a 10): cuanto creen que tuviste que ver. A 10 te
 *   detienen, y en esta corte eso no acaba en juicio.
 * - **Pistas**: lo que el personaje ha averiguado, por id. No es
 *   inventario: una pista no se pierde ni se roba, y dos personajes pueden
 *   tener la misma.
 *
 * `hp` existe porque `CharacterState` lo exige, pero aqui vale 1 y no se
 * toca: en esta corte no te hieren, te envenenan, y eso es un `condition`.
 */

const CLAMP = (value: number, max = 10): number => Math.max(0, Math.min(max, value))

/** Lo que significa una tirada en la corte, en palabras del setting. */
export const COURT_TIERS: ReadonlyArray<{ min: number; max: number; label: string }> = [
  { min: 1, max: 1, label: 'Alguien se da cuenta' },
  { min: 2, max: 7, label: 'La puerta se cierra' },
  { min: 8, max: 13, label: 'Consigues algo, dejas rastro' },
  { min: 14, max: 19, label: 'Te dejan llegar' },
  { min: 20, max: 20, label: 'Te abren de par en par' },
]

/** Credito inicial por rango: quien esta cerca del poder empieza con mas puertas abiertas. */
const STANDING: Record<string, number> = {
  'corte-exterior': 6,
  'corte-interior': 5,
  'casa-lakan': 5,
  'barrio-del-placer': 2,
}

export const courtIntrigue: Ruleset = {
  id: 'court-intrigue',
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
        standing: STANDING[faction] ?? 4,
        suspicion: 0,
        clues: [] as string[],
      },
    }
  },

  /**
   * Mismo modificador que d20: una caracteristica de 10 no aporta nada y
   * cada dos puntos suman uno. Se conserva porque los jugadores ya lo
   * entienden y no gana nada con ser distinto.
   */
  abilityModifier(score: number): number {
    return Math.floor((score - 10) / 2)
  },

  /**
   * En la corte la fortuna no es suerte: es hasta donde te dejan llegar. Las
   * etiquetas son del setting, no del sistema, y es lo que ve el jugador.
   */
  fortune(result: number): Fortune {
    const tier = COURT_TIERS.find((t) => result >= t.min && result <= t.max)
    return { result, tier: tier?.label ?? 'Sin lectura' }
  },

  applyEffect(world: WorldState, effect: Record<string, unknown>, _event: CampaignEvent): WorldState {
    const op = String(effect['op'] ?? '')
    const whoRef = String(effect['who'] ?? '')
    const who = whoRef.includes(':') ? whoRef.split(':')[1]! : whoRef

    switch (op) {
      case 'standing': {
        const character = world.characters[who]
        if (!character) return world
        const delta = Number(effect['delta'] ?? 0)
        const current = Number(character.custom['standing'] ?? 0)
        return withCustom(world, who, { standing: CLAMP(current + delta) })
      }

      case 'suspicion': {
        const character = world.characters[who]
        if (!character) return world
        const delta = Number(effect['delta'] ?? 0)
        const current = Number(character.custom['suspicion'] ?? 0)
        return withCustom(world, who, { suspicion: CLAMP(current + delta) })
      }

      case 'clue': {
        const character = world.characters[who]
        if (!character) return world
        const clue = String(effect['clue'] ?? '')
        const clues = (character.custom['clues'] as string[] | undefined) ?? []
        // Averiguar dos veces lo mismo no cuenta dos veces.
        if (clue === '' || clues.includes(clue)) return world
        return withCustom(world, who, { clues: [...clues, clue] })
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
        throw new UnknownEffectError(op, 'court-intrigue')
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
