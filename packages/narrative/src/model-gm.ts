import { CharacterRef, DiceSpec, EntityRef, KebabId, refId, refKind } from '@rpg-ngn/content'
import { fold } from '@rpg-ngn/campaign'
import { rollD20, rollDice, webCryptoRandom, type RandomSource } from '@rpg-ngn/core'
import { RollKind, RollRequest, TurnBlock, type DiceMode, type LintMode } from '@rpg-ngn/engine-contract'
import { tFor } from '@rpg-ngn/i18n'
import { z } from 'zod'
import { budgetFor, buildPlayerContext, buildTurnContext, clockOf, hasPreviousSession, privateActions, rollAllowance, type ContextBudget, type ContextProfile } from './context.js'
import { MILESTONE_NOTE, milestoneDue } from './pacing.js'
import { buildKnowledgeView, lintText, markRevealed, type KnowledgeView } from './lint.js'
import { systemPromptFor } from './prompt.js'
import type { GMOutput, GMProbe, GMProvider, GMSuggestion, GMTurnContext, ProposedEvent } from './provider.js'
import { GMProviderError, errorMessage, redact } from './redact.js'

/** Lo que el GM manda al modelo en un turno. */
export interface ModelPrompt {
  system: string
  /**
   * Prefijo de `user` que no cambia dentro de la sesion (mundo y fichas):
   * el transporte que sepa cachear lo marca. `user` lo incluye entero.
   */
  fixed?: string
  user: string
  maxOutputTokens: number
}

export interface ModelReply {
  finish: 'stop' | 'length' | 'refusal' | 'other'
  inputTokens: number
  outputTokens: number
  /** Tokens leidos del cache de prompt y escritos en el, si el proveedor los reporta. */
  cacheReadTokens?: number
  cacheWriteTokens?: number
}

/** El `usage` de una respuesta, con el cache solo si el proveedor lo reporto. */
export function usageOf(reply: ModelReply): { inputTokens: number; outputTokens: number; cacheReadTokens?: number; cacheWriteTokens?: number } {
  return {
    inputTokens: reply.inputTokens,
    outputTokens: reply.outputTokens,
    ...(reply.cacheReadTokens !== undefined ? { cacheReadTokens: reply.cacheReadTokens } : {}),
    ...(reply.cacheWriteTokens !== undefined ? { cacheWriteTokens: reply.cacheWriteTokens } : {}),
  }
}

/**
 * Transporte hacia un modelo de texto: emite el texto conforme llega y
 * termina con el resumen de la llamada. Un adapter por SDK (anthropic.ts,
 * openai.ts); todo lo demas (contexto, prompt, parser, validacion,
 * redaccion) es comun y vive en ModelGMProvider.
 */
export interface ModelTransport {
  readonly kind: string
  readonly model: string
  stream(prompt: ModelPrompt): AsyncGenerator<string, ModelReply, undefined>
  probe(): Promise<GMProbe>
}

export interface ModelGMOptions {
  /** `compact` apunta a menos de 3000 tokens de entrada (modelos locales). */
  contextProfile?: ContextProfile | undefined
  /** Anula el presupuesto que da el perfil. */
  budget?: ContextBudget
  /** Tope por defecto cuando la peticion no trae budget. */
  maxOutputTokens?: number
  /** Fuente de azar para las tiradas que pide el GM; Web Crypto por defecto, semilla en tests. */
  random?: RandomSource
  /**
   * Transporte para las ideas de accion (docs/27, bloque I). Con el, las
   * ideas salen de una llamada aparte que solo ve lo que el jugador sabe, y
   * el director deja de escribirlas. Sin el (modelos locales, donde otra
   * llamada son minutos) siguen saliendo en linea, del director.
   */
  ideasTransport?: ModelTransport | undefined
}

const DEFAULT_MAX_OUTPUT_TOKENS = 4000
/** Por cada jugador a partir del segundo: con tres, un turno llego a 3,925 de 4,000 (el razonamiento cuenta). */
const OUTPUT_TOKENS_PER_EXTRA_PLAYER = 800
/** Instrucciones de la llamada de ideas: corta y estable, para que el proveedor la cachee. */
/** Holgado: con un modelo que razona, el razonamiento cuenta en la salida y 400 no dejaban sitio para la linea. */
const IDEAS_MAX_OUTPUT_TOKENS = 1200
const IDEAS_SYSTEM = `Ayudas a un jugador de rol de mesa que no sabe qué hacer. Te doy lo que su personaje ha vivido y lo que acaba de pasar. Propón DOS cosas distintas que ese personaje podría intentar ahora mismo: una prudente y una atrevida.

Cómo se escriben: en primera persona del singular y en presente, como si las dijera el jugador ("Le pregunto qué vio", "Salgo a la calle sin esperar"), concretas, en menos de 12 palabras cada una, y que respondan a lo último que pasó. Nunca en infinitivo ("Preguntarle...") ni como orden ("Dile...").

Usa solo lo que aparece en el texto: no inventes nombres, lugares ni hechos que no estén ahí, y no adivines lo que nadie le ha dicho al personaje.

Responde con UNA sola línea JSON y nada más:
{"kind":"suggest","options":["...","..."]}`
/** Un objeto JSON partido en varias lineas se acumula hasta aqui antes de darlo por perdido. */
const MAX_PENDING_CHARS = 8000
/** Cuantas lineas se guardan en el diagnostico del turno y hasta que largo cada una. */
const MAX_NOTES = 12
const NOTE_CHARS = 600

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
// La deuda de la party entera, en los mundos que la declaran (`manifest.debt`).
const DebtEffect = z.strictObject({ op: z.literal('debt'), delta: z.number().int().refine((d) => d !== 0, 'delta 0 no cambia nada') })
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
  /** Siempre un NPC, tambien uno que el GM invente sobre la marcha. */
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
 * `worldTime` de cualquier evento, pero el GM no podia emitirlos: por eso
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
  z.strictObject({ type: z.literal('state_change'), actor: CharacterRef.optional(), effects: z.array(z.union([HpEffect, ConditionEffect, MemoryEffect, RelationshipEffect, MoveEffect, DebtEffect])).min(1) }),
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
  // drama-lite (H5) mueve lo mismo que la corte: reputacion, presion y pistas.
  if (rulesetId === 'court-intrigue' || rulesetId === 'drama-lite') return INTRIGUE_EVENT
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
  // Reloj de la historia (docs/26, H1): un logro por turno y el cierre de la sesion.
  z.object({ kind: z.literal('milestone'), title: z.string() }),
  // Lo privado (docs/26, H7): lo que solo un personaje percibe, sabe o recuerda.
  z.object({ kind: z.literal('whisper'), characterId: z.string(), text: z.string() }),
  z.object({ kind: z.literal('close'), cliffhanger: z.string().optional(), ending: z.string().optional() }),
  // `rollKind` y no `kind`: la clave `kind` ya es la de la linea.
  z.object({
    kind: z.literal('ask_roll'),
    characterId: z.string(),
    die: z.string().optional(),
    rollKind: z.string().optional(),
    skill: z.string().optional(),
    reason: z.string().optional(),
    advantage: z.boolean().optional(),
    disadvantage: z.boolean().optional(),
  }),
])

/**
 * GM con modelo. Recorre el stream del transporte linea a linea, emite
 * cada bloque en cuanto llega y filtra localmente los eventos que el engine
 * no podria aplicar (personaje inexistente, objeto que no se tiene, tirada
 * que nadie reporto). Lo que no se puede usar se ignora y se avisa al final
 * con un bloque `system`; el turno no se rompe por una linea mala. La prosa
 * suelta (modelos chicos que olvidan el formato) se convierte en narracion
 * en vez de perderse.
 */
export class ModelGMProvider implements GMProvider {
  readonly kind: string

  constructor(
    private readonly transport: ModelTransport,
    private readonly credential: string,
    private readonly options: ModelGMOptions = {},
  ) {
    this.kind = transport.kind
  }

  async *narrate(ctx: GMTurnContext): AsyncIterable<GMOutput> {
    const compact = this.options.contextProfile === 'compact'
    // Los bloques de sistema salen en el idioma de la mesa (i18n).
    const tr = tFor(ctx.language ?? 'es')
    const random = this.options.random ?? webCryptoRandom()
    // Sin modo, tira el servidor: aceptar numeros escritos es una eleccion
    // explicita para la mesa presencial, nunca lo que pasa por omision.
    const diceMode: DiceMode = ctx.dice ?? 'engine'
    // Con el servidor tirando, un d20 por cada personaje que declaro algo,
    // ANTES de llamar al modelo: el GM lo ve, lo usa si la accion tiene
    // riesgo y narra la consecuencia en el mismo turno. Antes pedia la
    // tirada y la pagaba un turno despues, o no la pedia (seis turnos de
    // una mesa de cinco sin un solo dado, 19-09).
    const preRolled = diceMode === 'engine' ? preRollFor(ctx.turn.responses.map((r) => r.characterId), random) : {}
    const built = buildTurnContext({ ...ctx, preRolled }, this.options.budget ?? budgetFor(this.options.contextProfile))
    const party = built.party
    const witnesses = party.map((id) => `character:${id}`)

    // La Fortuna de la sesion la tira cada jugador con su dado, y el numero
    // lo saca la API (Gabino, 24-09: tirada por el motor nadie la sentia
    // suya). Al GM solo se le dice que no la pida ni la invente; la que ya
    // se tiro llega en la ficha de cada personaje.
    const fortuneNote = ctx.session?.fortune?.length
      ? '\n\nFortuna de esta sesión: la tira cada jugador con su dado desde la mesa. No la pidas, no la tires tú ni inventes su número; la que ya se tiró está en la ficha de cada personaje y se nota en la escena sin explicarla.'
      : ''

    // Las declaraciones se registran siempre, sin depender del modelo.
    // En una mesa de acciones privadas lo que escribio cada uno lo ve el y
    // el GM: el bloque va con `to` y el evento en la capa del jugador.
    const secretActions = privateActions(ctx)
    for (const response of ctx.turn.responses) {
      const name = ctx.pack.characters.get(response.characterId)?.name ?? response.characterId
      const ref = `character:${response.characterId}`
      yield { kind: 'block', block: { type: 'dialogue', speaker: name, speakerRef: ref, text: response.text, declared: true, ...(secretActions ? { to: [response.characterId] } : {}) } }
      yield {
        kind: 'event',
        event: { type: 'player_action', actor: ref, declared: response.text, visibility: secretActions ? { layer: 'player', witnesses: [ref] } : { layer: 'campaign', witnesses } },
      }
    }

    const separateIdeas = this.separateIdeas
    const prompt: ModelPrompt = {
      system: systemPromptFor(ctx.rulesetId, compact, diceMode, ctx.language ?? 'es', separateIdeas ? 'separate' : 'inline'),
      user: built.user + fortuneNote,
      fixed: built.fixed,
      maxOutputTokens: ctx.maxOutputTokens ?? this.options.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS + OUTPUT_TOKENS_PER_EXTRA_PLAYER * Math.max(0, party.length - 1),
    }

    const interpreter = new LineInterpreter(ctx, party, ctx.lint ?? 'enforce', random, diceMode, preRolled)
    interpreter.rollsLeft = rollAllowance(ctx, party)?.left ?? null
    // Con "Anteriormente" del autor, el del modelo no vale: saldrian dos.
    interpreter.recapAllowed = ctx.turn.number === 1 && ctx.turn.responses.length === 0 && hasPreviousSession(ctx) && !ctx.session?.arc?.previously
    // En el turno de cierre del reloj el director puede (y debe) cerrar la sesion.
    const clock = clockOf(ctx)
    interpreter.closeAllowed = clock?.phase === 'cierre'
    // El logro solo vale en el turno en que el reloj lo pide; sin reloj nadie lo pidio.
    interpreter.milestoneAllowed = clock ? milestoneDue(clock) : false
    // Un final del arco con su condicion cumplida puede cerrar antes (H4), pero solo nombrandolo.
    interpreter.earlyEnding = clock?.earlyEnding ?? false
    interpreter.endingIds = (ctx.session?.arc?.endings ?? []).map((e) => e.id)
    interpreter.defaultEnding = ctx.session?.arc?.endings?.find((e) => e.default)?.id ?? null
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
      // Con la salida cortada por el limite, lo que quedo a medias no se repara.
      if (reply.finish === 'length') yield* interpreter.settleBeforeTail(buffer)
      interpreter.truncated = reply.finish === 'length'
      if (buffer.trim() !== '') yield* interpreter.line(buffer)
      yield* interpreter.finish()
      // Con GM_LOG_RAW=1 el engine deja en su log lo que el modelo dijo tal
      // cual. Es la unica forma de afinar un prompt sin adivinar; nunca en
      // produccion con mesas ajenas, porque el texto lleva la escena entera.
      if (wantsRawLog()) console.warn(`[gm raw ${this.transport.kind}/${this.transport.model}]\n${raw}\n[/gm raw]`)
    } catch (error) {
      throw new GMProviderError(`el modelo ${this.transport.kind}/${this.transport.model} falló: ${errorMessage(error)}`, this.credential, raw)
    }

    if (reply.finish === 'refusal') {
      throw new GMProviderError(`el modelo ${this.transport.kind}/${this.transport.model} rechazó narrar el turno`, this.credential, raw)
    }
    if (interpreter.blocks === 0) {
      throw new GMProviderError(`el modelo ${this.transport.kind}/${this.transport.model} no devolvió ningún bloque (${redact(raw.slice(0, 200), this.credential) || 'salida vacía'})`, this.credential, raw)
    }

    // Cada turno devuelve la palabra (docs/03), y el modelo suele hacerlo en
    // su ultimo bloque. Si el lint corto justo ese, la mesa se quedaba sin
    // pregunta y a la deriva (mesa 33, turno 5): el motor la devuelve.
    // En el turno de cierre no se devuelve la palabra: la sesion termina.
    if (reply.finish !== 'length' && interpreter.lastWasCut && !interpreter.closeAllowed) {
      const text = party.length === 1 ? tr('gm.whatDoYouDo', { name: ctx.pack.characters.get(party[0]!)?.name ?? party[0]! }) : tr('gm.whatDoYouAllDo')
      yield { kind: 'block', block: { type: 'narration', text } }
      yield { kind: 'event', event: { type: 'narration', payload: { text }, visibility: { layer: 'campaign', witnesses } } }
    }

    if (reply.finish === 'length') {
      yield { kind: 'block', block: { type: 'system', text: tr('gm.cutShort'), audience: 'table', tone: 'action', detail: tr('gm.cutShortDetail') } }
    }
    // El logro va al final de lo narrado: el modelo lo escribe primero y salia
    // antes del parrafo que lo gana ("Llego al lugar del choque" antes de llegar).
    if (interpreter.milestone) {
      yield { kind: 'block', block: { type: 'milestone', title: interpreter.milestone } }
      // Y queda en la cronica como evento: el GM del turno siguiente lo ve y
      // no lo repite con otro verbo ("Detuvieron el traslado", "Frenaron el
      // traslado"; boticaria, mesa 42).
      yield { kind: 'event', event: { type: 'world_event', payload: { note: `${MILESTONE_NOTE}${interpreter.milestone}` }, visibility: { layer: 'campaign', witnesses } } }
    }

    // Lo tecnico del turno (lineas rotas, reparadas, cortes del lint, la
    // salida tal cual) va al diagnostico, no a la historia: en una partida de
    // uno el anfitrion es el unico jugador y leia JSON entre parrafos; y sin
    // la salida cruda cada fallo se diagnosticaba adivinando (docs/27, D).
    yield {
      kind: 'diagnostics',
      diagnostics: {
        finish: reply.finish,
        ignored: interpreter.ignoredLines,
        ignoredCount: interpreter.ignored,
        lostStory: interpreter.lostStory,
        repaired: interpreter.repairedLines,
        dropped: interpreter.droppedNotes,
        lintCuts: interpreter.cuts,
        raw: redact(raw, this.credential),
      },
    }

    if (interpreter.scene) yield { kind: 'illustrate', moment: interpreter.scene }
    // Turno de cierre del reloj: la sesion termina aunque el modelo olvide
    // la linea `close` (sin cliffhanger), y no hay ideas ni tiradas para un
    // turno que no viene.
    if (interpreter.closeAllowed) {
      // Sin final valido en el cierre, el que el autor marco por omision.
      const closed = interpreter.closed ?? {}
      const endingId = closed.endingId ?? interpreter.defaultEnding ?? undefined
      yield { kind: 'close', ...closed, ...(endingId ? { endingId } : {}) }
      yield { kind: 'usage', ...usageOf(reply) }
      return
    }
    // Quien tiene tirada pedida tira, siempre con la palabra (aunque el modelo
    // lo olvidara en "addressed"). Sus ideas se quedan: con el dado puede
    // decir que intenta, y casi todos solo tiraban sin ideas (03-10).
    const requests = Object.values(interpreter.rollRequests)
    // Sin `addressed` (el modelo lo olvido o la salida se corto antes), la palabra es de todos.
    const named = interpreter.addressed
    // Quien tira va con la palabra aunque el modelo lo olvidara; y aquel al que
    // se le descarto una tirada de mas tambien: el modelo lo dejo esperando un
    // dado que no va a llegar, y sin la palabra no podria ni escribir.
    const extra = [...requests.map((r) => r.characterId), ...interpreter.overRolled]
    const addressed = [...(named ?? party), ...extra.filter((id, i) => !(named ?? party).includes(id) && extra.indexOf(id) === i)]

    // Ideas (docs/27, bloque I): con transporte propio (`separateIdeas`) las
    // pide el engine despues de aplicar los eventos del turno, con el estado ya
    // movido y solo lo que cada jugador sabe. Aqui solo salen las que escribio
    // el director cuando no hay transporte aparte (modelos locales).
    if (!separateIdeas && Object.keys(interpreter.suggestions).length) yield { kind: 'suggestions', byCharacter: interpreter.suggestions }
    if (requests.length) yield { kind: 'rollRequests', requests }
    // Una tirada pedida de mas deja una accion a medias: el GM lo sabe en el
    // turno siguiente por esta nota de su capa (la mesa no la ve) y la resuelve
    // sin dado. Sin esto la narracion pedia un dado que nunca llegaba y el
    // turno siguiente arrancaba como si nada.
    for (const note of interpreter.overRollNotes) {
      yield { kind: 'event', event: { type: 'world_event', payload: { note }, visibility: { layer: 'gm', witnesses: [] } } }
    }
    yield { kind: 'addressed', characterIds: addressed }
    yield { kind: 'usage', ...usageOf(reply) }
  }

  /**
   * "Otras" ideas (E10b): una llamada corta con el mismo contexto del turno
   * (el prefijo de sistema es el mismo, asi que el proveedor lo cachea) que
   * solo pide la linea `suggest` de un personaje. Cada idea pasa el lint
   * como las del turno: una sugerencia tambien puede filtrar un secreto.
   */
  async suggest(ctx: GMTurnContext, characterId: string, exclude: readonly string[], extra: { narrated?: readonly string[]; pendingRoll?: { skill?: string | undefined; reason?: string | undefined } | undefined } = {}): Promise<GMSuggestion> {
    const id = refId(characterId)
    const party = ctx.state.meta.sessions[ctx.turn.sessionId]?.party ?? []
    if (!party.includes(id)) throw new GMProviderError(`${characterId} no está en la sesión`, this.credential)
    const idea = await this.ideasFor(ctx, id, exclude, extra.narrated ?? [], extra.pendingRoll)
    // Con el porque: sin el, "no devolvio ideas" no decia si el modelo escribio
    // otra cosa o si el motor las descarto (y cuales).
    if (!idea.options.length) throw new GMProviderError(`el modelo ${idea.model} no devolvió ideas (${idea.why})`, this.credential)
    return { options: idea.options, usage: idea.usage }
  }

  /** Si las ideas del turno salen de una llamada aparte (la pide el engine con `suggest`) y no del director. */
  get separateIdeas(): boolean {
    return this.options.ideasTransport !== undefined
  }

  /**
   * Dos ideas para un personaje desde lo que su jugador sabe (docs/27, bloque
   * I). El contexto no trae secretos, puntos de trama ni finales: lo que no
   * esta delante no se puede filtrar. Antes salian de la llamada del director,
   * con la capa del GM entera, y el lint (frases exactas) no veia una
   * parafrasis: asi se le ofrecio a una jugadora preguntar por la culpable
   * antes de que nadie la nombrara (mesa 43). Cada idea pasa ademas el lint, y
   * aqui nombrar a alguien que la mesa no ha presenciado tambien la descarta.
   */
  private async ideasFor(ctx: GMTurnContext, id: string, exclude: readonly string[], narrated: readonly string[], pendingRoll?: { skill?: string | undefined; reason?: string | undefined }): Promise<GMSuggestion & { model: string; why: string }> {
    const transport = this.options.ideasTransport ?? this.transport
    const name = ctx.pack.characters.get(id)?.name ?? id
    const seen = exclude.filter((e) => e.trim()).map((e) => `"${e.trim()}"`)
    const ask = ['', `# Encargo`, '', `Dos ideas para ${name}.${seen.length ? ` Distintas de estas, que ya vio: ${seen.join(', ')}.` : ''}${ctx.language === 'en' ? ' Write them in English.' : ''}`].join('\n')
    const prompt: ModelPrompt = { system: IDEAS_SYSTEM, user: buildPlayerContext(ctx, id, narrated, this.options.budget ?? budgetFor(this.options.contextProfile), pendingRoll) + ask, maxOutputTokens: IDEAS_MAX_OUTPUT_TOKENS }

    let raw = ''
    let reply: ModelReply
    try {
      const stream = transport.stream(prompt)
      for (;;) {
        const next = await stream.next()
        if (next.done) {
          reply = next.value
          break
        }
        raw += next.value
      }
    } catch (error) {
      throw new GMProviderError(`el modelo ${transport.kind}/${transport.model} falló: ${errorMessage(error)}`, this.credential)
    }

    const party = ctx.state.meta.sessions[ctx.turn.sessionId]?.party ?? []
    const knowledge = (ctx.lint ?? 'enforce') === 'off' ? null : buildKnowledgeView(ctx, party)
    // Lo recien narrado ya lo oyo la mesa: una idea puede nombrar a quien acaba de aparecer.
    if (knowledge) knowledge.heard = `${knowledge.heard}\n${fold(narrated.join('\n'))}`
    const options: string[] = []
    const rejected: string[] = []
    // El modelo de ideas suele envolver la linea en un bloque de codigo o partirla en varias: se lee el objeto entero.
    const stripped = raw.replace(/```[a-z]*/gi, ' ').trim()
    const whole = parseLoose(stripped)
    const candidates: unknown[] = whole !== undefined ? [whole] : raw.split('\n').flatMap((line) => (/^[{[]/.test(line.trim()) ? splitJsonObjects(line.trim()) : [line])).map((piece) => parseLoose(piece))
    // Cortada por el limite de salida (mascarada, mesa 43: la mesa abrio sin
    // ideas): se cierra lo abierto y se usa lo que llego entero; la ultima
    // idea, si quedo a medias, no.
    if (!candidates.some((c) => c !== undefined)) {
      const start = stripped.indexOf('{')
      const repaired = start === -1 ? undefined : (repairJson(stripped.slice(start)) as { options?: unknown } | undefined)
      if (repaired && Array.isArray(repaired.options) && !/[\]}]\s*$/.test(stripped)) repaired.options = repaired.options.slice(0, -1)
      if (repaired) candidates.push(repaired)
    }
    for (const candidate of candidates) {
      const parsed = candidate as { kind?: unknown; options?: unknown; characterId?: unknown } | undefined
      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.options)) continue
      if (parsed.kind !== undefined && parsed.kind !== 'suggest') continue
      if (typeof parsed.characterId === 'string' && refId(parsed.characterId) !== id) continue
      for (const rawOption of parsed.options) {
        if (typeof rawOption !== 'string') continue
        const option = rawOption.trim().replace(/\s+/g, ' ').slice(0, 120)
        if (!option || options.includes(option) || exclude.includes(option)) continue
        const findings = knowledge ? lintText(option, knowledge, ctx.pack, [id]) : []
        if (findings.length > 0) {
          rejected.push(`"${option}" (${findings[0]!.message})`)
          continue
        }
        options.push(option)
        if (options.length === 2) break
      }
      if (options.length) break
    }
    const why = rejected.length ? `descartadas: ${rejected.join('; ')}` : `escribió: ${redact(raw.replace(/\s+/g, ' ').slice(0, 600), this.credential) || 'nada'}`
    return { options, usage: { inputTokens: reply.inputTokens, outputTokens: reply.outputTokens }, model: `${transport.kind}/${transport.model}`, why }
  }

  async probe(): Promise<GMProbe> {
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
export function scanJson(text: string, depth: number, startInString = false): { depth: number; inString: boolean } {
  let inString = startInString
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

/** Interpreta cada linea del modelo: la valida, la convierte en salidas del GM o la cuenta como ignorada. */
class LineInterpreter {
  /** Bloques que el lint corto este turno. */
  cuts: number
  /** El ultimo bloque de narracion o dialogo lo corto el lint. */
  lastWasCut: boolean
  /**
   * Bloques de historia retenidos desde que el lint corto uno: el cortado,
   * con su texto para volver a revisarlo, y los que vinieron detras, para que
   * salgan en orden. El modelo suele nombrar el secreto en el parrafo y
   * emitir `secret_revealed` despues (boticaria, mesa 42, turno 6: el nombre
   * del veneno se corto y la mesa lo supo por las pistas); al cerrar el turno
   * se revisa el cortado contra lo que el turno revelo y, si ya se puede
   * contar, se cuenta.
   */
  private held: Array<{ block: TurnBlock; retry: boolean }> = []
  blocks = 0
  ignored = 0
  /** Las lineas ignoradas, recortadas, para el diagnostico del turno. */
  ignoredLines: string[] = []
  /** De las ignoradas, cuantas eran historia (narracion o dialogo): eso si lo pierde la mesa. */
  lostStory = 0
  /** Lineas que llegaron rotas y se pudieron reparar o rescatar. */
  repairedLines: string[] = []
  /** Lo que el motor descarto a proposito (una tirada de mas, un bloque que no es del modelo). */
  droppedNotes: string[] = []
  /** La linea que se esta interpretando. */
  private current = ''
  /** Quien se movio este turno por un evento `move`, para que `where` no lo repita. */
  private moved = new Set<string>()

  /** Un `roll` de los modos donde tira el jugador, pendiente de que `playerRoll` decida (ver `event()`). */
  private pendingPlayerRoll: { event: ProposedEvent & { actor: string; resolved: Record<string, unknown> }; witnesses: string[] } | null = null

  /**
   * Cuenta una linea como descartada, con SU texto. Antes guardaba la ultima
   * linea leida, que con un objeto pendiente era otra: el aviso señalaba una
   * linea sana (`addressed`) y escondia la rota.
   */
  private ignore(text: string = this.current, story: boolean = isStoryText(text)): void {
    this.ignored++
    // Un bloque de historia roto (dialogo vacio, JSON mal cerrado) cuenta
    // como cortado: si era el ultimo, la mesa se quedaba sin pregunta y sin
    // ideas (mesa 43, turno 1, 03-10). Un evento roto no, porque suelen ir
    // despues de la pregunta.
    if (story) {
      this.lastWasCut = true
      this.lostStory++
    }
    if (text && this.ignoredLines.length < MAX_NOTES) this.ignoredLines.push(text.slice(0, NOTE_CHARS))
  }

  /** Apunta algo para el diagnostico del turno (lo lee quien administra, no la mesa). */
  private note(kind: 'repaired' | 'dropped', text: string): void {
    const list = kind === 'repaired' ? this.repairedLines : this.droppedNotes
    if (list.length < MAX_NOTES) list.push(text.slice(0, NOTE_CHARS))
  }

  /** Tiradas pedidas este turno, una por personaje (modos `dice` y `table`). */
  rollRequests: Record<string, RollRequest> = {}

  /**
   * Pide una tirada a un personaje de la party. Devuelve false si no se
   * puede (personaje ausente, dado mal formado). La primera peticion por
   * personaje manda; un `reason` o `skill` que cuente un secreto se corta.
   */
  private *requestRoll(raw: { characterId: string; die?: string | undefined; rollKind?: string | undefined; skill?: string | undefined; reason?: string | undefined; advantage?: boolean | undefined; disadvantage?: boolean | undefined }): Generator<GMOutput, boolean> {
    const id = refId(raw.characterId)
    if (!this.party.includes(id)) return false
    if (this.rollRequests[id]) return true
    // Sin tiradas que le queden en la sesion, la peticion se descarta: cada
    // una cuesta una ronda entera (docs/27, R1). El director lo sabe por
    // "Tiradas pedidas"; si aun asi la pide, queda apuntado y nadie espera un dado.
    if (this.rollsLeft && (this.rollsLeft[id] ?? 0) <= 0) {
      const about = [raw.skill, raw.reason].filter(Boolean).join(', ')
      this.note('dropped', `tirada pedida de mas para ${id}: ${about}`)
      if (!this.overRolled.includes(id)) {
        this.overRolled.push(id)
        const name = this.ctx.pack.characters.get(id)?.name ?? id
        this.overRollNotes.push(`Pendiente del GM (turno ${this.ctx.turn.number}): se le pidió una tirada a ${name}${about ? ` (${about})` : ''} y ya no le quedaban en esta sesión, así que no hubo dado. Su acción sigue sin resolver: resuélvela al empezar este turno, sin dado y con un costo.`)
      }
      return true
    }
    const kind = RollKind.safeParse(raw.rollKind)
    const skill = raw.skill?.trim().slice(0, 60)
    const reason = raw.reason?.trim().replace(/\s+/g, ' ').slice(0, 160)
    const parsed = RollRequest.safeParse({
      characterId: id,
      die: raw.die?.trim() || '1d20',
      kind: kind.success ? kind.data : 'other',
      ...(skill ? { skill } : {}),
      ...(reason ? { reason } : {}),
      ...(raw.advantage && !raw.disadvantage ? { advantage: true } : {}),
      ...(raw.disadvantage && !raw.advantage ? { disadvantage: true } : {}),
    })
    if (!parsed.success) return false
    const cut = yield* this.lint([skill, reason].filter(Boolean).join('. '))
    const request = cut ? { characterId: parsed.data.characterId, die: parsed.data.die, kind: parsed.data.kind } : parsed.data
    this.rollRequests[id] = request
    return true
  }
  addressed: string[] | null = null
  /** El momento que el GM pidio ilustrar este turno, si lo pidio. */
  scene: string | null = null
  /** "Anteriormente..." (E10c): permitido solo en la apertura con sesion previa, y uno. */
  recapAllowed = false
  recapped = false
  /** El reloj esta en el turno de cierre: la linea `close` vale. */
  closeAllowed = false
  /** El director cerro la sesion; el cliffhanger y el final del arco, si los dio. */
  closed: { cliffhanger?: string; endingId?: string } | null = null
  /** Un final del arco puede cerrar antes del presupuesto (H4). */
  earlyEnding = false
  endingIds: string[] = []
  defaultEnding: string | null = null
  /** La salida se corto por el limite: lo que quede a medias no se repara. */
  truncated = false
  /** Personajes a los que se les descarto una tirada pedida de mas: conservan la palabra. */
  overRolled: string[] = []
  /** Lo que el GM tiene que saber el turno siguiente de cada tirada descartada (capa del GM). */
  overRollNotes: string[] = []
  /** Si el reloj pide logro en este turno (docs/27, M7); fuera de eso, el del modelo se descarta. */
  milestoneAllowed = true
  /** El logro de este turno (uno como maximo); sale al final de lo narrado. */
  milestone: string | null = null
  /** Tiradas pedidas que le quedan a cada personaje en la sesion (modos `dice` y `table`); null si no hay tope. */
  rollsLeft: Record<string, number> | null = null
  /** Personajes que ya recibieron su susurro este turno: uno por personaje. */
  private whispered = new Set<string>()
  /** Ideas de accion por personaje (E10b). */
  suggestions: Record<string, string[]> = {}
  private pending: { text: string; depth: number; inString: boolean } | null = null
  private readonly knowledge: KnowledgeView | null
  private readonly allowed: ReturnType<typeof allowedEventFor>
  /** Dados ya usados este turno: el mismo d20 no vale para dos acciones. */
  private readonly usedPreRoll = new Set<string>()

  constructor(
    private readonly ctx: GMTurnContext,
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
  private *lint(text: string): Generator<GMOutput, boolean> {
    if (!this.knowledge) return false
    const findings = lintText(text, this.knowledge, this.ctx.pack)
    for (const finding of findings) yield { kind: 'lint', finding }
    return this.lintMode === 'enforce' && findings.some((f) => f.level === 'error')
  }

  *line(rawLine: string): Generator<GMOutput> {
    const text = rawLine.trim()
    this.current = text
    // Fences de markdown y etiquetas sueltas (`<json>`, `</output>`) con las
    // que algunos modelos envuelven la salida: no son ni bloque ni evento.
    if (text === '' || text.startsWith('```') || /^<\/?[a-z][\w-]*>$/i.test(text)) return

    // Un objeto o array que empezo en una linea anterior y sigue aqui (JSON con formato).
    if (this.pending !== null) {
      // Una linea que empieza un registro no continua nada: lo pendiente estaba
      // roto. Antes se le pegaba todo lo que venia detras y el turno entero se
      // perdia (mesa 44, sesion 003, turno 5). Se mira como empieza, no si se
      // puede leer: una linea con un punto de mas tambien corta. Y dentro de
      // una cadena abierta, una llave al principio de linea es otro registro,
      // no texto: nadie narra una linea que empieza con "{".
      const boundary = this.breaksPending(text)
      if (!boundary) {
        // Si lo pendiente quedo dentro de una cadena, el modelo metio un salto
        // de linea en mitad de un texto: se une como salto escapado, que es lo
        // que JSON admite, y el parrafo llega entero.
        const scanned = scanJson(text, this.pending.depth, this.pending.inString)
        this.pending = { text: `${this.pending.text}${this.pending.inString ? '\\n' : '\n'}${text}`, depth: scanned.depth, inString: scanned.inString }
        if ((!scanned.inString && scanned.depth <= 0) || this.pending.text.length > MAX_PENDING_CHARS) yield* this.closePending()
        return
      }
      // Lo pendiente se cierra como se pueda y esta linea se lee por si misma.
      yield* this.closePending()
    }

    const record = stripListPrefix(text)
    // `[El reloj marca las once.]` es prosa entre corchetes, no una lista JSON.
    if (/^[{[]/.test(record) && !/^\[[^{["\]]*\]$/.test(record)) {
      // Varios objetos en la misma linea ({...} {...}): Haiku lo hace y antes
      // la linea entera fallaba al parsear y el turno acababa "sin bloques"
      // con una narracion perfecta dentro (mesa "cinco personas", 19-09). Cada
      // uno se lee por separado; si el ultimo quedo sin cerrar, es su problema
      // y no el de los anteriores.
      const { segments, rest } = splitRecords(record)
      for (const segment of segments) {
        if (segment.json) yield* this.piece(segment.json)
        // Prosa entre objetos o detras del ultimo: historia, salvo una anotacion
        // del modelo ("// fin del turno", "<- quien responde").
        else if (isAnnotation(segment.text)) this.note('dropped', `anotacion del modelo: ${segment.text}`)
        else yield* this.prose(segment.text)
      }
      if (rest === null) return
      const scanned = scanJson(rest, 0)
      // Solo se repara al vuelo el trozo que ya cerro algo y se quedo corto de
      // cierres (termina en llave o corchete): es el caso real, una llave de
      // menos. Si termina en coma o en comilla puede seguir en la linea
      // siguiente (un registro partido en dos); repararlo ahi le quitaba
      // campos y dejaba el resto como narracion con claves de JSON.
      if (/[}\]]$/.test(rest) && !scanned.inString && (yield* this.recover(rest))) return
      this.pending = { text: rest, depth: scanned.depth, inString: scanned.inString }
      return
    }

    // Prosa y, en la misma linea, un registro: cada cosa por su lado. Antes el
    // registro se leia y la prosa de delante se perdia (o el turno moria sin bloques).
    const inline = /\{\s*"(?:kind|type)"\s*:/.exec(text)
    if (inline && inline.index > 0) {
      yield* this.prose(text.slice(0, inline.index))
      yield* this.line(text.slice(inline.index))
      return
    }

    if (isChatter(text)) return
    if (isAnnotation(text)) {
      this.note('dropped', `anotacion del modelo: ${text}`)
      return
    }

    const parsed = parseLoose(text)
    if (parsed !== undefined) {
      yield* this.items(parsed, text)
      return
    }
    // Prosa suelta: el modelo olvido el formato; se narra en vez de perderse.
    yield* this.prose(text)
  }

  *finish(): Generator<GMOutput> {
    if (this.pending !== null) yield* this.closePending()
    yield* this.releaseHeld()
  }

  /** Cierra el objeto pendiente: lo lee, lo repara o rescata su texto; si nada vale, lo cuenta con SU texto. */
  private *closePending(): Generator<GMOutput> {
    const text = this.pending?.text ?? ''
    this.pending = null
    // Solo el corchete o la llave que abria una lista con un registro por
    // linea, o la envoltura cuyo contenido llego en la linea siguiente: los
    // registros ya se leyeron uno a uno y aqui no queda nada.
    if (/^[[\]{},\s]*$/.test(text) || /^\{\s*"kind"\s*:\s*"(?:block|event)"\s*,\s*"(?:block|event)"\s*:\s*$/.test(text)) return
    // Entero si se puede leer entero (JSON con formato en varias lineas).
    try {
      yield* this.items(JSON.parse(text.replace(/,\s*$/, '')) as unknown, text)
      return
    } catch {
      // Sigue abajo, trozo a trozo.
    }
    // Si no, cada objeto por separado: lo que venia pegado a un trozo roto no
    // se pierde con el, y lo que no se pueda usar queda apuntado con su texto.
    const { segments, rest } = splitRecords(text)
    for (const segment of segments) {
      if (segment.json) yield* this.piece(segment.json)
      else yield* this.prose(segment.text)
    }
    if (rest !== null && !(yield* this.recover(rest))) this.ignore(rest)
  }

  /** Un objeto JSON suelto y entero en sus llaves: se lee, se recupera o se apunta. */
  private *piece(piece: string): Generator<GMOutput> {
    const parsed = parseLoose(piece)
    if (parsed !== undefined) yield* this.items(parsed, piece)
    else if (!(yield* this.recover(piece))) this.ignore(piece)
  }

  /**
   * Antes de procesar el ultimo trozo de una salida cortada por el limite: lo
   * pendiente que ese trozo no continua (porque empieza otro registro) no lo
   * corto el limite, solo le faltaba un cierre, y se repara como siempre.
   */
  *settleBeforeTail(tail: string): Generator<GMOutput> {
    if (this.pending === null) return
    const rest = tail.trim()
    // Sin cola: si lo pendiente termina en un valor ya cerrado, le faltaba la
    // llave y no el texto; el limite cayo justo en el salto de linea.
    if (rest === '' ? !this.pending.inString && /["}\]]$/.test(this.pending.text.trimEnd()) : this.breaksPending(rest)) yield* this.closePending()
  }

  /**
   * Si una linea NO continua lo pendiente y por tanto lo cierra. Tres casos:
   * empieza un registro (`{"kind":`); empieza con una llave y lo pendiente
   * esta dentro de una cadena o termina en un valor ya cerrado (sin coma ni
   * dos puntos antes: JSON con formato al que le falto un cierre); o, fuera
   * de una cadena, empieza con algo que no puede continuar JSON, es decir,
   * prosa. Sin este ultimo, un dialogo sin su llave final se tragaba la
   * narracion en prosa que venia detras y la ponia en boca del NPC.
   */
  private breaksPending(text: string): boolean {
    const pending = this.pending
    if (pending === null) return false
    if (startsRecord(text)) return true
    if (pending.inString) return text.startsWith('{')
    const tail = pending.text.trimEnd()
    // Tras una coma, dos puntos o una apertura puede venir una clave o un valor.
    if (/[,:[{]$/.test(tail)) return !/^(?:["{[\d-]|true\b|false\b|null\b)/.test(text)
    // Tras un valor ya cerrado (comilla, numero, llave, corchete, true, false,
    // null) lo unico que sigue en JSON es una coma o un cierre; lo demas es
    // otra cosa: un registro nuevo, o prosa, aunque empiece con comillas, con
    // un guion de viñeta, con un numero o con un corchete.
    return !/^[,}\]]/.test(text)
  }

  /**
   * Una linea que no es JSON valido: se le cierra lo que dejo abierto y, si
   * aun asi no sirve y era historia, se rescata su texto. La historia vale
   * mas que su envoltura; un evento roto si se descarta.
   */
  private *recover(text: string): Generator<GMOutput, boolean> {
    // Lo que corto el limite de salida no se repara: cerrar a ciegas una linea
    // a medias daba por bueno un numero incompleto (un daño de -1 que iba a
    // ser -10) o una frase que podia decir lo contrario. Ya sale el aviso de corte.
    // Salvo que lo cortado termine en un valor ya cerrado fuera de una cadena:
    // entonces solo le faltaban los cierres y lo escrito esta entero.
    if (this.truncated && (scanJson(text, 0).inString || !/["}\]]$/.test(text.trimEnd()))) {
      this.note('dropped', `salida cortada: ${text}`)
      if (isStoryText(text)) this.lostStory++
      return true
    }
    const repaired = repairJson(text)
    if (repaired !== undefined && !hasJsonResidue(repaired) && this.usable(repaired)) {
      this.note('repaired', text)
      yield* this.items(repaired, text)
      return true
    }
    const saved = salvageStory(text)
    if (saved) {
      this.note('repaired', text)
      // Si dentro venian pegados mas parrafos, esos si se perdieron.
      this.lostStory += Math.max(0, storyRecordsIn(text) - 1)
      if (recordsIn(text) > storyRecordsIn(text)) this.ignore(`(pegado a un parrafo rescatado) ${text}`, false)
      yield* this.block(saved)
      return true
    }
    return false
  }

  /** Si esto, ya leido, se podria usar: un bloque de historia valido, un evento con forma valida o una linea de control. */
  private usable(parsed: unknown): boolean {
    const list = Array.isArray(parsed) ? parsed : [parsed]
    return list.length > 0 && list.every((item) => {
      const record = normalizeRecord(item)
      if (!record) return false
      if (record.kind === 'block') return storyBlock(record.raw) !== null
      if (record.kind === 'event') return this.allowed.safeParse(record.raw).success
      return true
    })
  }

  private *items(parsed: unknown, source: string): Generator<GMOutput> {
    const list = Array.isArray(parsed) ? parsed : [parsed]
    for (const item of list) yield* this.item(item, list.length === 1 ? source : JSON.stringify(item))
  }

  private *prose(text: string): Generator<GMOutput> {
    // Viñeta delante y cursiva que envuelve la linea entera: fuera.
    let cleaned = text.replace(/^[-*•]\s+/, '').trim().replace(/^\*([^*].*[^*])\*$/, '$1').replace(/^_(.+)_$/, '$1').trim()
    // `**Etiqueta:** resto`: si la etiqueta es alguien que habla, es su
    // dialogo; si no (un encabezado como "Narración del GM"), sobra.
    const labelled = /^\*\*([^*]{1,40}?):?\*\*:?\s*(.*)$/.exec(cleaned)
    if (labelled) {
      const label = labelled[1]!.trim()
      const rest = labelled[2]!.trim()
      if (proseDialogue(`${label}: ${rest}`, this.speakerRef)) cleaned = `${label}: ${rest}`
      else if (isModelNote(`${label}: ${rest}`)) {
        this.note('dropped', `nota del modelo, no se narra: ${cleaned}`)
        this.lostStory++
        return
      } else cleaned = rest
    }
    if (cleaned === '' || isChatter(cleaned)) return
    // El resto de un registro partido (`"speaker":"Ignacio"}`, `y calló."}`) no
    // es prosa: narrarlo ponia claves y llaves de JSON delante de la mesa.
    if (looksLikeJson(cleaned)) {
      this.ignore(cleaned, true)
      return
    }
    // "Lucía (npc:lucia): «¿Emiliano?»": el modelo escribio el dialogo como
    // prosa. Sigue siendo alguien hablando: sale como dialogo, con su hablante,
    // y la mesa no lee la referencia interna (partida de prueba con Sonnet, 05-10).
    const spoken = proseDialogue(cleaned, this.speakerRef)
    if (spoken) {
      yield* this.block(spoken)
      return
    }
    // Una nota del modelo para si mismo ("Nota: el jugador eligio X, sigue el
    // final medico") no es historia: no llega a la mesa y queda apuntada.
    if (isModelNote(cleaned)) {
      this.note('dropped', `nota del modelo, no se narra: ${cleaned}`)
      this.lostStory++
      return
    }
    // La cola de una salida cortada por el limite: una frase a medias no se narra.
    if (this.truncated) {
      this.note('dropped', `salida cortada: ${cleaned}`)
      this.lostStory++
      return
    }
    yield* this.block({ type: 'narration', text: cleaned })
  }

  /**
   * La referencia de quien habla por su nombre, si la mesa lo conoce: un NPC
   * del mundo, un personaje de la mesa o alguien que ya hablo en la sesion
   * (null: conocido pero sin ficha). undefined si ese nombre no es de nadie:
   * entonces "Nombre: «...»" no es un dialogo ("Las once: «ya es tarde»").
   */
  private readonly speakerRef = (name: string): string | null | undefined => {
    const wanted = fold(name)
    for (const npc of this.ctx.pack.npcs.values()) if (fold(npc.name) === wanted) return `npc:${npc.id}`
    for (const id of this.party) if (fold(this.ctx.pack.characters.get(id)?.name ?? id) === wanted) return `character:${id}`
    for (const event of this.ctx.recentEvents ?? []) {
      const payload = 'payload' in event && event.payload && typeof event.payload === 'object' ? (event.payload as Record<string, unknown>) : {}
      if (typeof payload['speaker'] === 'string' && fold(payload['speaker']) === wanted) return typeof payload['speakerRef'] === 'string' ? payload['speakerRef'] : null
    }
    return this.spoke.has(wanted) ? null : undefined
  }

  /** Quien ya hablo este turno en un dialogo bien formado: su nombre vale como hablante el resto del turno. */
  private readonly spoke = new Set<string>()

  private *item(parsed: unknown, source: string): Generator<GMOutput> {
    // Todas las formas en que el modelo escribe lo mismo se reducen a tres:
    // un bloque de historia, un evento o una linea de control (`normalizeRecord`).
    const record = normalizeRecord(parsed)
    if (!record) {
      this.ignore(source)
      return
    }
    if (record.kind === 'block') {
      // Un bloque que el modelo marco para alguien con `to` era privado: sale
      // como susurro o no sale, nunca publico. Vale con `to` como lista o como
      // texto suelto. `characterId` no cuenta: en una narracion es un campo de
      // mas (el susurro tiene su propia linea), y tratarlo como privado le
      // quitaba a la mesa parrafos enteros.
      const marked = record.raw as { to?: unknown; characterId?: unknown } | null
      if (marked?.characterId !== undefined) this.note('dropped', `campo characterId de mas en un bloque de historia: ${source}`)
      const target = marked?.to
      if (target !== undefined && target !== null) {
        const to = typeof target === 'string' ? [target] : Array.isArray(target) ? target : []
        const story = storyBlock(record.raw)
        if (story && to.length === 1 && typeof to[0] === 'string') {
          const whisper = { kind: 'whisper', characterId: to[0], text: story.type === 'dialogue' ? `${story.speaker}: ${story.text}` : story.text }
          // Si no se puede (ya tuvo su susurro, no esta en la mesa), se apunta como susurro y no como historia de la mesa.
          yield* this.item(whisper, JSON.stringify(whisper))
        } else this.ignore(source, false)
        return
      }
      // Del modelo solo salen narracion y dialogo: un bloque `system`, `image`
      // o `ending` escrito por el no es historia, es el modelo haciendose
      // pasar por el motor.
      const block = storyBlock(record.raw)
      if (!block) {
        this.ignore(source)
        return
      }
      yield* this.block(block)
      return
    }
    if (record.kind === 'event') {
      if (!(yield* this.emitProposed(record.raw))) this.ignore(source)
      return
    }

    const line = { data: record.line }
    switch (line.data.kind) {
      // `block` y `event` ya salieron arriba; quedan las lineas de control.
      case 'block':
      case 'event':
        return
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
          this.ignore(source)
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
      case 'milestone': {
        // Un logro por turno, corto, y pasa el lint como cualquier texto que la mesa ve.
        // Hasta 80 caracteres sin partir palabras (la partida de prueba del 04-10 cerro uno en "empieza por ").
        const title = clipWords(line.data.title.trim().replace(/\s+/g, ' '), 80)
        if (!title || this.milestone !== null) return
        if (!this.milestoneAllowed) {
          this.note('dropped', `logro fuera de su turno: ${title}`)
          return
        }
        const cut = yield* this.lint(title)
        if (cut) return
        this.milestone = title
        return
      }
      case 'whisper': {
        // Solo para ese personaje: el bloque lleva `to`, el evento va en la
        // capa del jugador y el lint lo revisa contra el, no contra la mesa.
        const id = refId(line.data.characterId)
        if (!this.party.includes(id) || this.whispered.has(id)) {
          this.ignore(source)
          return
        }
        const text = clipWords(line.data.text.trim().replace(/\s+/g, ' '), 420)
        if (!text) return
        // Un susurro puede revelarle un secreto solo a ese personaje: el
        // secreto queda revelado para el y nadie mas (el lint no lo corta).
        const revealed: string[] = []
        if (this.knowledge) {
          const findings = lintText(text, this.knowledge, this.ctx.pack, [id])
          for (const finding of findings) {
            if (finding.level === 'error' && finding.secretId && this.ctx.pack.secrets.has(finding.secretId)) revealed.push(finding.secretId)
            else yield { kind: 'lint', finding }
          }
          for (const secretId of revealed) markRevealed(this.knowledge, secretId, [id])
        }
        for (const secretId of new Set(revealed)) {
          yield { kind: 'event', event: { type: 'secret_revealed', payload: { secretId }, visibility: { layer: 'player', witnesses: [`character:${id}`] } } }
        }
        this.whispered.add(id)
        this.blocks++
        yield { kind: 'block', block: { type: 'narration', text, to: [id] } }
        yield { kind: 'event', event: { type: 'narration', payload: { text }, visibility: { layer: 'player', witnesses: [`character:${id}`] } } }
        return
      }
      case 'close': {
        // Solo en el turno de cierre del reloj, o antes si nombra un final del
        // arco cuya condicion se cumplio (H4). Fuera de eso, el modelo no
        // termina la sesion por su cuenta.
        const ending = line.data.ending?.trim().replace(/^ending:/, '')
        const validEnding = ending !== undefined && this.endingIds.includes(ending) ? ending : undefined
        if (!this.closeAllowed && !(this.earlyEnding && validEnding)) {
          this.ignore(source)
          return
        }
        const cliffhanger = line.data.cliffhanger?.trim().replace(/\s+/g, ' ').slice(0, 500)
        this.closed = { ...(cliffhanger ? { cliffhanger } : {}), ...(validEnding ? { endingId: validEnding } : {}) }
        this.closeAllowed = true
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
        yield { kind: 'block', block: { type: 'system', title: tFor(this.ctx.language ?? 'es')('gm.previously'), text, audience: 'table', tone: 'info', recap: true } }
        return
      }
      case 'ask_roll': {
        // El GM pide la tirada y no narra su consecuencia: el jugador la
        // suelta desde la mesa (modo `dice`) o escribe su numero (`table`).
        // Con el motor tirando no tiene sentido: ya tiro antes de llamar.
        if (this.diceMode === 'engine') {
          this.ignore(source)
          return
        }
        if (!(yield* this.requestRoll(line.data))) this.ignore(source)
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

  private *block(raw: TurnBlock): Generator<GMOutput> {
    // Lo que el modelo deja colgando al final de un texto no es historia.
    const block = raw.type === 'narration' || raw.type === 'dialogue' ? { ...raw, text: tidyStory(raw.text) || raw.text } : raw
    this.blocks++
    if (block.type === 'narration' || block.type === 'dialogue') {
      const cut = yield* this.lint(block.text)
      if (cut || this.held.length) {
        // Cortado: no sale ahora. Se retiene con lo que venga detras y al
        // cerrar el turno se vuelve a mirar (ver `held`). Si entonces sigue
        // cortado, no llega a la mesa ni a la cronica; el motivo va en
        // result.lint y el aviso al anfitrion sale una vez, al final del
        // turno: en medio de la historia parecia que el GM se corregia en
        // vivo (Gabino, 23-09).
        this.held.push({ block, retry: cut })
        return
      }
      this.lastWasCut = false
    }
    yield* this.emitBlock(block)
  }

  /** Secretos del pack que alguno de estos textos nombra con sus palabras y que la mesa entera aun no conoce. */
  private secretsNamedIn(texts: readonly string[]): string[] {
    if (!this.knowledge || texts.length === 0) return []
    const folded = fold(texts.join('\n'))
    const out: string[] = []
    for (const secret of this.ctx.pack.secrets.values()) {
      const known = this.knowledge.secrets.get(secret.id)
      if (known && this.party.every((id) => known.has(id))) continue
      if (secret.keywords.some((k) => folded.includes(fold(k)))) out.push(secret.id)
    }
    return out
  }

  /** Al cerrar el turno: lo retenido sale en orden, y lo cortado solo si lo que el turno revelo ya lo permite. */
  private *releaseHeld(): Generator<GMOutput> {
    const held = this.held
    this.held = []
    for (const { block, retry } of held) {
      if (retry && (block.type === 'narration' || block.type === 'dialogue')) {
        // Sin avisar dos veces: los hallazgos ya salieron la primera vez.
        const findings = this.knowledge ? lintText(block.text, this.knowledge, this.ctx.pack) : []
        if (this.lintMode === 'enforce' && findings.some((f) => f.level === 'error')) {
          this.cuts++
          this.lastWasCut = true
          continue
        }
      }
      this.lastWasCut = false
      yield* this.emitBlock(block)
    }
  }

  private *emitBlock(block: TurnBlock): Generator<GMOutput> {
    const witnesses = this.party.map((id) => `character:${id}`)
    if (block.type === 'dialogue') {
      this.spoke.add(fold(block.speaker))
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
   * como conocido para el resto del turno: el GM lo revelo a proposito.
   */
  private *emitEvent(event: ProposedEvent): Generator<GMOutput> {
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
    // Una pista o un descubrimiento que usa las palabras de un secreto es el
    // GM revelandolo a proposito: cuenta como `secret_revealed` a la mesa, y
    // la narracion que lo cuenta ya no se corta. Antes la pista llegaba a la
    // ficha del jugador y el parrafo que la contaba se perdia (boticaria,
    // mesa 44, turnos 6 y 7: "cal viva" tres veces).
    const told: string[] = []
    if (event['type'] === 'state_change') for (const effect of (event['effects'] as Array<Record<string, unknown>> | undefined) ?? []) if (effect['op'] === 'clue' && typeof effect['clue'] === 'string') told.push(effect['clue'])
    if (event['type'] === 'discovery') for (const key of ['method', 'note']) if (typeof (event['payload'] as Record<string, unknown>)?.[key] === 'string') told.push((event['payload'] as Record<string, string>)[key]!)
    for (const secretId of this.secretsNamedIn(told)) {
      if (this.knowledge) markRevealed(this.knowledge, secretId)
      yield { kind: 'event', event: { type: 'secret_revealed', payload: { secretId, how: 'el GM lo dio como pista' }, visibility: { layer: 'campaign', witnesses: this.party.map((id) => `character:${id}`) } } }
    }
    if (event['type'] === 'roll' && (event['resolved'] as { kind?: string }).kind === 'fortune') {
      // La Fortuna la tira el jugador por la API; el d20 que el modelo
      // quiera usar como Fortuna cuenta como tirada cualquiera y no la pisa.
      event = { ...event, resolved: { ...(event['resolved'] as object), kind: 'other' } }
    }
    if (event['type'] === 'roll') {
      // La mesa ve el dado caer: un bloque roll con el resultado, tirado por el engine o escrito por el jugador.
      const resolved = event['resolved'] as { die: string; result: number; skill?: string; source: string; rolls?: number[]; advantage?: boolean; disadvantage?: boolean }
      const actor = event['actor'] as string
      const name = this.ctx.pack.characters.get(refId(actor))?.name ?? refId(actor)
      const detail = resolved.skill ? ` (${resolved.skill})` : ''
      const dice = resolved.rolls && resolved.rolls.length > 1 ? ` [${resolved.rolls.join(', ')}]` : ''
      const tr = tFor(this.ctx.language ?? 'es')
      const origin = resolved.source === 'physical' ? tr('gm.withOwnDie') : ''
      yield {
        kind: 'block',
        block: {
          type: 'roll',
          text: tr('gm.roll', { name, die: resolved.die, skill: detail, origin, result: resolved.result, dice }),
          actor,
          die: resolved.die,
          result: resolved.result,
          ...(resolved.rolls ? { rolls: resolved.rolls } : {}),
          ...(resolved.advantage ? { advantage: 'advantage' as const } : resolved.disadvantage ? { advantage: 'disadvantage' as const } : {}),
        },
      }
    }
    yield { kind: 'event', event }
  }

  /**
   * Un evento `roll` en los modos donde el jugador tira (`dice`, `table`).
   * Devuelve el evento si vale, o null tras decidir que hacer con el: la
   * tirada que la API ya registro como respuesta se calla sin contar; la que
   * el GM pide sin numero se vuelve peticion; y el numero que el GM invento
   * (mesa 39, 25-09) tambien se vuelve peticion, pero se le cuenta al
   * anfitrion, porque la narracion que la mesa leyo ya lo dio por bueno.
   */
  private *playerRoll(event: ProposedEvent & { actor: string; resolved: Record<string, unknown> }, witnesses: string[]): Generator<GMOutput, ProposedEvent | true | null> {
    const actorId = refId(event.actor)
    const resolved = event.resolved as { result?: number; source?: string; die: string; kind: string; skill?: string; advantage?: boolean; disadvantage?: boolean; modifier?: number }
    const response = this.ctx.turn.responses.find((r) => r.characterId === actorId)
    const ask = { characterId: actorId, die: resolved.die, rollKind: resolved.kind, skill: resolved.skill, advantage: resolved.advantage, disadvantage: resolved.disadvantage }
    if (response?.roll) {
      // Ya esta en la cronica: la registro la API cuando el jugador solto el dado.
      return true
    }
    if (resolved.result === undefined) {
      return (yield* this.requestRoll(ask)) ? true : null
    }
    if (this.diceMode === 'table' && response && new RegExp(`(?<![\\d])${resolved.result}(?![\\d])`).test(response.text)) {
      const { result, source: _source, advantage: _a, disadvantage: _d, ...rest } = resolved
      return { ...event, resolved: { ...rest, result, source: 'physical' }, visibility: { layer: 'campaign', witnesses } }
    }
    // Un numero que nadie tiro. Se pide la tirada de verdad y se avisa.
    if (!(yield* this.requestRoll(ask))) return null
    if (this.ignoredLines.length < 5) this.ignoredLines.push(`El GM inventó un ${resolved.result} y se le pidió la tirada al jugador: ${this.current.slice(0, 200)}`)
    this.ignored++
    return true
  }

  /**
   * Valida y emite un evento propuesto. Devuelve true si la linea quedo
   * atendida (emitida, o convertida en peticion de tirada) y false si hay
   * que ignorarla. Es el unico camino para los `roll` de los modos `dice` y
   * `table`, porque decidirlos puede emitir (el lint de la peticion).
   */
  private *emitProposed(raw: unknown): Generator<GMOutput, boolean> {
    const event = this.event(raw)
    if (event) {
      yield* this.emitEvent(event)
      return true
    }
    const pending = this.pendingPlayerRoll
    if (!pending) return false
    this.pendingPlayerRoll = null
    const decided = yield* this.playerRoll(pending.event, pending.witnesses)
    if (decided === true || decided === null) return decided === true
    yield* this.emitEvent(decided)
    return true
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
        if (this.diceMode !== 'engine') {
          // Lo decide `playerRoll`, que necesita emitir (lint de la peticion):
          // `event()` es sincrono, asi que se deja marcado y `emitProposed` lo recoge.
          this.pendingPlayerRoll = { event: event as ProposedEvent & { actor: string; resolved: Record<string, unknown> }, witnesses }
          return null
        }
        const { result, source: _source, advantage, disadvantage, ...rest } = event.resolved
        // El d20 que el motor ya tiro para ese personaje este turno: el GM lo
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
          // El GM pide la tirada y el engine la hace con su generador: el modelo nunca inventa el numero (regla 1).
          const d20 = /^1d20$/.test(rest.die) && (advantage || disadvantage)
          const rolled = d20 ? rollD20(this.random, { advantage, disadvantage }) : rollDice(rest.die, this.random)
          // `total` ya incluye el modificador de la expresion (2d6+1); `modifier` es el bono del personaje que el GM añade aparte.
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
          // Como trata un NPC a un personaje: el sujeto es el NPC y quien la
          // recibe tiene que estar en escena. El prompt la enseña asi y el
          // reductor la aplica, pero aqui se exigia un personaje en `who` y se
          // tiraba siempre (mesa 44, 05-10). Igual una condicion sobre un NPC.
          if (effect.op === 'relationship') {
            if (refKind(effect.who) !== 'npc' || !present(effect.with)) return null
            continue
          }
          // La deuda es de la party entera: no tiene sujeto.
          if (effect.op === 'debt') continue
          if (effect.op === 'condition' && refKind(effect.who) === 'npc') continue
          if (!present(effect.who)) return null
          if (effect.op === 'condition' && effect.remove && !characters[refId(effect.who)]!.conditions.includes(effect.remove)) return null
        }
        const subject = event.effects.find((e): e is Extract<typeof e, { who: string }> => 'who' in e)?.who
        return { ...event, ...(event.actor ?? subject ? { actor: event.actor ?? subject } : {}), visibility: { layer: 'campaign', witnesses } }
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
        // Solo misiones que el pack declara: el GM no inventa misiones.
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
        // pack: un GM inventa NPCs sobre la marcha (el piloto no declara
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

/** Solo con `GM_LOG_RAW=1` en el entorno del engine; los packages no importan node, asi que se mira el global. */
function wantsRawLog(): boolean {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
  // DM_LOG_RAW: nombre anterior al renombre a GM (29-09).
  return (env?.['GM_LOG_RAW'] ?? env?.['DM_LOG_RAW']) === '1'
}

/** Kinds de las lineas de control: lo que no es ni historia ni evento. */
const CONTROL_KINDS = new Set(['addressed', 'scene', 'recap', 'where', 'suggest', 'milestone', 'whisper', 'close', 'ask_roll'])

type NormalizedRecord = { kind: 'block'; raw: unknown } | { kind: 'event'; raw: unknown } | { kind: 'line'; line: z.infer<typeof ModelLine> }

/**
 * Reduce a una sola forma todo lo que el modelo escribe para decir lo mismo.
 * El formato del prompt es plano (`{"kind":"narration","text":"..."}`,
 * `{"kind":"state_change","effects":[...]}`), que es el que el modelo usa
 * solo; las envolturas de antes (`{"kind":"block","block":{...}}`,
 * `{"kind":"event","event":{...}}`) y sus mezclas se siguen entendiendo.
 * Cada variante fue en su dia un turno roto en produccion (20-09, 25-09,
 * 03-10, 05-10): aqui viven todas juntas en vez de en parches sueltos.
 */
export function normalizeRecord(parsed: unknown): NormalizedRecord | null {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  const record = parsed as Record<string, unknown>
  // Con envoltura, sea cual sea el `kind` que le pusiera: {"kind":"narration","block":{...}}, {"kind":"roll","event":{...}}.
  if (record['block'] && typeof record['block'] === 'object') return { kind: 'block', raw: record['block'] }
  if (record['event'] && typeof record['event'] === 'object') return { kind: 'event', raw: record['event'] }
  const kind = typeof record['kind'] === 'string' ? record['kind'] : undefined
  if (kind !== undefined && CONTROL_KINDS.has(kind)) {
    const line = ModelLine.safeParse(record)
    return line.success ? { kind: 'line', line: line.data } : null
  }
  const tag = kind ?? (typeof record['type'] === 'string' ? record['type'] : undefined)
  if (tag === undefined || tag === 'block' || tag === 'event') return null
  const { kind: _kind, type: _type, ...rest } = record
  const flat = { type: tag, ...rest }
  return tag === 'narration' || tag === 'dialogue' ? { kind: 'block', raw: flat } : { kind: 'event', raw: flat }
}

/**
 * Un bloque de historia valido (narracion o dialogo) con solo sus campos: ni
 * `to` (lo privado sale por `whisper`) ni `declared` (lo pone el motor) ni lo
 * que el modelo añada por su cuenta. Un campo de mas (`"mood":"tenso"`) o un
 * dialogo sin `speakerRef` tumbaban el turno entero con "no devolvio ningun bloque".
 */
type StoryBlock = Extract<TurnBlock, { type: 'narration' | 'dialogue' }>

function storyBlock(raw: unknown): StoryBlock | null {
  if (!raw || typeof raw !== 'object') return null
  const record = raw as Record<string, unknown>
  const candidate =
    record['type'] === 'narration'
      ? { type: 'narration', text: record['text'] }
      : record['type'] === 'dialogue' && (typeof record['speaker'] !== 'string' || record['speaker'].trim() === '')
        ? // Un dialogo sin hablante (speaker null; boticaria, mesa 44) sigue siendo historia: se narra.
          { type: 'narration', text: record['text'] }
        : record['type'] === 'dialogue'
          ? { type: 'dialogue', speaker: record['speaker'], speakerRef: typeof record['speakerRef'] === 'string' ? record['speakerRef'] : null, text: record['text'] }
          : null
  if (!candidate) return null
  const block = TurnBlock.safeParse(candidate)
  return block.success && (block.data.type === 'narration' || block.data.type === 'dialogue') ? block.data : null
}

/** Prefijo de lista que algunos modelos ponen delante de cada linea (`- {...}`, `1. {...}`). */
function stripListPrefix(text: string): string {
  return /^(?:[-*•]|\d{1,2}[.)])\s+[{[]/.test(text) ? text.replace(/^(?:[-*•]|\d{1,2}[.)])\s+/, '') : text
}

/** Una anotacion del modelo al margen ("// fin del turno", "<- quien responde"): ni historia ni registro. */
function isAnnotation(text: string): boolean {
  return /^(?:\/\/|#|←|<-|->)/.test(text)
}

/** Si la linea empieza un registro (`{"kind":` o `{"type":`), se pueda leer entera o no. */
function startsRecord(text: string): boolean {
  return /^\{\s*"(?:kind|type)"\s*:/.test(stripListPrefix(text))
}

/**
 * Quita del final de un texto de historia lo que el modelo deja colgando: una
 * llave o un corchete tras el punto (cerro `}"` en vez de `"}`) y una comilla
 * angular de cierre que nunca se abrio. Vistos los dos con Sonnet el 05-10.
 */
export function tidyStory(text: string): string {
  let tidy = text.trim().replace(/([.!?…»”"'])\s*[}{]+$/, '$1')
  // Un corchete de cierre sobra solo si nadie lo abrio ("[El reloj marca las once.]" es prosa entera).
  if (/[.!?…»”"']\s*\]$/.test(tidy) && (tidy.match(/\[/g) ?? []).length < (tidy.match(/\]/g) ?? []).length) tidy = tidy.replace(/\s*\]+$/, '')
  const opened = (tidy.match(/«/g) ?? []).length
  const closed = (tidy.match(/»/g) ?? []).length
  if (closed > opened && tidy.endsWith('»')) tidy = tidy.slice(0, -1).trimEnd()
  return tidy
}

/** Con que se cierra cada comilla de apertura. */
const QUOTE_CLOSERS: Record<string, string> = { '«': '»', '“': '”', '"': '"', "'": "'", '‘': '’' }

/**
 * Una linea de prosa con forma de dialogo: `Nombre (npc:id): «texto»` o
 * `Nombre: «texto»`. Solo si de verdad es alguien hablando:
 * - la cita abre y cierra la linea con sus comillas, sin texto detras;
 * - quien habla es alguien conocido (`known` devuelve su referencia) o viene
 *   con su `(npc:id)`. "Nota: «...»", "Las once: «ya es tarde»" o
 *   "Resultado: «fracaso»" no son nadie, y son narracion.
 */
export function proseDialogue(text: string, known: (name: string) => string | null | undefined = () => undefined): StoryBlock | null {
  const match = /^([\p{Lu}][\p{L}\p{M}.' -]{0,48}?)\s*(?:\(((?:npc|character):[a-z0-9]+(?:-[a-z0-9]+)*)\))?\s*:\s*(\S.*)$/u.exec(text)
  if (!match) return null
  const speaker = match[1]!.trim()
  const quoted = match[3]!.trim()
  const closer = QUOTE_CLOSERS[quoted[0]!]
  if (!closer || quoted.length < 4 || !quoted.endsWith(closer)) return null
  const said = quoted.slice(1, -1).trim()
  // Otra comilla de cierre dentro: la cita termino antes y lo demas es narracion.
  if (said.length < 2 || said.includes(closer)) return null
  const ref = known(speaker)
  // Con `(npc:id)` vale aunque el nombre sea nuevo. Una referencia a un
  // personaje jugador solo vale si es SU nombre: no se le cuelga a otro.
  if (match[2]?.startsWith('npc:')) return { type: 'dialogue', speaker, speakerRef: match[2], text: said }
  if (ref === undefined) return null
  return { type: 'dialogue', speaker, speakerRef: ref, text: said }
}

/**
 * Una linea de prosa que el modelo escribio para si mismo y no para la mesa:
 * empieza con una etiqueta de nota ("Nota:", "GM:", "OOC:"), va entera entre
 * parentesis o corchetes, o habla de la mecanica (ids del motor, "el jugador").
 * Puede llevarse por delante una nota escrita dentro del mundo que empiece
 * igual; es raro, y lo descartado queda en el diagnostico del turno.
 */
export function isModelNote(text: string): boolean {
  const bare = text.trim().replace(/^(?:>\s*|[*_]+)/, '')
  // Etiqueta de nota pegada a los dos puntos, con mayuscula inicial (o toda en
  // mayusculas si es sigla): "Nota:", "Recordatorio:", "GM:", "TODO:". No
  // "Todo está en silencio:" ni "Nota el frío:", que son narracion.
  if (/^[([]?\s*(?:(?:Nota|Note|Recordatorio|Objetivo oculto|Pensamiento|Razonamiento|Thinking|Plan del GM|Siguiente turno|GM|DM|OOC|TODO)(?:\s*(?:\(?para m[ií]\)?|del GM|interna?))?|Narrador\s*\(para m[ií]\))\s*:/u.test(bare)) return true
  // Ids del motor fuera de un dialogo: "character:zahira", "ending:medico".
  return /\b(?:npc|ending|location|character|quest|fact):[a-z0-9]+(?:-[a-z0-9]+)*\b/i.test(bare)
}

/** Claves del formato de salida: una linea de prosa que empieza con una de ellas es un trozo de registro. */
const FORMAT_KEYS = 'kind|type|text|speaker|speakerRef|characterId|characterIds|location|options|effects|title|cliffhanger|payload|resolved|block|event'

/**
 * Restos de JSON en un texto que iba a narrarse: llaves pegadas a comillas o
 * una clave del formato con sus dos puntos. Una cita seguida de dos puntos
 * (`El letrero dice "Cerrado": "Vuelva mañana"`) es prosa y se queda.
 */
function looksLikeJson(text: string): boolean {
  return new RegExp(`\\{\\s*"|"\\s*\\}|"\\s*\\]\\s*[},]?$|"(?:${FORMAT_KEYS})"\\s*:`).test(text)
}

/** Si el texto de una linea era historia (narracion o dialogo) y no un evento duplicado. */
function isStoryText(text: string): boolean {
  return /"(?:kind|type)"\s*:\s*"(?:dialogue|narration)"/.test(text) && !/"kind"\s*:\s*"event"/.test(text) && !/"payload"\s*:/.test(text)
}

/** Cuantos registros empiezan dentro de un texto. */
function recordsIn(text: string): number {
  return (text.match(/\{\s*"(?:kind|type)"\s*:/g) ?? []).length
}

/**
 * Una linea partida en lo que trae, en orden: los objetos JSON de primer
 * nivel que caben enteros y la prosa que va entre ellos o detras, mas lo que
 * quedo sin cerrar al final (o null). `{...} prosa {...} {..."` da dos
 * objetos, una prosa y un resto: el resto es problema suyo y no de lo anterior.
 */
export function splitRecords(text: string): { segments: Array<{ json?: string; text: string }>; rest: string | null } {
  const segments: Array<{ json?: string; text: string }> = []
  const prose = (chunk: string): void => {
    const clean = chunk.replace(/^[\s,.;\]})]+/, '').trim()
    if (clean.length > 3) segments.push({ text: clean })
  }
  let depth = 0
  let inString = false
  let escaped = false
  let start = -1
  let from = 0
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') inString = true
    else if (ch === '{' || ch === '[') {
      if (depth === 0) {
        prose(text.slice(from, i))
        start = i
      }
      depth++
    } else if (ch === '}' || ch === ']') {
      depth--
      if (depth === 0 && start !== -1) {
        segments.push({ json: text.slice(start, i + 1), text: text.slice(start, i + 1) })
        start = -1
        from = i + 1
      }
    }
  }
  if (start === -1) prose(text.slice(from))
  const rest = start !== -1 ? text.slice(start).trim() : null
  return { segments, rest: rest === '' ? null : rest }
}

/** Si algun texto de lo reparado trae restos de otro registro: entonces la reparacion pego dos cosas y no vale. */
function hasJsonResidue(value: unknown): boolean {
  if (typeof value === 'string') return /"(?:kind|type)"\s*:|\{\s*"(?:kind|type|text)"/.test(value)
  if (Array.isArray(value)) return value.some(hasJsonResidue)
  if (value && typeof value === 'object') return Object.values(value).some(hasJsonResidue)
  return false
}

/** Cuantos bloques de historia empiezan dentro de un texto (para contar lo que se pierde cuando vienen pegados). */
function storyRecordsIn(text: string): number {
  return (text.match(/\{\s*"(?:kind|type)"\s*:\s*"(?:narration|dialogue)"/g) ?? []).length
}

/**
 * Cierra lo que una linea dejo abierto (una cadena, llaves, corchetes) y la
 * lee. undefined si no habia nada que cerrar o ni asi es JSON. El modelo se
 * come un cierre de vez en cuando; lo que escribio antes suele estar bien.
 */
export function repairJson(text: string): unknown {
  const closers: string[] = []
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
    else if (ch === '{') closers.push('}')
    else if (ch === '[') closers.push(']')
    else if (ch === '}' || ch === ']') closers.pop()
  }
  if (!inString && closers.length === 0) return undefined
  const closed = `${inString ? text : text.replace(/[,\s]+$/, '')}${inString ? '"' : ''}${closers.reverse().join('')}`
  try {
    return JSON.parse(closed)
  } catch {
    return undefined
  }
}

/**
 * Rescata el texto de un bloque de historia cuyo JSON no se puede leer
 * (comillas sin escapar dentro del texto, cierre perdido). Solo narracion y
 * dialogo, y solo si queda texto de verdad. null si no es historia.
 */
export function salvageStory(text: string): StoryBlock | null {
  // El tipo es el del PROPIO registro, no uno que aparezca mas adelante: con
  // lineas pegadas, un susurro roto seguido de una narracion salia publico.
  const head = /^\s*\{\s*"(?:kind|type)"\s*:\s*"(narration|dialogue)"/.exec(text) ?? /^\s*\{\s*"kind"\s*:\s*"block"\s*,\s*"block"\s*:\s*\{\s*"type"\s*:\s*"(narration|dialogue)"/.exec(text)
  if (!head) return null
  // Nada privado ni de la capa de eventos se rescata como historia publica.
  if (/"(?:to|visibility|payload|characterId)"\s*:/.test(text)) return null
  const dialogue = head[1] === 'dialogue'
  const field = /"text"\s*:\s*"/.exec(text)
  if (!field) return null
  let body = text.slice(field.index + field[0].length)
  // El texto termina donde empieza otro campo o donde se cierra o se abre una
  // llave tras una comilla; si no hay nada de eso, donde acaba la linea.
  const end = /"\s*,\s*"[A-Za-z_]+"\s*:|"\s*[}\]{]/.exec(body)
  body = end ? body.slice(0, end.index) : body.replace(/"?[\s}\],]*$/, '')
  const story = body.replace(/\\n/g, ' ').replace(/\\"/g, '"').replace(/\\\\/g, '\\').replace(/\s+/g, ' ').trim()
  // Solo restos de estructura: una cita con dos puntos dentro del parrafo es prosa.
  if (story.length < 3 || /\{\s*"|"\s*\}|"(?:kind|type)"\s*:/.test(story)) return null
  if (!dialogue) return { type: 'narration', text: story }
  const speaker = /"speaker"\s*:\s*"([^"]{1,80})"/.exec(text)?.[1]
  if (!speaker) return { type: 'narration', text: story }
  const ref = /"speakerRef"\s*:\s*"([^"]{1,80})"/.exec(text)?.[1]
  return { type: 'dialogue', speaker, speakerRef: ref ?? null, text: story }
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

/** Corta en la ultima palabra entera que cabe y marca el corte. */
function clipWords(text: string, max: number): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max - 1)
  const space = cut.lastIndexOf(' ')
  return `${(space > max / 2 ? cut.slice(0, space) : cut).replace(/[\s,;:.]+$/, '')}…`
}
