import { CharacterRef, DiceSpec, EntityRef, KebabId, refId, refKind } from '@rpg-ngn/content'
import { rollD20, rollDice, webCryptoRandom, type RandomSource } from '@rpg-ngn/core'
import { TurnBlock, type DiceMode, type LintMode } from '@rpg-ngn/engine-contract'
import { z } from 'zod'
import { budgetFor, buildTurnContext, hasPreviousSession, type ContextBudget, type ContextProfile } from './context.js'
import { buildKnowledgeView, lintText, markRevealed, type KnowledgeView } from './lint.js'
import { systemPromptFor } from './prompt.js'
import type { DMOutput, DMProbe, DMProvider, DMTurnContext, ProposedEvent } from './provider.js'
import { DMProviderError, errorMessage, redact } from './redact.js'

/** Lo que ve la mesa cuando el lint corta un bloque. No dice cual era el secreto. */
export const LINT_SYSTEM_TEXT = 'El DM revisó su narración: contaba algo que la mesa todavía no ha descubierto.'
/** Los avisos de calidad del turno son para el anfitrion: un jugador no puede hacer nada con ellos. */
const HOST_NOTICE = { audience: 'host', tone: 'info' } as const

/** Lo que el DM manda al modelo en un turno. */
export interface ModelPrompt {
  system: string
  user: string
  maxOutputTokens: number
}

export interface ModelReply {
  finish: 'stop' | 'length' | 'refusal' | 'other'
  inputTokens: number
  outputTokens: number
}

/**
 * Transporte hacia un modelo de texto: emite el texto conforme llega y
 * termina con el resumen de la llamada. Un adapter por SDK (anthropic.ts,
 * openai.ts); todo lo demas (contexto, prompt, parser, validacion,
 * redaccion) es comun y vive en ModelDMProvider.
 */
export interface ModelTransport {
  readonly kind: string
  readonly model: string
  stream(prompt: ModelPrompt): AsyncGenerator<string, ModelReply, undefined>
  probe(): Promise<DMProbe>
}

export interface ModelDMOptions {
  /** `compact` apunta a menos de 3000 tokens de entrada (modelos locales). */
  contextProfile?: ContextProfile | undefined
  /** Anula el presupuesto que da el perfil. */
  budget?: ContextBudget
  /** Tope por defecto cuando la peticion no trae budget. */
  maxOutputTokens?: number
  /** Fuente de azar para las tiradas que pide el DM; Web Crypto por defecto, semilla en tests. */
  random?: RandomSource
}

const DEFAULT_MAX_OUTPUT_TOKENS = 4000
/** Un objeto JSON partido en varias lineas se acumula hasta aqui antes de darlo por perdido. */
const MAX_PENDING_CHARS = 8000

// Formas de evento que el prompt ofrece. Son mas estrictas que el schema de
// content a proposito: solo lo que el ruleset de la mesa sabe aplicar. Los
// effects de `state_change` dependen del ruleset; el resto es comun.
const HpEffect = z.strictObject({ op: z.literal('hp'), who: CharacterRef, delta: z.number().int().refine((d) => d !== 0, 'delta 0 no cambia nada') })
// El sujeto puede ser un personaje o un NPC: "el guardia queda receloso" es
// tan valido como "Kael queda envenenado". La del NPC la aplica el reductor
// comun (packages/campaign), porque no depende del sistema de juego.
const ConditionEffect = z
  .strictObject({ op: z.literal('condition'), who: EntityRef, add: z.string().min(1).optional(), remove: z.string().min(1).optional() })
  .refine((e) => Boolean(e.add || e.remove), 'condition requiere add o remove')
  .refine((e) => e.who.startsWith('character:') || e.who.startsWith('npc:'), 'condition solo sobre personajes o NPCs')
const MemoryEffect = z.strictObject({ op: z.literal('memory_recovered'), who: CharacterRef })
const GainEffect = z.strictObject({ op: z.literal('gain'), item: KebabId, holder: EntityRef.optional(), note: z.string().optional(), source: z.string().optional() })
const LoseEffect = z.strictObject({ op: z.literal('lose'), item: KebabId, holder: EntityRef.optional() })
// court-intrigue: credito, sospecha y pistas (packages/rules/src/court-intrigue.ts).
const StandingEffect = z.strictObject({ op: z.literal('standing'), who: CharacterRef, delta: z.number().int().refine((d) => d !== 0, 'delta 0 no cambia nada') })
const SuspicionEffect = z.strictObject({ op: z.literal('suspicion'), who: CharacterRef, delta: z.number().int().refine((d) => d !== 0, 'delta 0 no cambia nada') })
const ClueEffect = z.strictObject({ op: z.literal('clue'), who: CharacterRef, clue: z.string().trim().min(3).max(160) })
// masquerade: prestigio, escandalo, rumores y vinculos (packages/rules/src/masquerade.ts).
const PrestigeEffect = z.strictObject({ op: z.literal('prestige'), who: CharacterRef, delta: z.number().int().refine((d) => d !== 0, 'delta 0 no cambia nada') })
const ScandalEffect = z.strictObject({ op: z.literal('scandal'), who: CharacterRef, delta: z.number().int().refine((d) => d !== 0, 'delta 0 no cambia nada') })
// El modelo escribe "interés" o "atracción" con tilde aunque el prompt las liste sin ella; se normaliza antes de validar.
const BondEffect = z.strictObject({
  op: z.literal('bond'),
  who: CharacterRef,
  with: EntityRef,
  state: z
    .string()
    .transform((v) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim())
    .pipe(z.enum(['interes', 'atraccion', 'confianza', 'quimica', 'decepcion', 'desconfianza'])),
})

const RollEvent = z.strictObject({
  type: z.literal('roll'),
  actor: CharacterRef,
  resolved: z.strictObject({
    kind: z.enum(['fortune', 'skill', 'social', 'attack', 'save', 'rest', 'other']),
    die: DiceSpec,
    /** Sin `result` el engine tira el dado con su generador; con `result` es un numero que el jugador escribio. */
    result: z.number().int().optional(),
    source: z.string().optional(),
    skill: z.string().optional(),
    target: EntityRef.optional(),
    modifier: z.number().int().optional(),
    advantage: z.boolean().optional(),
    disadvantage: z.boolean().optional(),
  }),
})
const InventoryEvent = z.strictObject({
  type: z.literal('inventory_change'),
  actor: CharacterRef.optional(),
  effects: z.array(z.union([GainEffect, LoseEffect])).min(1),
})
const WorldEvent = z.strictObject({
  type: z.literal('world_event'),
  /** Avanza el reloj del mundo si esto lo cambia (cae la noche, pasan tres dias). */
  worldTime: z.string().min(1).max(120).optional(),
  payload: z.strictObject({ note: z.string().min(1) }),
})
const SecretEvent = z.strictObject({
  type: z.literal('secret_revealed'),
  payload: z.strictObject({ secretId: KebabId, how: z.string().optional() }),
})

/**
 * Lo que pasa en una escena social y hasta hoy se tiraba a la basura: un NPC
 * actua, alguien averigua algo, o un NPC cambia como trata a un personaje.
 * `npc_action` y `discovery` ya eran tipos validos del dominio; el prompt no
 * los ofrecia y el interprete no los aceptaba, asi que el modelo los
 * proponia y se perdian en silencio (mesa de prueba, 20-09).
 */
const NpcActionEvent = z.strictObject({
  type: z.literal('npc_action'),
  /** Siempre un NPC, tambien uno que el DM invente sobre la marcha. */
  actor: z.string().regex(/^npc:[a-z0-9]+(?:-[a-z0-9]+)*$/),
  payload: z.strictObject({ text: z.string().min(1) }),
})
const DiscoveryEvent = z.strictObject({
  type: z.literal('discovery'),
  targets: z.array(CharacterRef).min(1),
  payload: z.strictObject({
    fact: z.string().regex(/^fact:[a-z0-9]+(?:-[a-z0-9]+)*$/),
    // El vocabulario del dominio (content/event.ts), no uno inventado: el
    // reductor guarda este valor tal cual en lo que sabe el personaje.
    confidence: z.enum(['known', 'uncertain', 'conflicting', 'unknown']),
    method: z.string().min(1),
  }),
})
/**
 * Mover a un personaje de lugar. `to` es un id de lugar del pack, o null
 * cuando va de camino o sale de escena.
 */
const MoveEffect = z.strictObject({
  op: z.literal('move'),
  who: CharacterRef,
  to: z.union([KebabId, z.string().regex(/^location:[a-z0-9]+(?:-[a-z0-9]+)*$/), z.null()]),
})

/** Como trata un NPC a un personaje: -5 enemigo, 5 aliado. */
const RelationshipEffect = z.strictObject({
  op: z.literal('relationship'),
  who: z.string().regex(/^npc:[a-z0-9]+(?:-[a-z0-9]+)*$/),
  with: CharacterRef,
  delta: z.number().int().min(-3).max(3).refine((d) => d !== 0, 'delta 0 no cambia nada'),
})

/**
 * Abrir y cerrar escena, y mover el momento del mundo. El reductor ya
 * guardaba `scene_started`/`scene_closed` en la cronica y ya aplicaba
 * `worldTime` de cualquier evento, pero el DM no podia emitirlos: por eso
 * una sesion nueva arrastraba el "anochecer" de la anterior y las escenas no
 * tenian principio (20-09).
 */
const SceneEvent = z.strictObject({
  type: z.enum(['scene_started', 'scene_closed']),
  /** Donde y cuando queda el mundo a partir de aqui ("Valdoria, a la mañana siguiente"). */
  worldTime: z.string().min(1).max(120).optional(),
  payload: z.strictObject({ text: z.string().min(1) }),
})

/**
 * Un rumor que alguien oye. No es conocimiento: puede ser falso, y el
 * reductor lo guarda aparte de los hechos. Sustituye al efecto `rumor` que
 * solo tenia La Mascarada.
 */
const RumorHeardEvent = z.strictObject({
  type: z.literal('rumor_heard'),
  targets: z.array(CharacterRef).min(1),
  payload: z.strictObject({
    text: z.string().trim().min(3).max(300),
    from: EntityRef.optional(),
    false: z.boolean().optional(),
  }),
})

/** Avance de una mision del pack: un objetivo cumplido, o la mision cerrada. */
const QuestUpdateEvent = z.strictObject({
  type: z.literal('quest_update'),
  payload: z.strictObject({
    quest: z.string().regex(/^quest:[a-z0-9]+(?:-[a-z0-9]+)*$/),
    status: z.enum(['active', 'done', 'failed']).optional(),
    objective: KebabId.optional(),
    note: z.string().min(1).max(300).optional(),
  }),
})

const D20_EVENT = z.discriminatedUnion('type', [
  RollEvent,
  z.strictObject({ type: z.literal('state_change'), actor: CharacterRef.optional(), effects: z.array(z.union([HpEffect, ConditionEffect, MemoryEffect, RelationshipEffect, MoveEffect])).min(1) }),
  InventoryEvent,
  WorldEvent,
  SecretEvent,
  NpcActionEvent,
  DiscoveryEvent,
  SceneEvent,
  RumorHeardEvent,
  QuestUpdateEvent,
])
const INTRIGUE_EVENT = z.discriminatedUnion('type', [
  RollEvent,
  z.strictObject({ type: z.literal('state_change'), actor: CharacterRef.optional(), effects: z.array(z.union([ConditionEffect, StandingEffect, SuspicionEffect, ClueEffect, RelationshipEffect, MoveEffect])).min(1) }),
  InventoryEvent,
  WorldEvent,
  SecretEvent,
  NpcActionEvent,
  DiscoveryEvent,
  SceneEvent,
  RumorHeardEvent,
  QuestUpdateEvent,
])
const MASQUERADE_EVENT = z.discriminatedUnion('type', [
  RollEvent,
  z.strictObject({ type: z.literal('state_change'), actor: CharacterRef.optional(), effects: z.array(z.union([ConditionEffect, PrestigeEffect, ScandalEffect, BondEffect, RelationshipEffect, MoveEffect])).min(1) }),
  InventoryEvent,
  WorldEvent,
  SecretEvent,
  NpcActionEvent,
  DiscoveryEvent,
  SceneEvent,
  RumorHeardEvent,
  QuestUpdateEvent,
])

/**
 * Los eventos que el provider acepta del modelo para un ruleset. `hp` no
 * existe en la corte y `suspicion` no existe en el d20: lo que el ruleset no
 * sabe aplicar se descarta aqui, antes de llegar al reductor.
 */
export function allowedEventFor(rulesetId: string | undefined): typeof D20_EVENT | typeof INTRIGUE_EVENT | typeof MASQUERADE_EVENT {
  if (rulesetId === 'court-intrigue') return INTRIGUE_EVENT
  if (rulesetId === 'masquerade') return MASQUERADE_EVENT
  return D20_EVENT
}

const ModelLine = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('block'), block: z.unknown() }),
  z.object({ kind: z.literal('event'), event: z.unknown() }),
  z.object({ kind: z.literal('addressed'), characterIds: z.array(z.string()) }),
  z.object({ kind: z.literal('scene'), text: z.string() }),
  z.object({ kind: z.literal('recap'), text: z.string() }),
  z.object({ kind: z.literal('where'), location: z.string(), characterIds: z.array(z.string()).optional() }),
  z.object({ kind: z.literal('suggest'), characterId: z.string(), options: z.array(z.string()) }),
])

/**
 * DM con modelo. Recorre el stream del transporte linea a linea, emite
 * cada bloque en cuanto llega y filtra localmente los eventos que el engine
 * no podria aplicar (personaje inexistente, objeto que no se tiene, tirada
 * que nadie reporto). Lo que no se puede usar se ignora y se avisa al final
 * con un bloque `system`; el turno no se rompe por una linea mala. La prosa
 * suelta (modelos chicos que olvidan el formato) se convierte en narracion
 * en vez de perderse.
 */
export class ModelDMProvider implements DMProvider {
  readonly kind: string

  constructor(
    private readonly transport: ModelTransport,
    private readonly credential: string,
    private readonly options: ModelDMOptions = {},
  ) {
    this.kind = transport.kind
  }

  async *narrate(ctx: DMTurnContext): AsyncIterable<DMOutput> {
    const compact = this.options.contextProfile === 'compact'
    const random = this.options.random ?? webCryptoRandom()
    // Sin modo, tira el servidor: aceptar numeros escritos es una eleccion
    // explicita para la mesa presencial, nunca lo que pasa por omision.
    const diceMode: DiceMode = ctx.dice ?? 'engine'
    // Con el servidor tirando, un d20 por cada personaje que declaro algo,
    // ANTES de llamar al modelo: el DM lo ve, lo usa si la accion tiene
    // riesgo y narra la consecuencia en el mismo turno. Antes pedia la
    // tirada y la pagaba un turno despues, o no la pedia (seis turnos de
    // una mesa de cinco sin un solo dado, 19-09).
    const preRolled = diceMode === 'engine' ? preRollFor(ctx.turn.responses.map((r) => r.characterId), random) : {}
    const built = buildTurnContext({ ...ctx, preRolled }, this.options.budget ?? budgetFor(this.options.contextProfile))
    const party = built.party
    const witnesses = party.map((id) => `character:${id}`)

    // La Fortuna de la sesion la tira cada jugador con su dado, y el numero
    // lo saca la API (Gabino, 24-09: tirada por el motor nadie la sentia
    // suya). Al DM solo se le dice que no la pida ni la invente; la que ya
    // se tiro llega en la ficha de cada personaje.
    const fortuneNote = ctx.session?.fortune?.length
      ? '\n\nFortuna de esta sesión: la tira cada jugador con su dado desde la mesa. No la pidas, no la tires tú ni inventes su número; la que ya se tiró está en la ficha de cada personaje y se nota en la escena sin explicarla.'
      : ''

    // Las declaraciones se registran siempre, sin depender del modelo.
    for (const response of ctx.turn.responses) {
      const name = ctx.pack.characters.get(response.characterId)?.name ?? response.characterId
      yield { kind: 'block', block: { type: 'dialogue', speaker: name, speakerRef: `character:${response.characterId}`, text: response.text } }
      yield {
        kind: 'event',
        event: { type: 'player_action', actor: `character:${response.characterId}`, declared: response.text, visibility: { layer: 'campaign', witnesses } },
      }
    }

    const prompt: ModelPrompt = {
      system: systemPromptFor(ctx.rulesetId, compact),
      user: built.user + fortuneNote,
      maxOutputTokens: ctx.maxOutputTokens ?? this.options.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
    }

    const interpreter = new LineInterpreter(ctx, party, ctx.lint ?? 'enforce', random, diceMode, preRolled)
    interpreter.recapAllowed = ctx.turn.number === 1 && ctx.turn.responses.length === 0 && hasPreviousSession(ctx)
    let buffer = ''
    let raw = ''
    let reply: ModelReply

    try {
      const stream = this.transport.stream(prompt)
      for (;;) {
        const next = await stream.next()
        if (next.done) {
          reply = next.value
          break
        }
        buffer += next.value
        raw += next.value
        let newline = buffer.indexOf('\n')
        while (newline !== -1) {
          const line = buffer.slice(0, newline)
          buffer = buffer.slice(newline + 1)
          yield* interpreter.line(line)
          newline = buffer.indexOf('\n')
        }
      }
      if (buffer.trim() !== '') yield* interpreter.line(buffer)
      yield* interpreter.finish()
      // Con DM_LOG_RAW=1 el engine deja en su log lo que el modelo dijo tal
      // cual. Es la unica forma de afinar un prompt sin adivinar; nunca en
      // produccion con mesas ajenas, porque el texto lleva la escena entera.
      if (wantsRawLog()) console.warn(`[dm raw ${this.transport.kind}/${this.transport.model}]\n${raw}\n[/dm raw]`)
    } catch (error) {
      throw new DMProviderError(`el modelo ${this.transport.kind}/${this.transport.model} falló: ${errorMessage(error)}`, this.credential)
    }

    if (reply.finish === 'refusal') {
      throw new DMProviderError(`el modelo ${this.transport.kind}/${this.transport.model} rechazó narrar el turno`, this.credential)
    }
    if (interpreter.blocks === 0) {
      throw new DMProviderError(`el modelo ${this.transport.kind}/${this.transport.model} no devolvió ningún bloque (${redact(raw.slice(0, 200), this.credential) || 'salida vacía'})`, this.credential)
    }

    if (interpreter.cuts > 0) {
      yield { kind: 'block', block: { type: 'system', text: LINT_SYSTEM_TEXT, ...HOST_NOTICE, detail: `El lint de conocimiento cortó ${interpreter.cuts === 1 ? 'un bloque' : `${interpreter.cuts} bloques`}. El motivo va en el resultado del turno; el modo se fija con DM_LINT o por mesa.` } }
    }
    // Cada turno devuelve la palabra (docs/03), y el modelo suele hacerlo en
    // su ultimo bloque. Si el lint corto justo ese, la mesa se quedaba sin
    // pregunta y a la deriva (mesa 33, turno 5): el motor la devuelve.
    if (reply.finish !== 'length' && interpreter.lastWasCut) {
      const text = party.length === 1 ? `¿Qué haces, ${ctx.pack.characters.get(party[0]!)?.name ?? party[0]}?` : '¿Qué hacen?'
      yield { kind: 'block', block: { type: 'narration', text } }
      yield { kind: 'event', event: { type: 'narration', payload: { text }, visibility: { layer: 'campaign', witnesses } } }
    }

    if (reply.finish === 'length') {
      yield { kind: 'block', block: { type: 'system', text: 'La narración se cortó a medias: el DM llegó a su límite de escritura.', audience: 'table', tone: 'action', detail: 'El modelo agotó maxOutputTokens. Cierra otro turno para que siga, o sube el presupuesto de salida.' } }
    }
    if (interpreter.ignored > 0) {
      // Ruido tecnico: el modelo propuso un evento que el motor no pudo aplicar. La narracion esta intacta.
      yield {
        kind: 'block',
        block: {
          type: 'system',
          text: `El DM propuso ${interpreter.ignored} ${interpreter.ignored === 1 ? 'línea que no se pudo aplicar y se ignoró' : 'líneas que no se pudieron aplicar y se ignoraron'}.`,
          ...HOST_NOTICE,
          // Cuales fueron, recortadas: sin esto no habia forma de saber que se
          // rechazaba (mesa 39, 25-09). Solo lo ve el anfitrion.
          detail: `Suele ser un evento con un personaje que no está en la sesión, un objeto que nadie tiene o una tirada mal formada. La narración que leyó la mesa no cambia y no hay nada que hacer.${interpreter.ignoredLines.length ? `\n\n${interpreter.ignoredLines.join('\n')}` : ''}`,
        },
      }
    }

    if (interpreter.scene) yield { kind: 'illustrate', moment: interpreter.scene }
    if (Object.keys(interpreter.suggestions).length) yield { kind: 'suggestions', byCharacter: interpreter.suggestions }
    yield { kind: 'addressed', characterIds: interpreter.addressed ?? party }
    yield { kind: 'usage', inputTokens: reply.inputTokens, outputTokens: reply.outputTokens }
  }

  async probe(): Promise<DMProbe> {
    try {
      const probe = await this.transport.probe()
      return { ...probe, message: probe.message === null ? null : redact(probe.message, this.credential) }
    } catch (error) {
      return { ok: false, model: this.transport.model, message: redact(errorMessage(error), this.credential) }
    }
  }
}

/**
 * JSON de una linea con tolerancia a lo tipico de estos modelos: texto
 * antes del primer `{` ("Aquí va:"), una coma o un punto al final, un
 * prefijo de lista. Devuelve undefined si no hay JSON que rescatar.
 */
export function parseLoose(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    // sigue abajo
  }
  const first = text.search(/[{[]/)
  const last = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'))
  if (first === -1 || last <= first) return undefined
  try {
    return JSON.parse(text.slice(first, last + 1))
  } catch {
    return undefined
  }
}

/** Profundidad de llaves y corchetes fuera de cadenas al final de `text`, partiendo de `depth`. */
export function scanJson(text: string, depth: number): { depth: number; inString: boolean } {
  let inString = false
  let escape = false
  for (const ch of text) {
    if (inString) {
      if (escape) escape = false
      else if (ch === '\\') escape = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') inString = true
    else if (ch === '{' || ch === '[') depth++
    else if (ch === '}' || ch === ']') depth--
  }
  return { depth, inString }
}

/** Charla de relleno ("Claro, aquí va el turno:"), encabezados y separadores que no son narracion. */
function isChatter(text: string): boolean {
  if (text.length < 4) return true
  if (/^[[\]{},]+$/.test(text)) return true
  if (/^[-=*_#]{3,}$/.test(text)) return true
  if (text.endsWith(':') && text.length < 100) return true
  if (/^#{1,6}\s/.test(text)) return true
  return false
}

/** Interpreta cada linea del modelo: la valida, la convierte en salidas del DM o la cuenta como ignorada. */
class LineInterpreter {
  /** Bloques que el lint corto este turno. */
  cuts: number
  /** El ultimo bloque de narracion o dialogo lo corto el lint. */
  lastWasCut: boolean
  blocks = 0
  ignored = 0
  /** Las lineas ignoradas, recortadas, para que el anfitrion vea cuales fueron. */
  ignoredLines: string[] = []
  /** La linea que se esta interpretando. */
  private current = ''
  /** Quien se movio este turno por un evento `move`, para que `where` no lo repita. */
  private moved = new Set<string>()

  private ignore(): void {
    this.ignored++
    if (this.current && this.ignoredLines.length < 5) this.ignoredLines.push(this.current.slice(0, 240))
  }
  addressed: string[] | null = null
  /** El momento que el DM pidio ilustrar este turno, si lo pidio. */
  scene: string | null = null
  /** "Anteriormente..." (E10c): permitido solo en la apertura con sesion previa, y uno. */
  recapAllowed = false
  recapped = false
  /** Ideas de accion por personaje (E10b). */
  suggestions: Record<string, string[]> = {}
  private pending: { text: string; depth: number } | null = null
  private readonly knowledge: KnowledgeView | null
  private readonly allowed: ReturnType<typeof allowedEventFor>
  /** Dados ya usados este turno: el mismo d20 no vale para dos acciones. */
  private readonly usedPreRoll = new Set<string>()

  constructor(
    private readonly ctx: DMTurnContext,
    private readonly party: string[],
    private readonly lintMode: LintMode,
    private readonly random: RandomSource,
    private readonly diceMode: DiceMode,
    private readonly preRolled: Readonly<Record<string, number>> = {},
  ) {
    this.knowledge = lintMode === 'off' ? null : buildKnowledgeView(ctx, party)
    this.cuts = 0
    this.lastWasCut = false
    this.allowed = allowedEventFor(ctx.rulesetId)
  }

  /**
   * Lint de conocimiento sobre un texto que la mesa va a oir. Devuelve los
   * hallazgos y si el texto debe cortarse (algun error en modo enforce).
   */
  private *lint(text: string): Generator<DMOutput, boolean> {
    if (!this.knowledge) return false
    const findings = lintText(text, this.knowledge, this.ctx.pack)
    for (const finding of findings) yield { kind: 'lint', finding }
    return this.lintMode === 'enforce' && findings.some((f) => f.level === 'error')
  }

  *line(rawLine: string): Generator<DMOutput> {
    const text = rawLine.trim()
    this.current = text
    // Fences de markdown y etiquetas sueltas (`<json>`, `</output>`) con las
    // que algunos modelos envuelven la salida: no son ni bloque ni evento.
    if (text === '' || text.startsWith('```') || /^<\/?[a-z][\w-]*>$/i.test(text)) return

    // Un objeto o array que empezo en una linea anterior y sigue aqui (JSON con formato).
    if (this.pending !== null) {
      const scanned = scanJson(text, this.pending.depth)
      if (!scanned.inString) {
        this.pending = { text: `${this.pending.text}\n${text}`, depth: scanned.depth }
        if (scanned.depth <= 0) yield* this.flushPending()
        else if (this.pending.text.length > MAX_PENDING_CHARS) this.dropPending()
        return
      }
      // Una cadena JSON no puede quedar abierta al final de una linea: lo pendiente estaba roto.
      this.dropPending()
    }

    if (/^[{[]/.test(text)) {
      const scanned = scanJson(text, 0)
      if (scanned.inString) {
        this.ignore()
        return
      }
      if (scanned.depth > 0) {
        this.pending = { text, depth: scanned.depth }
        return
      }
      // Varios objetos en la misma linea ({...} {...}): Haiku lo hace y antes
      // la linea entera fallaba al parsear y el turno acababa "sin bloques"
      // con una narracion perfecta dentro (mesa "cinco personas", 19-09).
      const pieces = splitJsonObjects(text)
      for (const piece of pieces) {
        const parsed = parseLoose(piece)
        if (parsed !== undefined) yield* this.items(parsed)
        else this.ignore()
      }
      return
    }

    if (isChatter(text)) return

    const parsed = parseLoose(text)
    if (parsed !== undefined) {
      yield* this.items(parsed)
      return
    }
    // Prosa suelta: el modelo olvido el formato; se narra en vez de perderse.
    yield* this.prose(text)
  }

  *finish(): Generator<DMOutput> {
    if (this.pending !== null) yield* this.flushPending()
  }

  private *flushPending(): Generator<DMOutput> {
    const parsed = parseLoose(this.pending?.text ?? '')
    this.pending = null
    if (parsed !== undefined) yield* this.items(parsed)
    else this.ignore()
  }

  private dropPending(): void {
    this.pending = null
    this.ignore()
  }

  private *items(parsed: unknown): Generator<DMOutput> {
    const list = Array.isArray(parsed) ? parsed : [parsed]
    for (const item of list) yield* this.item(item)
  }

  private *prose(text: string): Generator<DMOutput> {
    const cleaned = text.replace(/^\*\*[^*]{1,40}\*\*:?\s*/, '').replace(/^[-*•]\s+/, '').trim()
    if (cleaned === '' || isChatter(cleaned)) return
    yield* this.block({ type: 'narration', text: cleaned })
  }

  private *item(parsed: unknown): Generator<DMOutput> {
    const line = ModelLine.safeParse(parsed)
    if (!line.success) {
      // Un bloque o evento sin la envoltura {"kind":...} tambien se entiende.
      const block = TurnBlock.safeParse(parsed)
      if (block.success) {
        yield* this.block(block.data)
        return
      }
      const event = this.event(parsed)
      if (event) {
        yield* this.emitEvent(event)
        return
      }
      // `{"kind":"dialogue","speaker":...}` en vez de
      // `{"kind":"block","block":{"type":"dialogue",...}}`: el modelo usa el
      // tipo de bloque como `kind`, que es la abreviacion natural. Se
      // entiende igual. Sin esto, un turno entero podia quedarse sin ningun
      // bloque y morir con "el modelo no devolvio ningun bloque" (mesa de
      // prueba con Sonnet, 20-09).
      // `{"kind":"roll","event":{...}}`: el modelo pone el tipo del evento
      // como `kind`. Si trae `event`, es un evento (mesa 39, turno 15: la
      // tirada que pedia el movimiento se perdio por esto).
      const withEvent = parsed as { event?: unknown }
      if (withEvent && typeof withEvent === 'object' && withEvent.event && typeof withEvent.event === 'object') {
        const wrapped = this.event(withEvent.event)
        if (wrapped) {
          yield* this.emitEvent(wrapped)
          return
        }
      }
      const asKind = parsed as { kind?: unknown }
      if (asKind && typeof asKind === 'object' && typeof asKind.kind === 'string') {
        const { kind, ...rest } = asKind as Record<string, unknown>
        const shorthand = TurnBlock.safeParse({ type: kind, ...rest })
        if (shorthand.success) {
          yield* this.block(shorthand.data)
          return
        }
      }
      this.ignore()
      return
    }

    switch (line.data.kind) {
      case 'block': {
        const block = TurnBlock.safeParse(line.data.block)
        if (!block.success) {
          this.ignore()
          return
        }
        yield* this.block(block.data)
        return
      }
      case 'event': {
        const event = this.event(line.data.event)
        if (!event) {
          this.ignore()
          return
        }
        yield* this.emitEvent(event)
        return
      }
      case 'addressed': {
        const ids = line.data.characterIds.map((id) => refId(id)).filter((id) => this.party.includes(id))
        if (ids.length) this.addressed = ids
        return
      }
      case 'suggest': {
        // Dos por personaje de la party, cortas, y cada una pasa el lint: una
        // sugerencia tambien puede filtrar un secreto a quien no lo sabe.
        const id = refId(line.data.characterId)
        if (!this.party.includes(id) || this.suggestions[id]) return
        const options: string[] = []
        for (const raw of line.data.options) {
          const option = raw.trim().replace(/\s+/g, ' ').slice(0, 120)
          if (!option || options.includes(option)) continue
          const cut = yield* this.lint(option)
          if (!cut) options.push(option)
          if (options.length === 2) break
        }
        if (options.length) this.suggestions[id] = options
        return
      }
      case 'where': {
        // Donde termina la escena (obligatorio cada turno). El modelo narra
        // que la party camina a la mina y casi nunca emite el `move` (mesa 39,
        // 25-09: nueve turnos sin moverse de la posada para el motor). Esta
        // linea es tan simple como `addressed` y el motor la vuelve `move`.
        const location = line.data.location.replace(/^location:/, '')
        if (!this.ctx.pack.locations.has(location)) {
          this.ignore()
          return
        }
        const ids = (line.data.characterIds?.map((id) => refId(id)) ?? this.party).filter((id) => this.party.includes(id))
        for (const id of ids) {
          if (this.moved.has(id) || this.ctx.state.world.characters[id]?.location === location) continue
          const event = this.event({ type: 'state_change', effects: [{ op: 'move', who: `character:${id}`, to: location }] })
          if (event) yield* this.emitEvent(event)
        }
        return
      }
      case 'recap': {
        // Solo en la apertura de una sesion que tiene otra antes, y uno.
        const text = line.data.text.trim().slice(0, 1200)
        if (!text || this.recapped || !this.recapAllowed) return
        this.recapped = true
        const cut = yield* this.lint(text)
        if (cut) return
        this.blocks++
        yield { kind: 'block', block: { type: 'system', title: 'Anteriormente...', text, audience: 'table', tone: 'info', recap: true } }
        return
      }
      case 'scene': {
        // Una por turno: la primera manda. La frase pasa el lint como
        // cualquier narracion, porque de ella sale el prompt de la imagen.
        const text = line.data.text.trim().slice(0, 400)
        if (!text || this.scene !== null) return
        const cut = yield* this.lint(text)
        if (!cut) this.scene = text
        return
      }
    }
  }

  private *block(block: TurnBlock): Generator<DMOutput> {
    const witnesses = this.party.map((id) => `character:${id}`)
    this.blocks++
    if (block.type === 'narration' || block.type === 'dialogue') {
      const cut = yield* this.lint(block.text)
      if (cut) {
        // El bloque no llega a la mesa ni a la cronica; el motivo va en
        // result.lint y el aviso al anfitrion sale una vez, al final del
        // turno: en medio de la historia parecia que el DM se corregia en
        // vivo (Gabino, 23-09).
        this.cuts++
        this.lastWasCut = true
        return
      }
      this.lastWasCut = false
    }
    if (block.type === 'dialogue') {
      // speakerRef invalido no tumba el bloque: se deja sin referencia.
      const speakerRef = block.speakerRef && EntityRef.safeParse(block.speakerRef).success ? block.speakerRef : null
      const fixed: TurnBlock = { ...block, speakerRef }
      yield { kind: 'block', block: fixed }
      yield {
        kind: 'event',
        event: {
          type: 'narration',
          ...(speakerRef ? { actor: speakerRef } : {}),
          payload: { text: `${block.speaker}: ${block.text}`, speaker: block.speaker, speakerRef },
          visibility: { layer: 'campaign', witnesses },
        },
      }
      return
    }
    yield { kind: 'block', block }
    if (block.type === 'narration') {
      yield { kind: 'event', event: { type: 'narration', payload: { text: block.text }, visibility: { layer: 'campaign', witnesses } } }
    }
  }

  /**
   * Un evento validado sale al engine, salvo que cuente a la cronica algo
   * que la mesa no sabe (world_event). Un secret_revealed marca el secreto
   * como conocido para el resto del turno: el DM lo revelo a proposito.
   */
  private *emitEvent(event: ProposedEvent): Generator<DMOutput> {
    if (event['type'] === 'state_change' || event['type'] === 'world_event') {
      for (const effect of (event['effects'] as Array<Record<string, unknown>> | undefined) ?? []) {
        if (effect['op'] === 'move' && typeof effect['who'] === 'string') this.moved.add(refId(effect['who']))
      }
    }
    if (event['type'] === 'world_event') {
      const note = (event['payload'] as { note: string }).note
      const cut = yield* this.lint(note)
      if (cut) return
    }
    if (event['type'] === 'secret_revealed' && this.knowledge) {
      markRevealed(this.knowledge, (event['payload'] as { secretId: string }).secretId)
    }
    if (event['type'] === 'roll' && (event['resolved'] as { kind?: string }).kind === 'fortune') {
      // La Fortuna la tira el jugador por la API; el d20 que el modelo
      // quiera usar como Fortuna cuenta como tirada cualquiera y no la pisa.
      event = { ...event, resolved: { ...(event['resolved'] as object), kind: 'other' } }
    }
    if (event['type'] === 'roll') {
      // La mesa ve el dado caer: un bloque roll con el resultado, tirado por el engine o escrito por el jugador.
      const resolved = event['resolved'] as { die: string; result: number; skill?: string; source: string; rolls?: number[] }
      const actor = event['actor'] as string
      const name = this.ctx.pack.characters.get(refId(actor))?.name ?? refId(actor)
      const detail = resolved.skill ? ` (${resolved.skill})` : ''
      const dice = resolved.rolls && resolved.rolls.length > 1 ? ` [${resolved.rolls.join(', ')}]` : ''
      const origin = resolved.source === 'physical' ? ' con su dado' : ''
      yield {
        kind: 'block',
        block: {
          type: 'roll',
          text: `${name} tira ${resolved.die}${detail}${origin}: ${resolved.result}${dice}`,
          actor,
          die: resolved.die,
          result: resolved.result,
          ...(resolved.rolls ? { rolls: resolved.rolls } : {}),
        },
      }
    }
    yield { kind: 'event', event }
  }

  /** Valida forma y sentido del evento contra el estado; null si no se puede aplicar. */
  private event(raw: unknown): ProposedEvent | null {
    const parsed = this.allowed.safeParse(raw)
    if (!parsed.success) return null
    const event = parsed.data
    const characters = this.ctx.state.world.characters
    const witnesses = this.party.map((id) => `character:${id}`)
    // Solo cambian los personajes presentes en la sesion; los ausentes no estan en escena (regla 8 de docs/06).
    const present = (ref: string): boolean => this.party.includes(refId(ref)) && Boolean(characters[refId(ref)])

    switch (event.type) {
      case 'roll': {
        const actorId = refId(event.actor)
        if (!present(event.actor)) return null
        const { result, source: _source, advantage, disadvantage, ...rest } = event.resolved
        // El d20 que el motor ya tiro para ese personaje este turno: el DM lo
        // devuelve tal cual y narra su consecuencia ahora. Solo vale una vez y
        // solo si coincide; cualquier otro numero se ignora y se tira aqui.
        if (this.diceMode === 'engine' && result !== undefined && this.preRolled[actorId] === result && !this.usedPreRoll.has(actorId)) {
          this.usedPreRoll.add(actorId)
          const resolved = { ...rest, result: result + (rest.modifier ?? 0), rolls: [result], source: 'engine' }
          return { ...event, resolved, visibility: { layer: 'campaign', witnesses } }
        }
        // Con dados del motor, el numero que escriba un jugador no cuenta: se
        // tira igual aqui. Sin esto, en una mesa en linea cualquiera escribe
        // "tiro 20" y el engine lo da por bueno.
        if (result === undefined || this.diceMode === 'engine') {
          // El DM pide la tirada y el engine la hace con su generador: el modelo nunca inventa el numero (regla 1).
          const d20 = /^1d20$/.test(rest.die) && (advantage || disadvantage)
          const rolled = d20 ? rollD20(this.random, { advantage, disadvantage }) : rollDice(rest.die, this.random)
          // `total` ya incluye el modificador de la expresion (2d6+1); `modifier` es el bono del personaje que el DM añade aparte.
          const total = ('total' in rolled ? rolled.total : rolled.result) + (rest.modifier ?? 0)
          const resolved = { ...rest, result: total, rolls: rolled.rolls, source: rolled.source, ...(advantage ? { advantage } : {}), ...(disadvantage ? { disadvantage } : {}) }
          return { ...event, resolved, visibility: { layer: 'campaign', witnesses } }
        }
        // Un numero escrito por el jugador este turno vale como tirada fisica; cualquier otro se descarta.
        const response = this.ctx.turn.responses.find((r) => r.characterId === actorId)
        if (!response || !new RegExp(`(?<![\\d])${result}(?![\\d])`).test(response.text)) return null
        return { ...event, resolved: { ...rest, result, source: 'physical' }, visibility: { layer: 'campaign', witnesses } }
      }
      case 'state_change': {
        for (const effect of event.effects) {
          if (!present(effect.who)) return null
          if (effect.op === 'condition' && effect.remove && !characters[refId(effect.who)]!.conditions.includes(effect.remove)) return null
        }
        return { ...event, actor: event.actor ?? event.effects[0]!.who, visibility: { layer: 'campaign', witnesses } }
      }
      case 'inventory_change': {
        for (const effect of event.effects) {
          const holder = effect.holder ?? event.actor
          if (!holder) return null
          const kind = holder.slice(0, holder.indexOf(':'))
          if (kind !== 'character' && kind !== 'npc') return null
          if (kind === 'character' && !present(holder)) return null
          if (effect.op === 'lose') {
            const inventory = kind === 'character' ? characters[refId(holder)]!.inventory : (this.ctx.state.world.npcs[refId(holder)]?.inventory ?? [])
            if (!inventory.some((i) => i.id === effect.item)) return null
          }
        }
        return { ...event, visibility: { layer: 'campaign', witnesses } }
      }
      case 'world_event':
        return { ...event, visibility: { layer: 'campaign', witnesses } }
      case 'rumor_heard': {
        // Quien lo oye tiene que estar en la escena.
        const targets = event.targets.filter((t) => present(t))
        if (targets.length === 0) return null
        return { ...event, targets, visibility: { layer: 'campaign', witnesses } }
      }
      case 'quest_update': {
        // Solo misiones que el pack declara: el DM no inventa misiones.
        if (!this.ctx.pack.quests.has(refId(event.payload.quest))) return null
        return { ...event, visibility: { layer: 'campaign', witnesses } }
      }
      case 'scene_started':
      case 'scene_closed':
        // Marca el principio o el final de una escena, y de paso deja el
        // mundo en su sitio: el reductor guarda el texto en la cronica y
        // `worldTime` pasa a ser el momento actual.
        return { ...event, visibility: { layer: 'campaign', witnesses } }
      case 'npc_action': {
        // Lo que hace un NPC delante de la mesa. No se exige que este en el
        // pack: un DM inventa NPCs sobre la marcha (el piloto no declara
        // ninguno y su historia esta llena de ellos), y un bloque `dialogue`
        // de un NPC desconocido ya se acepta. Rechazarlo aqui era la
        // incoherencia que dejaba "1 linea que no se pudo aplicar" en mesas
        // con NPCs improvisados (20-09).
        if (refKind(event.actor) !== 'npc') return null
        return { ...event, visibility: { layer: 'campaign', witnesses } }
      }
      case 'discovery': {
        // Quien averigua algo tiene que estar en la escena; el reductor lo
        // proyecta en lo que ese personaje sabe (knowledge).
        const targets = event.targets.filter((t) => present(t))
        if (targets.length === 0) return null
        return { ...event, targets, visibility: { layer: 'campaign', witnesses } }
      }
      case 'secret_revealed':
        // Solo secretos del pack y solo a la party presente; el reductor lo proyecta en knowledge.
        if (!this.ctx.pack.secrets.has(event.payload.secretId) || witnesses.length === 0) return null
        return { ...event, visibility: { layer: 'campaign', witnesses } }
    }
  }
}

/** Solo con `DM_LOG_RAW=1` en el entorno del engine; los packages no importan node, asi que se mira el global. */
function wantsRawLog(): boolean {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
  return env?.['DM_LOG_RAW'] === '1'
}

/**
 * Parte una linea con varios valores JSON de primer nivel seguidos
 * (`{...} {...}` o `{...},{...}`) en cada valor. Una linea con uno solo sale
 * tal cual. Respeta cadenas y escapes: una llave dentro de un texto no cuenta.
 */
export function splitJsonObjects(text: string): string[] {
  const pieces: string[] = []
  let depth = 0
  let inString = false
  let escaped = false
  let start = -1
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') {
      inString = true
      continue
    }
    if (ch === '{' || ch === '[') {
      if (depth === 0) start = i
      depth++
    } else if (ch === '}' || ch === ']') {
      depth--
      if (depth === 0 && start !== -1) {
        pieces.push(text.slice(start, i + 1))
        start = -1
      }
    }
  }
  return pieces.length > 0 ? pieces : [text]
}

/** Un d20 por personaje que declaro algo, en orden de llegada y sin repetir. */
export function preRollFor(characterIds: readonly string[], random: RandomSource): Record<string, number> {
  const rolled: Record<string, number> = {}
  for (const id of characterIds) {
    if (id in rolled) continue
    rolled[id] = rollD20(random, {}).result
  }
  return rolled
}
