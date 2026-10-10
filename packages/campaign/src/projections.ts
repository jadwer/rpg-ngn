import type { CharacterState, WorldState } from '@rpg-ngn/core'
import type { CampaignState, NarrativeState, PlayerKnowledge } from './state.js'

/**
 * Proyecciones: lo que cada consumidor puede ver del estado. La API sirve
 * estas, nunca el log crudo (docs/11, D4).
 */

export interface WorldProjection {
  worldTime: string | null
  characters: Record<string, CharacterState>
  npcs: WorldState['npcs']
  /** Lo que debe la party; ausente si el mundo no lleva deuda. */
  partyDebt?: number
  /** Calor de la banda (0 a 6); ausente si el mundo no es de calle. */
  heat?: number
}

export interface PlayerProjection {
  characterId: string
  character: CharacterState
  knowledge: PlayerKnowledge
  session: { id: string | null; party: string[] }
}

export function worldProjection(state: CampaignState): WorldProjection {
  return { worldTime: state.world.worldTime, characters: state.world.characters, npcs: state.world.npcs, ...(state.world.partyDebt !== undefined ? { partyDebt: state.world.partyDebt } : {}), ...(state.world.heat !== undefined ? { heat: state.world.heat } : {}) }
}

export function playerProjection(state: CampaignState, characterId: string): PlayerProjection {
  const character = state.world.characters[characterId]
  if (!character) {
    throw new Error(`no hay personaje ${characterId} en la campaña`)
  }
  const sessionId = state.narrative.currentSession
  const session = sessionId ? state.meta.sessions[sessionId] : undefined
  return {
    characterId,
    character,
    knowledge: state.knowledge[characterId] ?? { characterId, facts: {}, witnessed: [] },
    session: { id: sessionId, party: session?.party ?? [] },
  }
}

export function narrativeProjection(state: CampaignState): NarrativeState {
  return state.narrative
}
