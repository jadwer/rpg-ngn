import type { CampaignState } from '@rpg-ngn/campaign'
import type { LoadedPack, Session } from '@rpg-ngn/content'
import type { TurnBlock, TurnInput } from '@rpg-ngn/engine-contract'

/**
 * Lo que el DM recibe para narrar un turno. En la entrega 5 es el estado
 * completo; el context builder de la entrega 6 lo reduce a las cuatro capas
 * de docs/04 y deja fuera lo que no puede emerger todavia.
 */
export interface DMTurnContext {
  pack: LoadedPack
  state: CampaignState
  session: Session | undefined
  turn: TurnInput
}

/**
 * Evento propuesto por el DM. El engine le pone id, v, seq, sessionId y
 * recordedAt, lo valida contra el schema y lo aplica con el ruleset; si
 * algo falla, el turno falla entero. El modelo propone, el engine dispone.
 */
export type ProposedEvent = Record<string, unknown> & { type: string }

export type DMOutput =
  | { kind: 'block'; block: TurnBlock }
  | { kind: 'event'; event: ProposedEvent }
  | { kind: 'addressed'; characterIds: string[] }

export interface DMProbe {
  ok: boolean
  model: string | null
  message: string | null
}

export interface DMProvider {
  readonly kind: string
  narrate(context: DMTurnContext): AsyncIterable<DMOutput>
  probe(): Promise<DMProbe>
}
