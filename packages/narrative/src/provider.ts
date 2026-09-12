import type { CampaignState } from '@rpg-ngn/campaign'
import type { CampaignEvent, LoadedPack, Session } from '@rpg-ngn/content'
import type { LintFinding, LintMode, TurnBlock, TurnContext, TurnInput } from '@rpg-ngn/engine-contract'

/**
 * Lo que el DM recibe para narrar un turno. El estado completo llega tal
 * cual; el context builder (context.ts) lo reduce a las cuatro capas de
 * docs/04 y deja fuera lo que no puede emerger todavia.
 */
export interface DMTurnContext {
  pack: LoadedPack
  state: CampaignState
  session: Session | undefined
  turn: TurnInput
  /** Premisa de la mesa y nota de la sesion escritas por el usuario (contenido no confiable). */
  notes?: TurnContext | undefined
  /** Eventos posteriores al ultimo snapshot, ya validados: la memoria corta de la sesion. */
  recentEvents?: readonly CampaignEvent[] | undefined
  /** Tope de tokens de salida del modelo (budget.maxOutputTokens de la peticion). */
  maxOutputTokens?: number | undefined
  /** Lint de conocimiento (lint.ts); por defecto `enforce`. */
  lint?: LintMode | undefined
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
  | { kind: 'usage'; inputTokens: number; outputTokens: number }
  /** Hallazgo del lint de conocimiento; el engine lo acumula en `result.lint`. */
  | { kind: 'lint'; finding: LintFinding }

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
