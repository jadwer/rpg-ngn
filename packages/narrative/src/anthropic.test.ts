import type Anthropic from '@anthropic-ai/sdk'
import { describe, expect, it } from 'vitest'
import { AnthropicTransport, createAnthropicProvider, type AnthropicClientLike } from './anthropic.js'
import { collect, contextFor, openSession003, response, turn } from './pilot.test-helpers.js'

const KEY = 'sk-ant-api03-SECRETA-abcdefghijklmnop'

function events(text: string[], stop: Anthropic.StopReason = 'end_turn'): Anthropic.RawMessageStreamEvent[] {
  // Fixtures minimos: solo los campos que el transporte lee. El cast evita perseguir cada campo nuevo del SDK.
  const usage = { input_tokens: 1800, output_tokens: 1 } as unknown as Anthropic.Usage
  const message = { id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-sonnet-5', content: [], stop_reason: null, stop_sequence: null, usage } as unknown as Anthropic.Message
  return [
    { type: 'message_start', message },
    { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '', citations: null } },
    ...text.map((t): Anthropic.RawMessageStreamEvent => ({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: t } })),
    { type: 'content_block_stop', index: 0 },
    { type: 'message_delta', delta: { stop_reason: stop, stop_sequence: null }, usage: { input_tokens: null, output_tokens: 310 } } as unknown as Anthropic.RawMessageStreamEvent,
    { type: 'message_stop' },
  ]
}

function fakeClient(parts: string[], options: { fail?: Error; stop?: Anthropic.StopReason } = {}) {
  const calls: Anthropic.MessageCreateParamsStreaming[] = []
  const client: AnthropicClientLike = {
    messages: {
      async create(params) {
        calls.push(params)
        if (options.fail) throw options.fail
        async function* stream() {
          yield* events(parts, options.stop)
        }
        return stream()
      },
    },
    models: {
      async retrieve(id) {
        if (options.fail) throw options.fail
        return { id, display_name: 'Claude Sonnet 5' }
      },
    },
  }
  return { client, calls }
}

describe('AnthropicTransport', () => {
  it('narra desde eventos grabados del stream y marca el prompt de sistema como cacheable', async () => {
    const base = await openSession003()
    const { client, calls } = fakeClient([
      '{"kind":"block","block":{"type":"narration","text":"El farol ',
      'parpadea."}}\n{"kind":"addressed","characterIds":["calder"]}\n',
    ])
    const provider = createAnthropicProvider({ model: 'claude-sonnet-5', credential: KEY, client })

    const outputs = await collect(provider.narrate(contextFor(base, turn(2, [response('calder', 'Enciendo el farol.')]))))
    const blocks = outputs.filter((o) => o.kind === 'block').map((o) => (o.kind === 'block' ? o.block : null))
    expect(blocks.map((b) => b?.type)).toEqual(['dialogue', 'narration'])
    expect(blocks[1]).toMatchObject({ text: 'El farol parpadea.' })
    expect(outputs.find((o) => o.kind === 'addressed')).toEqual({ kind: 'addressed', characterIds: ['calder'] })
    expect(outputs.at(-1)).toEqual({ kind: 'usage', inputTokens: 1800, outputTokens: 310 })

    const params = calls[0]!
    expect(params.stream).toBe(true)
    expect(params.max_tokens).toBe(4000)
    expect(params.system).toEqual([expect.objectContaining({ type: 'text', cache_control: { type: 'ephemeral' } })])
    expect(params.output_config).toEqual({ effort: 'medium' })
    expect(params.messages).toHaveLength(1)
  })

  it('max_tokens agotado avisa; refusal falla el turno', async () => {
    const base = await openSession003()
    const cut = fakeClient(['{"kind":"block","block":{"type":"narration","text":"Corto."}}'], { stop: 'max_tokens' })
    const outputs = await collect(createAnthropicProvider({ model: 'claude-sonnet-5', credential: KEY, client: cut.client }).narrate(contextFor(base, turn(1, []))))
    expect(outputs.some((o) => o.kind === 'block' && o.block.type === 'system' && o.block.text.includes('presupuesto'))).toBe(true)

    const refused = fakeClient(['{"kind":"block","block":{"type":"narration","text":"..."}}'], { stop: 'refusal' })
    await expect(collect(createAnthropicProvider({ model: 'claude-sonnet-5', credential: KEY, client: refused.client }).narrate(contextFor(base, turn(1, []))))).rejects.toThrow(/rechazó narrar/)
  })

  it('probe usa models.retrieve y redacta la clave en el error', async () => {
    const ok = new AnthropicTransport({ model: 'claude-sonnet-5', credential: KEY, client: fakeClient([]).client })
    expect(await ok.probe()).toEqual({ ok: true, model: 'claude-sonnet-5', message: 'Anthropic: Claude Sonnet 5 disponible' })

    const broken = createAnthropicProvider({ model: 'claude-sonnet-5', credential: KEY, client: fakeClient([], { fail: new Error(`401 authentication_error: invalid x-api-key ${KEY}`) }).client })
    const probe = await broken.probe()
    expect(probe).toMatchObject({ ok: false, model: 'claude-sonnet-5' })
    expect(probe.message).not.toContain('SECRETA')
    expect(probe.message).toContain('[credencial redactada]')
  })
})
