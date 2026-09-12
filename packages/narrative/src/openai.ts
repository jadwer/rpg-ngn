import OpenAI from 'openai'
import type { DMProbe } from './provider.js'
import { ModelDMProvider, type ModelDMOptions, type ModelPrompt, type ModelReply, type ModelTransport } from './model-dm.js'

/**
 * Lo minimo que el transporte usa del SDK `openai`. Un cliente real lo
 * cumple; los tests inyectan uno falso que devuelve chunks grabados.
 */
export interface OpenAIClientLike {
  chat: {
    completions: {
      create(params: OpenAI.ChatCompletionCreateParamsStreaming): Promise<AsyncIterable<OpenAI.ChatCompletionChunk>>
    }
  }
  models: {
    list(): AsyncIterable<{ id: string }>
  }
}

export interface OpenAIProviderOptions extends ModelDMOptions {
  model: string
  credential: string
  /** Otro proveedor compatible (DeepSeek: https://api.deepseek.com). Sin esto, api.openai.com. */
  baseUrl?: string | undefined
  client?: OpenAIClientLike
  fetch?: typeof fetch
  /** Esfuerzo de razonamiento; solo se manda a modelos que lo aceptan (gpt-5*, o*). */
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high'
  timeoutMs?: number
}

/**
 * Chat Completions con streaming: es lo que OpenAI y los compatibles
 * (DeepSeek) garantizan. El NDJSON se pide en el prompt, no con
 * `response_format`, porque no todos los proveedores lo soportan igual.
 */
export class OpenAITransport implements ModelTransport {
  readonly kind = 'openai'
  readonly model: string
  private readonly client: OpenAIClientLike
  private readonly reasoningEffort: NonNullable<OpenAIProviderOptions['reasoningEffort']>
  private readonly compatible: boolean

  constructor(options: OpenAIProviderOptions) {
    this.model = options.model
    this.compatible = options.baseUrl !== undefined
    this.reasoningEffort = options.reasoningEffort ?? 'low'
    this.client =
      options.client ??
      new OpenAI({
        apiKey: options.credential,
        ...(options.baseUrl ? { baseURL: options.baseUrl } : {}),
        ...(options.fetch ? { fetch: options.fetch } : {}),
        maxRetries: 2,
        timeout: options.timeoutMs ?? 120_000,
      })
  }

  async *stream(prompt: ModelPrompt): AsyncGenerator<string, ModelReply, undefined> {
    const params: OpenAI.ChatCompletionCreateParamsStreaming = {
      model: this.model,
      stream: true,
      stream_options: { include_usage: true },
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
      // OpenAI retiro max_tokens en los modelos con razonamiento; los compatibles solo conocen max_tokens.
      ...(this.compatible ? { max_tokens: prompt.maxOutputTokens } : { max_completion_tokens: prompt.maxOutputTokens }),
      ...(acceptsReasoningEffort(this.model) ? { reasoning_effort: this.reasoningEffort } : {}),
    }

    const chunks = await this.client.chat.completions.create(params)
    let finish: ModelReply['finish'] = 'other'
    let inputTokens = 0
    let outputTokens = 0

    for await (const chunk of chunks) {
      const choice = chunk.choices[0]
      const text = choice?.delta?.content
      if (typeof text === 'string' && text !== '') yield text
      if (choice?.finish_reason) {
        finish = choice.finish_reason === 'stop' ? 'stop' : choice.finish_reason === 'length' ? 'length' : choice.finish_reason === 'content_filter' ? 'refusal' : 'other'
      }
      if (chunk.usage) {
        inputTokens = chunk.usage.prompt_tokens ?? 0
        outputTokens = chunk.usage.completion_tokens ?? 0
      }
    }

    return { finish, inputTokens, outputTokens }
  }

  async probe(): Promise<DMProbe> {
    const ids: string[] = []
    for await (const model of this.client.models.list()) {
      ids.push(model.id)
      if (ids.length >= 500) break
    }
    if (ids.includes(this.model) || ids.includes(`${this.model}:latest`)) {
      return { ok: true, model: this.model, message: `${this.compatible ? 'compatible con OpenAI' : 'OpenAI'}: el modelo está disponible (${ids.length} modelos listados)` }
    }
    const hint = this.compatible ? ` Si es Ollama, descárgalo con: ollama pull ${this.model}.` : ''
    return { ok: false, model: this.model, message: `el proveedor no lista el modelo ${this.model}.${hint} Disponibles: ${ids.slice(0, 20).join(', ') || '(ninguno)'}${ids.length > 20 ? '…' : ''}` }
  }
}

function acceptsReasoningEffort(model: string): boolean {
  return /^(gpt-5|o[1-9])/.test(model)
}

export function createOpenAIProvider(options: OpenAIProviderOptions): ModelDMProvider {
  return new ModelDMProvider(new OpenAITransport(options), options.credential, options)
}
