import Anthropic from '@anthropic-ai/sdk'
import type { GMProbe } from './provider.js'
import { ModelGMProvider, type ModelGMOptions, type ModelPrompt, type ModelReply, type ModelTransport } from './model-gm.js'

/**
 * Lo minimo que el transporte usa del SDK `@anthropic-ai/sdk`. Un cliente
 * real lo cumple; los tests inyectan uno falso con eventos grabados.
 */
export interface AnthropicClientLike {
  messages: {
    create(params: Anthropic.MessageCreateParamsStreaming): Promise<AsyncIterable<Anthropic.RawMessageStreamEvent>>
  }
  models: {
    retrieve(id: string): Promise<{ id: string; display_name: string }>
  }
}

export interface AnthropicProviderOptions extends ModelGMOptions {
  model: string
  credential: string
  client?: AnthropicClientLike
  fetch?: typeof fetch
  /** Esfuerzo del pensamiento adaptativo; `low` para turnos rapidos. */
  effort?: 'low' | 'medium' | 'high'
  timeoutMs?: number
  /** Reintentos del SDK; las ideas van con cero para no retener el turno. */
  maxRetries?: number
}

/**
 * Messages API con streaming. El prompt de sistema es estable y se marca
 * como prefijo cacheable con una hora de vida: son unos 4,000 tokens por
 * turno (la mitad de la entrada) y con los cinco minutos por omision el
 * cache expiraba entre turno y turno (los jugadores tardan de 4 a 6 min).
 * Lo que cambia por turno va en el mensaje de usuario.
 */
export class AnthropicTransport implements ModelTransport {
  readonly kind = 'anthropic'
  readonly model: string
  private readonly client: AnthropicClientLike
  private readonly effort: NonNullable<AnthropicProviderOptions['effort']>

  constructor(options: AnthropicProviderOptions) {
    this.model = options.model
    this.effort = options.effort ?? 'medium'
    this.client =
      options.client ??
      new Anthropic({
        apiKey: options.credential,
        ...(options.fetch ? { fetch: options.fetch } : {}),
        maxRetries: options.maxRetries ?? 2,
        timeout: options.timeoutMs ?? 120_000,
      })
  }

  async *stream(prompt: ModelPrompt): AsyncGenerator<string, ModelReply, undefined> {
    const events = await this.client.messages.create({
      model: this.model,
      max_tokens: prompt.maxOutputTokens,
      stream: true,
      system: [{ type: 'text', text: prompt.system, cache_control: { type: 'ephemeral', ttl: '1h' } }],
      messages: [{ role: 'user', content: prompt.user }],
      ...(acceptsEffort(this.model) ? { output_config: { effort: this.effort } } : {}),
    })

    let finish: ModelReply['finish'] = 'other'
    let inputTokens = 0
    let outputTokens = 0
    let cacheReadTokens = 0
    let cacheWriteTokens = 0

    for await (const event of events) {
      switch (event.type) {
        case 'message_start':
          inputTokens = event.message.usage.input_tokens ?? 0
          cacheReadTokens = event.message.usage.cache_read_input_tokens ?? 0
          cacheWriteTokens = event.message.usage.cache_creation_input_tokens ?? 0
          break
        case 'content_block_delta':
          if (event.delta.type === 'text_delta' && event.delta.text !== '') yield event.delta.text
          break
        case 'message_delta':
          outputTokens = event.usage.output_tokens ?? outputTokens
          if (event.delta.stop_reason) {
            finish = event.delta.stop_reason === 'end_turn' ? 'stop' : event.delta.stop_reason === 'max_tokens' ? 'length' : event.delta.stop_reason === 'refusal' ? 'refusal' : 'other'
          }
          break
        default:
          break
      }
    }

    return { finish, inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens }
  }

  async probe(): Promise<GMProbe> {
    const info = await this.client.models.retrieve(this.model)
    return { ok: true, model: info.id, message: `Anthropic: ${info.display_name} disponible` }
  }
}

/**
 * Si el modelo acepta `output_config.effort` (pensamiento adaptativo). Los
 * Haiku no lo soportan y responden 400, y el cupo gratuito narra justo con
 * Haiku: mandarlo a ciegas rompia el turno.
 */
function acceptsEffort(model: string): boolean {
  return !/haiku/i.test(model)
}

/** El modelo de las ideas de accion: una llamada corta por personaje y turno, que no necesita al narrador. */
export const ANTHROPIC_IDEAS_MODEL = 'claude-haiku-4-5-20251001'
const IDEAS_CALL_TIMEOUT_MS = 15_000

export function createAnthropicProvider(options: AnthropicProviderOptions): ModelGMProvider {
  const transport = new AnthropicTransport(options)
  // Las ideas salen de una llamada aparte que solo ve lo que el jugador sabe (docs/27, bloque I).
  // Con tiempo corto y sin reintentos: unas ideas que tardan no valen la espera de la mesa.
  const ideasTransport = options.ideasTransport ?? new AnthropicTransport({ ...options, model: /haiku/i.test(options.model) ? options.model : ANTHROPIC_IDEAS_MODEL, timeoutMs: Math.min(options.timeoutMs ?? IDEAS_CALL_TIMEOUT_MS, IDEAS_CALL_TIMEOUT_MS), maxRetries: 0 })
  return new ModelGMProvider(transport, options.credential, { ...options, ideasTransport })
}
