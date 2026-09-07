import { applyEvent, initialState, narrativeProjection, playerProjection, worldProjection, type CampaignState } from '@rpg-ngn/campaign'
import { CampaignEvent, upcastEvent, type LoadedPack } from '@rpg-ngn/content'
import type { TurnProjections } from '@rpg-ngn/engine-contract'
import type { Ruleset } from '@rpg-ngn/rules'

/**
 * Reconstruye el estado a partir de un snapshot (o del inicio) y una cola
 * de eventos crudos. Los eventos pasan por upcast y por el schema antes de
 * aplicarse; un evento invalido tumba la peticion, no se salta.
 */
export function rebuildState(pack: LoadedPack, ruleset: Ruleset, snapshot: unknown, rawEvents: unknown[]): CampaignState {
  let state = snapshot === null || snapshot === undefined ? initialState({ pack, ruleset }) : (snapshot as CampaignState)

  for (const [index, raw] of rawEvents.entries()) {
    const parsed = CampaignEvent.safeParse(upcastEvent(raw))
    if (!parsed.success) {
      throw new Error(`evento ${index} invalido: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`)
    }
    state = applyEvent(state, parsed.data, ruleset)
  }

  return state
}

export function projectionsOf(state: CampaignState): TurnProjections {
  const players: Record<string, unknown> = {}
  for (const characterId of Object.keys(state.world.characters)) {
    players[characterId] = playerProjection(state, characterId)
  }
  return { world: worldProjection(state), narrative: narrativeProjection(state), players }
}
