import { CharacterRef, DiceSpec, EntityRef, KebabId, refId } from '@rpg-ngn/content'
import { TurnBlock, type LintMode } from '@rpg-ngn/engine-contract'
import { z } from 'zod'
import { budgetFor, buildTurnContext, type ContextBudget, type ContextProfile } from './context.js'
import { buildKnowledgeView, lintText, markRevealed, type KnowledgeView } from './lint.js'
import { DM_SYSTEM_PROMPT, DM_SYSTEM_PROMPT_COMPACT } from './prompt.js'
import type { DMOutput, DMProbe, DMProvider, DMTurnContext, ProposedEvent } from './provider.js'
import { DMProviderError, errorMessage, redact } from './redact.js'

/** Lo que ve la mesa cuando el lint corta un bloque. No dice cual era el secreto. */
export const LINT_SYSTEM_TEXT = 'El DM revisó su narración: contaba algo que la mesa todavía no ha descubierto.'

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
}

const DEFAULT_MAX_OUTPUT_TOKENS = 4000
/** Un objeto JSON partido en varias lineas se acumula hasta aqui antes de darlo por perdido. */
const MAX_PENDING_CHARS = 8000

// Formas de evento que el prompt ofrece. Son mas estrictas que el schema de
// content a proposito: solo lo que el ruleset del piloto sabe aplicar.
const HpEffect = z.strictObject({ op: z.literal('hp'), who: CharacterRef, delta: z.number().int().refine((d) => d !== 0, 'delta 0 no cambia nada') })
const ConditionEffect = z
  .strictObject({ op: z.literal('condition'), who: CharacterRef, add: z.string().min(1).optional(), remove: z.string().min(1).optional() })
  .refine((e) => Boolean(e.add || e.remove), 'condition requiere add o remove')
const MemoryEffect = z.strictObject({ op: z.literal('memory_recovered'), who: CharacterRef })
const GainEffect = z.strictObject({ op: z.literal('gain'), item: KebabId, holder: EntityRef.optional(), note: z.string().optional(), source: z.string().optional() })
const LoseEffect = z.strictObject({ op: z.literal('lose'), item: KebabId, holder: EntityRef.optional() })

const AllowedEvent = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('roll'),
    actor: CharacterRef,
    resolved: z.strictObject({
      kind: z.enum(['fortune', 'skill', 'social', 'attack', 'save', 'rest', 'other']),
      die: DiceSpec,
      result: z.number().int(),
      source: z.literal('physical'),
      skill: z.string().optional(),
      target: EntityRef.optional(),
      modifier: z.number().int().optional(),
    }),
  }),
  z.strictObject({
    type: z.literal('state_change'),
    actor: CharacterRef.optional(),
    effects: z.array(z.union([HpEffect, ConditionEffect, MemoryEffect])).min(1),
  }),
  z.strictObject({
    type: z.literal('inventory_change'),
    actor: CharacterRef.optional(),
    effects: z.array(z.union([GainEffect, LoseEffect])).min(1),
  }),
  z.strictObject({
    type: z.literal('world_event'),
    payload: z.strictObject({ note: z.string().min(1) }),
  }),
  z.strictObject({
    type: z.literal('secret_revealed'),
    payload: z.strictObject({ secretId: KebabId, how: z.string().optional() }),
  }),
])

const ModelLine = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('block'), block: z.unknown() }),
  z.object({ kind: z.literal('event'), event: z.unknown() }),
  z.object({ kind: z.literal('addressed'), characterIds: z.array(z.string()) }),
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
    const built = buildTurnContext(ctx, this.options.budget ?? budgetFor(this.options.contextProfile))
    const party = built.party
    const witnesses = party.map((id) => `character:${id}`)

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
      system: compact ? DM_SYSTEM_PROMPT_COMPACT : DM_SYSTEM_PROMPT,
      user: built.user,
      maxOutputTokens: ctx.maxOutputTokens ?? this.options.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
    }

    const interpreter = new LineInterpreter(ctx, party, ctx.lint ?? 'enforce')
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
    } catch (error) {
      throw new DMProviderError(`el modelo ${this.transport.kind}/${this.transport.model} falló: ${errorMessage(error)}`, this.credential)
    }

    if (reply.finish === 'refusal') {
      throw new DMProviderError(`el modelo ${this.transport.kind}/${this.transport.model} rechazó narrar el turno`, this.credential)
    }
    if (interpreter.blocks === 0) {
      throw new DMProviderError(`el modelo ${this.transport.kind}/${this.transport.model} no devolvió ningún bloque (${redact(raw.slice(0, 200), this.credential) || 'salida vacía'})`, this.credential)
    }

    if (reply.finish === 'length') {
      yield { kind: 'block', block: { type: 'system', text: 'La narración se cortó por el presupuesto de salida del DM.' } }
    }
    if (interpreter.ignored > 0) {
      yield { kind: 'block', block: { type: 'system', text: `El DM propuso ${interpreter.ignored} ${interpreter.ignored === 1 ? 'línea que no se pudo aplicar y se ignoró' : 'líneas que no se pudieron aplicar y se ignoraron'}.` } }
    }

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
  blocks = 0
  ignored = 0
  addressed: string[] | null = null
  private pending: { text: string; depth: number } | null = null
  private readonly knowledge: KnowledgeView | null

  constructor(
    private readonly ctx: DMTurnContext,
    private readonly party: string[],
    private readonly lintMode: LintMode,
  ) {
    this.knowledge = lintMode === 'off' ? null : buildKnowledgeView(ctx, party)
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
    if (text === '' || text.startsWith('```')) return

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
        this.ignored++
        return
      }
      if (scanned.depth > 0) {
        this.pending = { text, depth: scanned.depth }
        return
      }
      const parsed = parseLoose(text)
      if (parsed !== undefined) yield* this.items(parsed)
      else this.ignored++
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
    else this.ignored++
  }

  private dropPending(): void {
    this.pending = null
    this.ignored++
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
      this.ignored++
      return
    }

    switch (line.data.kind) {
      case 'block': {
        const block = TurnBlock.safeParse(line.data.block)
        if (!block.success) {
          this.ignored++
          return
        }
        yield* this.block(block.data)
        return
      }
      case 'event': {
        const event = this.event(line.data.event)
        if (!event) {
          this.ignored++
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
    }
  }

  private *block(block: TurnBlock): Generator<DMOutput> {
    const witnesses = this.party.map((id) => `character:${id}`)
    this.blocks++
    if (block.type === 'narration' || block.type === 'dialogue') {
      const cut = yield* this.lint(block.text)
      if (cut) {
        // El bloque no llega a la mesa ni a la cronica; queda el aviso y el motivo va en result.lint.
        yield { kind: 'block', block: { type: 'system', text: LINT_SYSTEM_TEXT } }
        return
      }
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
    if (event['type'] === 'world_event') {
      const note = (event['payload'] as { note: string }).note
      const cut = yield* this.lint(note)
      if (cut) return
    }
    if (event['type'] === 'secret_revealed' && this.knowledge) {
      markRevealed(this.knowledge, (event['payload'] as { secretId: string }).secretId)
    }
    yield { kind: 'event', event }
  }

  /** Valida forma y sentido del evento contra el estado; null si no se puede aplicar. */
  private event(raw: unknown): ProposedEvent | null {
    const parsed = AllowedEvent.safeParse(raw)
    if (!parsed.success) return null
    const event = parsed.data
    const characters = this.ctx.state.world.characters
    const witnesses = this.party.map((id) => `character:${id}`)
    // Solo cambian los personajes presentes en la sesion; los ausentes no estan en escena (regla 8 de docs/06).
    const present = (ref: string): boolean => this.party.includes(refId(ref)) && Boolean(characters[refId(ref)])

    switch (event.type) {
      case 'roll': {
        // Solo tiradas que un jugador escribio este turno: el DM no inventa numeros (regla 1).
        const actorId = refId(event.actor)
        if (!present(event.actor)) return null
        const response = this.ctx.turn.responses.find((r) => r.characterId === actorId)
        if (!response || !new RegExp(`(?<![\\d])${event.resolved.result}(?![\\d])`).test(response.text)) return null
        return { ...event, visibility: { layer: 'campaign', witnesses } }
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
      case 'secret_revealed':
        // Solo secretos del pack y solo a la party presente; el reductor lo proyecta en knowledge.
        if (!this.ctx.pack.secrets.has(event.payload.secretId) || witnesses.length === 0) return null
        return { ...event, visibility: { layer: 'campaign', witnesses } }
    }
  }
}
