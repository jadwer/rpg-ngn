import type { CampaignState } from '@rpg-ngn/campaign'
import type { CampaignEvent, LoadedPack, Session } from '@rpg-ngn/content'
import type { DiceMode, LintFinding, LintMode, RollRequest, TurnBlock, TurnContext, TurnDiagnostics, TurnInput } from '@rpg-ngn/engine-contract'

/**
 * Lo que el GM recibe para narrar un turno. El estado completo llega tal
 * cual; el context builder (context.ts) lo reduce a las cuatro capas de
 * docs/04 y deja fuera lo que no puede emerger todavia.
 */
export interface GMTurnContext {
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
  /** Quien tira los dados (contrato `DiceMode`); por defecto `engine`. */
  /** Idioma de la narracion (i18n); sin el, español. */
  language?: 'es' | 'en' | undefined
  dice?: DiceMode | undefined
  /**
   * Id del ruleset de la campaña (`court-intrigue`, `fantasy-d20-lite`). El
   * prompt ofrece los eventos que ese ruleset sabe aplicar y el provider solo
   * acepta esos. Sin el, se asume el d20 del piloto, que es lo que habia.
   */
  rulesetId?: string | undefined
  /**
   * Partida de deduccion social (Persefone): la fase del turno y la vista del
   * GM que arma el motor con el ruleset. Sustituye al reloj de historia.
   */
  deduction?: { phase: 'accion' | 'reunion'; view: string } | undefined
  /**
   * Un d20 ya tirado por el motor para cada personaje que declaro algo este
   * turno (`characterId -> resultado`). El GM lo usa cuando la accion tiene
   * riesgo y narra la consecuencia en el mismo turno; antes pedia la tirada
   * y la pagaba un turno despues, o no la pedia. Lo rellena el provider.
   */
  preRolled?: Readonly<Record<string, number>> | undefined
}

/**
 * Evento propuesto por el GM. El engine le pone id, v, seq, sessionId y
 * recordedAt, lo valida contra el schema y lo aplica con el ruleset; si
 * algo falla, el turno falla entero. El modelo propone, el engine dispone.
 */
export type ProposedEvent = Record<string, unknown> & { type: string }

export type GMOutput =
  | { kind: 'block'; block: TurnBlock }
  | { kind: 'event'; event: ProposedEvent }
  | { kind: 'addressed'; characterIds: string[] }
  | { kind: 'usage'; inputTokens: number; outputTokens: number; cacheReadTokens?: number; cacheWriteTokens?: number }
  /** Hallazgo del lint de conocimiento; el engine lo acumula en `result.lint`. */
  | { kind: 'lint'; finding: LintFinding }
  /** El director cerro la sesion en su turno de cierre (docs/26, H1); el engine lo pasa a `result.close`. */
  | { kind: 'close'; cliffhanger?: string; endingId?: string }
  /** El GM marco un momento para ilustrar: una frase de lo que se ve (docs/ROADMAP, E10a). */
  | { kind: 'illustrate'; moment: string }
  /** Ideas de accion por personaje interpelado (E10b); el cuadro de texto sigue libre. */
  | { kind: 'suggestions'; byCharacter: Record<string, string[]> }
  /** Tiradas que el GM pidio para el turno que viene (modos `dice` y `table`): esos personajes tiran en vez de escribir. */
  | { kind: 'rollRequests'; requests: RollRequest[] }
  /** Lo tecnico del turno: lo lee quien administra, nunca la mesa (docs/27, D). */
  | { kind: 'diagnostics'; diagnostics: TurnDiagnostics }

export type { TurnDiagnostics }

export interface GMProbe {
  ok: boolean
  model: string | null
  message: string | null
}

/** Dos ideas nuevas para un personaje ("Otras", E10b) y lo que costo pedirlas. */
export interface GMSuggestion {
  options: string[]
  usage: { inputTokens: number; outputTokens: number }
}

export interface GMProvider {
  readonly kind: string
  narrate(context: GMTurnContext): AsyncIterable<GMOutput>
  probe(): Promise<GMProbe>
  /**
   * "Otras" ideas: dos sugerencias mas para un personaje con el contexto del
   * turno, sin narrar nada. Opcional: el GM con guion no tiene modelo.
   */
  suggest?(context: GMTurnContext, characterId: string, exclude: readonly string[], extra?: { narrated?: readonly string[]; pendingRoll?: { skill?: string | undefined; reason?: string | undefined } | undefined }): Promise<GMSuggestion>
  /**
   * Si las ideas del turno salen de `suggest` y no de `narrate` (docs/27,
   * bloque I): el engine las pide despues de aplicar los eventos, con el
   * estado ya movido y solo lo que cada jugador sabe.
   */
  readonly separateIdeas?: boolean
}
