import type { Character } from '@rpg-ngn/content'
import type { CharacterState } from '@rpg-ngn/core'
import { courtIntrigue } from './court-intrigue.js'
import type { Ruleset } from './ruleset.js'

/**
 * Drama sin combate (docs/26, H5): historias de vida, venganza o romance,
 * contadas desde un protagonista. La mecanica es la de la intriga de corte
 * (reputacion, presion y lo que el protagonista descubre, sin puntos de
 * vida), con su propio prompt para que el director no hable de "la corte"
 * en una historia que pasa en la Ciudad de Mexico.
 */
export const dramaLite: Ruleset = {
  ...courtIntrigue,
  id: 'drama-lite',
  version: '1.0.0',

  initialCharacterState(character: Character): CharacterState {
    const base = courtIntrigue.initialCharacterState(character)
    // Nadie arranca con favores: la reputacion se gana en la historia.
    return { ...base, custom: { ...base.custom, standing: 4, suspicion: 0, clues: [] as string[] } }
  },
}
