import type OpenAI from 'openai'
import { describe, expect, it } from 'vitest'
import { createProvider } from './factory.js'
import { createOpenAIProvider, OpenAITransport, type OpenAIClientLike } from './openai.js'
import { collect, contextFor, openSession003, response, turn } from './pilot.test-helpers.js'

const KEY = 'sk-deepseek-SECRETA-0123456789abcdef'

/** Respuesta grabada al estilo DeepSeek: charla antes del JSON y fences. */
const recorded = [
  'Claro, aquí tienes el turno:\n',
  '```json\n',
  '{"kind":"block","block":{"type":"narration","text":"La mina respira. ',
  'Un goteo marca el tiempo en algún lugar a vuestra izquierda."}}\n',
  '{"kind":"block","block":{"type":"dialogue","speaker":"Tomás","speakerRef":"npc:tomas","text":"No bajéis sin luz."}}\n',
  '{"kind":"event","event":{"type":"world_event","payload":{"note":"Tomás enciende un farol y se lo tiende a Zahira"}}}\n',
  '{"kind":"addressed","characterIds":["zahira"]}\n',
  '```',
]

function chunk(content: string | null, finish: 'stop' | 'length' | null = null, usage?: { prompt_tokens: number; completion_tokens: number }): OpenAI.ChatCompletionChunk {
  return {
    id: 'chatcmpl-1',
    object: 'chat.completion.chunk',
    created: 1,
    model: 'deepseek-chat',
    choices: content === null && finish === null ? [] : [{ index: 0, delta: content === null ? {} : { content }, finish_reason: finish, logprobs: null }],
    ...(usage ? { usage: { prompt_tokens: usage.prompt_tokens, completion_tokens: usage.completion_tokens, total_tokens: usage.prompt_tokens + usage.completion_tokens } } : {}),
  }
}

function fakeClient(parts: string[], options: { models?: string[]; fail?: Error; finish?: 'stop' | 'length' } = {}) {
  const calls: OpenAI.ChatCompletionCreateParamsStreaming[] = []
  const client: OpenAIClientLike = {
    chat: {
      completions: {
        async create(params) {
          calls.push(params)
          if (options.fail) throw options.fail
          async function* stream() {
            for (const part of parts) yield chunk(part)
            yield chunk(null, options.finish ?? 'stop')
            yield chunk(null, null, { prompt_tokens: 2100, completion_tokens: 240 })
          }
          return stream()
        },
      },
    },
    models: {
      async *list() {
        if (options.fail) throw options.fail
        for (const id of options.models ?? ['deepseek-chat', 'deepseek-reasoner']) yield { id }
      },
    },
  }
  return { client, calls }
}

describe('OpenAITransport (OpenAI y compatibles como DeepSeek)', () => {
  it('narra un turno desde chunks grabados con basura y fences, y reporta el uso', async () => {
    const base = await openSession003()
    const { client, calls } = fakeClient(recorded)
    const provider = createOpenAIProvider({ model: 'deepseek-chat', credential: KEY, baseUrl: 'https://api.deepseek.com', client })

    const outputs = await collect(provider.narrate(contextFor(base, turn(1, [response('zahira', 'Bajo.')]))))

    const blocks = outputs.filter((o) => o.kind === 'block').map((o) => (o.kind === 'block' ? o.block : null))
    expect(blocks.map((b) => b?.type)).toEqual(['dialogue', 'narration', 'dialogue'])
    expect(blocks[1]).toMatchObject({ text: 'La mina respira. Un goteo marca el tiempo en algún lugar a vuestra izquierda.' })
    expect(outputs.filter((o) => o.kind === 'event').map((o) => (o.kind === 'event' ? o.event['type'] : ''))).toEqual(['player_action', 'narration', 'narration', 'world_event'])
    expect(outputs.find((o) => o.kind === 'addressed')).toEqual({ kind: 'addressed', characterIds: ['zahira'] })
    expect(outputs.at(-1)).toEqual({ kind: 'usage', inputTokens: 2100, outputTokens: 240 })

    // Chat Completions con streaming y uso; a un compatible se le manda max_tokens y nada de reasoning_effort.
    const params = calls[0]!
    expect(params.stream).toBe(true)
    expect(params.stream_options).toEqual({ include_usage: true })
    expect(params.max_tokens).toBe(4000)
    expect(params).not.toHaveProperty('max_completion_tokens')
    expect(params).not.toHaveProperty('reasoning_effort')
    expect(params.messages[0]).toMatchObject({ role: 'system' })
    expect(params.messages[1]).toMatchObject({ role: 'user' })
    expect(String(params.messages[1]?.content)).toContain('# Turno 1')
  })

  it('a OpenAI le manda max_completion_tokens y reasoning_effort solo en modelos que lo aceptan', async () => {
    const base = await openSession003()
    const gpt5 = fakeClient(['{"kind":"block","block":{"type":"narration","text":"Ok."}}'])
    await collect(createOpenAIProvider({ model: 'gpt-5', credential: KEY, client: gpt5.client }).narrate(contextFor(base, turn(1, []), { maxOutputTokens: 1500 })))
    expect(gpt5.calls[0]).toMatchObject({ max_completion_tokens: 1500, reasoning_effort: 'low' })
    expect(gpt5.calls[0]).not.toHaveProperty('max_tokens')

    const gpt41 = fakeClient(['{"kind":"block","block":{"type":"narration","text":"Ok."}}'])
    await collect(createOpenAIProvider({ model: 'gpt-4.1', credential: KEY, client: gpt41.client }).narrate(contextFor(base, turn(1, []))))
    expect(gpt41.calls[0]).not.toHaveProperty('reasoning_effort')
  })

  it('probe consulta /models y no expone la clave si el proveedor falla', async () => {
    const ok = new OpenAITransport({ model: 'deepseek-chat', credential: KEY, baseUrl: 'https://api.deepseek.com', client: fakeClient([]).client })
    expect(await ok.probe()).toMatchObject({ ok: true, model: 'deepseek-chat' })

    const missing = createOpenAIProvider({ model: 'gpt-9', credential: KEY, client: fakeClient([], { models: ['gpt-5'] }).client })
    expect(await missing.probe()).toMatchObject({ ok: false, model: 'gpt-9', message: expect.stringContaining('no lista el modelo gpt-9') })

    const broken = createOpenAIProvider({ model: 'deepseek-chat', credential: KEY, client: fakeClient([], { fail: new Error(`401 Incorrect API key provided: ${KEY}`) }).client })
    const probe = await broken.probe()
    expect(probe.ok).toBe(false)
    expect(probe.message).not.toContain('SECRETA')
    expect(probe.message).toContain('[credencial redactada]')
  })

  it('un error del SDK durante el turno sale redactado', async () => {
    const base = await openSession003()
    const { client } = fakeClient([], { fail: new Error(`429 rate limited (Authorization: Bearer ${KEY})`) })
    const provider = createProvider({ kind: 'openai', model: 'deepseek-chat', credential: KEY, baseUrl: 'https://api.deepseek.com' }, { openaiClient: client })
    let message = ''
    try {
      await collect(provider.narrate(contextFor(base, turn(1, []))))
    } catch (error) {
      message = (error as Error).message
    }
    expect(message).toMatch(/openai\/deepseek-chat falló: 429/)
    expect(message).not.toContain('SECRETA')
  })

  it('la salida cortada por longitud avisa a la mesa', async () => {
    const base = await openSession003()
    const { client } = fakeClient(['{"kind":"block","block":{"type":"narration","text":"Empieza a llover y"}}\n{"kind":"block","block":{"type":"narr'], { finish: 'length' })
    const outputs = await collect(createOpenAIProvider({ model: 'deepseek-chat', credential: KEY, client }).narrate(contextFor(base, turn(1, []))))
    const texts = outputs.filter((o) => o.kind === 'block').map((o) => (o.kind === 'block' && o.block.type !== 'roll' ? o.block.text : ''))
    expect(texts[0]).toBe('Empieza a llover y')
    expect(texts.some((t) => t.includes('se cortó por el presupuesto'))).toBe(true)
  })
})
