import { CampaignEvent, IsoDateTime, KebabId, SessionId } from '@rpg-ngn/content'
import { z } from 'zod'

/**
 * Contrato Laravel <-> apps/engine (docs/11, D3 y D5). Version entera; el
 * engine rechaza contratos que no conoce. Los tipos de aqui son la unica
 * cosa que ambos lados comparten; la API los consume como JSON Schema.
 */
export const ENGINE_CONTRACT_VERSION = 1

export const ContractVersion = z.literal(ENGINE_CONTRACT_VERSION)

export const PackRef = z.strictObject({
  id: KebabId,
  version: z.string().min(1),
})
export type PackRef = z.infer<typeof PackRef>

/** Lo que un jugador respondio en el turno. `late` llego tras el cierre. */
export const TurnResponse = z.strictObject({
  characterId: KebabId,
  playerId: z.string().min(1),
  text: z.string().min(1).max(4000),
  submittedAt: IsoDateTime,
  late: z.boolean().default(false),
})
export type TurnResponse = z.infer<typeof TurnResponse>

export const TurnInput = z.strictObject({
  id: z.string().min(1),
  number: z.number().int().positive(),
  sessionId: SessionId,
  responses: z.array(TurnResponse),
})
export type TurnInput = z.infer<typeof TurnInput>

/**
 * Proveedor de LLM. `scripted` narra de forma determinista (entrega 5);
 * `anthropic` llega en la entrega 6 con la credencial custodiada por la
 * plataforma, que viaja solo por localhost y nunca vuelve al cliente.
 */
/** Linea de un NPC que el DM scripted mete antes de su narracion. */
export const ScriptedLine = z.strictObject({
  speaker: z.string().min(1),
  speakerRef: z.string().min(1).optional(),
  text: z.string().min(1),
})

/**
 * Guion opcional del DM scripted: narracion fija por numero de turno, para
 * escenas cortas y demos sin modelo. Es contenido, viaja en `settings` de la
 * mesa; el codigo del provider no sabe de lore. Un turno sin entrada en el
 * guion recibe la narracion generica.
 */
export const ScriptedScene = z.strictObject({
  /** Narracion del turno 1 cuando se cierra sin respuestas: presenta la escena. */
  opening: z.string().min(1).optional(),
  turns: z
    .array(
      z.strictObject({
        turn: z.number().int().positive(),
        lines: z.array(ScriptedLine).optional(),
        narration: z.string().min(1),
      }),
    )
    .optional(),
})
export type ScriptedScene = z.infer<typeof ScriptedScene>

export const ProviderConfig = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('scripted'), script: ScriptedScene.optional() }),
  z.strictObject({
    kind: z.literal('anthropic'),
    model: z.string().min(1),
    credential: z.string().min(1),
  }),
])
export type ProviderConfig = z.infer<typeof ProviderConfig>

export const TurnBudget = z.strictObject({
  maxOutputTokens: z.number().int().positive().default(1500),
})

export const ResolveTurnRequest = z.strictObject({
  contract: ContractVersion,
  campaignId: z.string().min(1),
  pack: PackRef,
  ruleset: z.string().min(1),
  /** Estado canonico del ultimo snapshot (CampaignState), o null si la campaña empieza. */
  snapshot: z.unknown().nullable(),
  /** Eventos posteriores al snapshot, en orden. */
  events: z.array(z.unknown()),
  turn: TurnInput,
  provider: ProviderConfig,
  budget: TurnBudget.optional(),
})
export type ResolveTurnRequest = z.infer<typeof ResolveTurnRequest>

/** Bloques tipados de un turno (docs/09): lo que el jugador ve y oye. */
export const TurnBlock = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('narration'), text: z.string().min(1) }),
  z.strictObject({
    type: z.literal('dialogue'),
    speaker: z.string().min(1),
    speakerRef: z.string().nullable(),
    text: z.string().min(1),
  }),
  z.strictObject({
    type: z.literal('roll'),
    text: z.string().min(1),
    actor: z.string(),
    die: z.string(),
    result: z.number().int(),
  }),
  z.strictObject({ type: z.literal('system'), text: z.string().min(1) }),
])
export type TurnBlock = z.infer<typeof TurnBlock>

export const TurnUsage = z.strictObject({
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
})

export const TurnProjections = z.strictObject({
  world: z.unknown(),
  narrative: z.unknown(),
  players: z.record(z.string(), z.unknown()),
})
export type TurnProjections = z.infer<typeof TurnProjections>

/** Una linea del stream NDJSON de `POST /v1/turns/resolve`. */
export const ResolveLine = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('block'), block: TurnBlock }),
  z.strictObject({
    kind: z.literal('result'),
    events: z.array(CampaignEvent),
    /** Personajes a los que el DM interpela directamente; cierran el siguiente turno. */
    addressed: z.array(KebabId),
    state: z.unknown(),
    projections: TurnProjections,
    usage: TurnUsage,
  }),
  z.strictObject({ kind: z.literal('error'), message: z.string().min(1) }),
])
export type ResolveLine = z.infer<typeof ResolveLine>

export const IssueLine = z.strictObject({
  level: z.enum(['error', 'warning']),
  path: z.string(),
  message: z.string(),
})

export const ValidateEventsRequest = z.strictObject({
  contract: ContractVersion,
  pack: PackRef.optional(),
  events: z.array(z.unknown()),
})
export type ValidateEventsRequest = z.infer<typeof ValidateEventsRequest>

export const ValidateEventsResponse = z.strictObject({
  ok: z.boolean(),
  events: z.array(CampaignEvent),
  issues: z.array(IssueLine),
})
export type ValidateEventsResponse = z.infer<typeof ValidateEventsResponse>

export const ProjectRequest = z.strictObject({
  contract: ContractVersion,
  pack: PackRef,
  ruleset: z.string().min(1),
  /** Todos los eventos de la campaña desde el principio. */
  events: z.array(z.unknown()),
  /**
   * Snapshot a auditar: el engine reproyecta hasta su seq y compara (BA2).
   * Acepta el archivo de snapshot tal cual (packId, ruleset y demas se ignoran).
   */
  compareWith: z
    .object({
      seq: z.number().int().positive(),
      state: z.unknown(),
    })
    .optional(),
})
export type ProjectRequest = z.infer<typeof ProjectRequest>

export const Divergence = z.strictObject({
  path: z.string(),
  expected: z.unknown(),
  actual: z.unknown(),
})

export const ProjectResponse = z.strictObject({
  seq: z.number().int().nonnegative(),
  state: z.unknown(),
  projections: TurnProjections,
  divergence: z.array(Divergence).nullable(),
})
export type ProjectResponse = z.infer<typeof ProjectResponse>

export const ProbeResponse = z.strictObject({
  ok: z.boolean(),
  provider: z.string(),
  model: z.string().nullable(),
  message: z.string().nullable(),
})
export type ProbeResponse = z.infer<typeof ProbeResponse>

export const ENGINE_HEADERS = {
  token: 'x-engine-token',
  contract: 'x-engine-contract',
} as const
