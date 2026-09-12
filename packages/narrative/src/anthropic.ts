import Anthropic from '@anthropic-ai/sdk'
import type { DMProbe } from './provider.js'
import { ModelDMProvider, type ModelDMOptions, type ModelPrompt, type ModelReply, type ModelTransport } from './model-dm.js'

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

export interface AnthropicProviderOptions extends ModelDMOptions {
  model: string
  credential: string
  client?: AnthropicClientLike
  fetch?: typeof fetch
  /** Esfuerzo del pensamiento adaptativo; `low` para turnos rapidos. */
  effort?: 'low' | 'medium' | 'high'
  timeoutMs?: number
}

/**
 * Messages API con streaming. El prompt de sistema es estable y se marca
 * como prefijo cacheable; lo que cambia por turno va en el mensaje de
 * usuario.
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
        maxRetries: 2,
        timeout: options.timeoutMs ?? 120_000,
      })
  }

  async *stream(prompt: ModelPrompt): AsyncGenerator<string, ModelReply, undefined> {
    const events = await this.client.messages.create({
      model: this.model,
      max_tokens: prompt.maxOutputTokens,
      stream: true,
      system: [{ type: 'text', text: prompt.system, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: prompt.user }],
      output_config: { effort: this.effort },
    })

    let finish: ModelReply['finish'] = 'other'
    let inputTokens = 0
    let outputTokens = 0

    for await (const event of events) {
      switch (event.type) {
        case 'message_start':
          inputTokens = event.message.usage.input_tokens ?? 0
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

    return { finish, inputTokens, outputTokens }
  }

  async probe(): Promise<DMProbe> {
    const info = await this.client.models.retrieve(this.model)
    return { ok: true, model: info.id, message: `Anthropic: ${info.display_name} disponible` }
  }
}

export function createAnthropicProvider(options: AnthropicProviderOptions): ModelDMProvider {
  return new ModelDMProvider(new AnthropicTransport(options), options.credential, options)
}
