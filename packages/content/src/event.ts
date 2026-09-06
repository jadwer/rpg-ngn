import { z } from 'zod'
import { CharacterRef, DiceSpec, EntityRef, FactRef, IsoDateTime } from './common.js'

/**
 * Schema del evento de campaña, version 1 (08 + BA1 de 10).
 *
 * Cada evento lleva `v` (version del schema de su tipo) e `id`. El log es
 * append-only: los eventos escritos con una version anterior se leen a
 * traves de `upcastEvent` (upcast.ts), nunca se editan.
 */

export const EVENT_SCHEMA_VERSION = 1

export const EventType = z.enum([
  // Accion
  'player_action',
  'npc_action',
  'world_event',
  // Resolucion
  'roll',
  // Efecto
  'state_change',
  'quest_update',
  'inventory_change',
  'relationship_change',
  // Conocimiento
  'discovery',
  'rumor_heard',
  // Narrativa
  'scene_started',
  'scene_closed',
  'narration',
  // Meta
  'session_started',
  'session_closed',
  'correction',
])
export type EventType = z.infer<typeof EventType>

export const EventId = z.string().regex(/^evt-\d{5,}$/, 'id con forma evt-NNNNN')
export const SessionId = z.string().regex(/^\d{3}$/)

export const KnowledgeLayer = z.enum(['canon', 'campaign', 'player', 'dm'])
export const Confidence = z.enum(['known', 'uncertain', 'conflicting', 'unknown'])

export const Visibility = z.strictObject({
  layer: KnowledgeLayer,
  witnesses: z.array(EntityRef).optional(),
  note: z.string().optional(),
})

/**
 * Los effects los arbitra el ruleset (BA2), asi que el schema solo exige
 * `op`. El resto de claves pasa tal cual; el reductor de packages/campaign
 * valida la forma de cada op contra el ruleset activo.
 */
export const Effect = z.object({ op: z.string().min(1) }).catchall(z.unknown())

export const KnowledgeGrant = z.strictObject({
  to: EntityRef,
  fact: FactRef,
  confidence: Confidence,
  how: z.string().optional(),
})

const envelopeShape = {
  id: EventId,
  v: z.literal(EVENT_SCHEMA_VERSION),
  seq: z.number().int().positive(),
  sessionId: SessionId,
  recordedAt: IsoDateTime,
  /** `session` cuando el instante se completo con el inicio de la sesion (migracion BA1). */
  recordedAtPrecision: z.enum(['exact', 'session']).default('exact'),
  worldTime: z.string().optional(),
  actor: EntityRef.optional(),
  targets: z.array(EntityRef).optional(),
  location: z.string().optional(),
  declared: z.string().optional(),
  effects: z.array(Effect).optional(),
  visibility: Visibility.optional(),
  knowledgeGranted: z.array(KnowledgeGrant).optional(),
  rollRefs: z.array(EventId).optional(),
}

/** Envoltura comun a todo evento; lo que Laravel valida sin conocer la semantica. */
export const EventEnvelope = z
  .object({ ...envelopeShape, type: EventType })
  .catchall(z.unknown())

export const RollResolved = z
  .strictObject({
    kind: z.enum(['fortune', 'skill', 'social', 'attack', 'save', 'rest', 'other']),
    die: DiceSpec,
    result: z.number().int(),
    /** Origen del azar: `csprng:secrets`, `physical`, `seed:<n>`. */
    source: z.string().min(1),
    rolls: z.array(z.number().int()).optional(),
    advantage: z.boolean().optional(),
    disadvantage: z.boolean().optional(),
    skill: z.string().optional(),
    target: EntityRef.optional(),
    modifier: z.number().int().optional(),
  })
  .refine((r) => !(r.advantage && r.disadvantage), 'ventaja y desventaja no pueden ir juntas')

export const RollEvent = z.strictObject({
  ...envelopeShape,
  type: z.literal('roll'),
  actor: EntityRef,
  resolved: RollResolved,
})

export const DiscoveryPayload = z.strictObject({
  fact: FactRef,
  confidence: Confidence,
  method: z.string().min(1),
  sourceEvent: EventId.optional(),
})

export const DiscoveryEvent = z.strictObject({
  ...envelopeShape,
  type: z.literal('discovery'),
  targets: z.array(EntityRef).min(1),
  payload: DiscoveryPayload,
})

export const SessionStartedEvent = z.strictObject({
  ...envelopeShape,
  type: z.literal('session_started'),
  payload: z.strictObject({
    party: z.array(CharacterRef).min(1),
    /** Version del pack y del ruleset con que se juega (BA2). */
    packVersion: z.string().optional(),
    rulesetVersion: z.string().optional(),
  }),
})

export const SessionClosedEvent = z.strictObject({
  ...envelopeShape,
  type: z.literal('session_closed'),
  payload: z.strictObject({
    cliffhanger: z.string().optional(),
    summary: z.string().optional(),
  }),
})

export const WorldEvent = z.strictObject({
  ...envelopeShape,
  type: z.literal('world_event'),
  payload: z.strictObject({
    note: z.string().min(1),
  }),
})

export const InventoryChangeEvent = z.strictObject({
  ...envelopeShape,
  type: z.literal('inventory_change'),
  effects: z.array(Effect).min(1),
})

export const CorrectionEvent = z.strictObject({
  ...envelopeShape,
  type: z.literal('correction'),
  payload: z.strictObject({
    /** Evento que se corrige. Nunca se edita; se referencia. */
    corrects: EventId,
    reason: z.string().min(1),
    /** Parche descriptivo del hecho corregido. */
    patch: z.record(z.string(), z.unknown()),
  }),
})

/**
 * Tipos sin forma especifica todavia: solo la envoltura. Se les da schema
 * propio cuando aparece el primer evento real de ese tipo.
 */
export const GenericEvent = z.strictObject({
  ...envelopeShape,
  type: z.enum([
    'player_action',
    'npc_action',
    'state_change',
    'quest_update',
    'relationship_change',
    'rumor_heard',
    'scene_started',
    'scene_closed',
    'narration',
  ]),
  payload: z.record(z.string(), z.unknown()).optional(),
  resolved: z.record(z.string(), z.unknown()).optional(),
})

export const CampaignEvent = z.discriminatedUnion('type', [
  RollEvent,
  DiscoveryEvent,
  SessionStartedEvent,
  SessionClosedEvent,
  WorldEvent,
  InventoryChangeEvent,
  CorrectionEvent,
  GenericEvent,
])

export type CampaignEvent = z.infer<typeof CampaignEvent>
export type RollEvent = z.infer<typeof RollEvent>
export type DiscoveryEvent = z.infer<typeof DiscoveryEvent>

export function eventIdFor(seq: number): string {
  return `evt-${String(seq).padStart(5, '0')}`
}
