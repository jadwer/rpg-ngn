import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import type Anthropic from '@anthropic-ai/sdk'
import { ENGINE_CONTRACT_VERSION, ResolveLine, type ProbeResponse, type ProjectResponse, type ResolveTurnRequest } from '@rpg-ngn/engine-contract'
import type { AnthropicClientLike, OpenAIClientLike } from '@rpg-ngn/narrative'
import { describe, expect, it } from 'vitest'
import { createEngine } from './app.js'
import { PackStore } from './packs.js'

const repoRoot = resolve(import.meta.dirname, '../../..')
const TOKEN = 'secreto-de-prueba'
const headers = { 'content-type': 'application/json', 'x-engine-token': TOKEN, 'x-engine-contract': String(ENGINE_CONTRACT_VERSION) }

const app = createEngine({ token: TOKEN, packs: new PackStore(join(repoRoot, 'content/packs')), now: () => new Date('2026-09-06T20:00:00Z') })

async function pilotEvents(): Promise<unknown[]> {
  const text = await readFile(join(repoRoot, 'campaigns/pilot/events.jsonl'), 'utf8')
  return text.split('\n').filter((l) => l.trim() !== '').map((l) => JSON.parse(l) as unknown)
}

async function pilotSnapshot(): Promise<{ seq: number; state: unknown }> {
  const snapshot = JSON.parse(await readFile(join(repoRoot, 'campaigns/pilot/snapshots/002.json'), 'utf8')) as { seq: number; state: unknown }
  return snapshot
}

function sessionStarted(seq: number) {
  return {
    id: `evt-${String(seq).padStart(5, '0')}`,
    v: 1,
    seq,
    type: 'session_started',
    sessionId: '003',
    recordedAt: '2026-09-06T19:00:00Z',
    payload: { party: ['character:zahira', 'character:calder'] },
  }
}

async function readLines(response: Response): Promise<ResolveLine[]> {
  const text = await response.text()
  return text.split('\n').filter((l) => l.trim() !== '').map((l) => ResolveLine.parse(JSON.parse(l)))
}

describe('apps/engine', () => {
  it('exige token y contrato', async () => {
    expect((await app.request('/v1/turns/resolve', { method: 'POST', body: '{}' })).status).toBe(401)
    expect((await app.request('/v1/turns/resolve', { method: 'POST', body: '{}', headers: { ...headers, 'x-engine-contract': '2' } })).status).toBe(400)
    expect((await app.request('/health')).status).toBe(200)
  })

  it('resuelve un turno sobre el snapshot de la 002 con la sesion 003 abierta', async () => {
    const snapshot = await pilotSnapshot()
    const request: ResolveTurnRequest = {
      contract: ENGINE_CONTRACT_VERSION,
      campaignId: '1',
      pack: { id: 'pilot', version: '0.4.0' },
      ruleset: 'fantasy-d20-lite@1.0.0',
      snapshot: snapshot.state,
      events: [sessionStarted(22)],
      turn: {
        id: 't-1',
        number: 1,
        sessionId: '003',
        responses: [
          { characterId: 'zahira', playerId: 'jaz', text: 'Miro la campana.', submittedAt: '2026-09-06T19:30:00Z', late: false },
        ],
      },
      provider: { kind: 'scripted' },
    }

    const response = await app.request('/v1/turns/resolve', { method: 'POST', headers, body: JSON.stringify(request) })
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/x-ndjson')

    const lines = await readLines(response)
    const blocks = lines.filter((l) => l.kind === 'block')
    const result = lines.at(-1)

    expect(blocks.map((b) => (b.kind === 'block' ? b.block.type : ''))).toEqual(['system', 'dialogue', 'narration'])
    expect(result?.kind).toBe('result')
    if (result?.kind !== 'result') return
    expect(result.events.map((e) => [e.seq, e.id, e.type])).toEqual([
      [23, 'evt-00023', 'player_action'],
      [24, 'evt-00024', 'narration'],
    ])
    expect(result.events[0]?.recordedAt).toBe('2026-09-06T20:00:00.000Z')
    expect(result.addressed).toEqual(['zahira', 'calder'])
    expect((result.state as { meta: { headSeq: number } }).meta.headSeq).toBe(24)
    expect(Object.keys(result.projections.players)).toContain('zahira')
    expect((result.projections.narrative as { log: unknown[] }).log).toHaveLength(3)
  })

  it('falla limpio si la sesion no esta abierta o el pack no existe', async () => {
    const snapshot = await pilotSnapshot()
    const base = {
      contract: ENGINE_CONTRACT_VERSION,
      campaignId: '1',
      pack: { id: 'pilot', version: '0.4.0' },
      ruleset: 'fantasy-d20-lite@1.0.0',
      snapshot: snapshot.state,
      events: [],
      turn: { id: 't', number: 1, sessionId: '002', responses: [] },
      provider: { kind: 'scripted' as const },
    }

    const closed = await readLines(await app.request('/v1/turns/resolve', { method: 'POST', headers, body: JSON.stringify(base) }))
    expect(closed).toEqual([{ kind: 'error', message: 'la sesion 002 no esta abierta en la campaña' }])

    const missing = await readLines(
      await app.request('/v1/turns/resolve', { method: 'POST', headers, body: JSON.stringify({ ...base, pack: { id: 'nope', version: '1.0.0' } }) }),
    )
    expect(missing[0]?.kind).toBe('error')

    const invalid = await app.request('/v1/turns/resolve', { method: 'POST', headers, body: JSON.stringify({ contract: 1 }) })
    expect(invalid.status).toBe(422)
  })

  it('valida y reproyecta el log del piloto, y detecta un snapshot manipulado', async () => {
    const events = await pilotEvents()

    const validated = await app.request('/v1/validate/events', {
      method: 'POST',
      headers,
      body: JSON.stringify({ contract: 1, pack: { id: 'pilot', version: '0.4.0' }, events }),
    })
    expect(validated.status).toBe(200)
    expect(((await validated.json()) as { ok: boolean; events: unknown[] })).toMatchObject({ ok: true })

    const snapshot = await pilotSnapshot()
    const projected = await app.request('/v1/project', {
      method: 'POST',
      headers,
      body: JSON.stringify({ contract: 1, pack: { id: 'pilot', version: '0.4.0' }, ruleset: 'fantasy-d20-lite@1.0.0', events, compareWith: snapshot }),
    })
    expect(projected.status).toBe(200)
    const body = (await projected.json()) as ProjectResponse
    expect(body.seq).toBe(21)
    expect(body.divergence).toEqual([])

    const tampered = JSON.parse(JSON.stringify(snapshot)) as { seq: number; state: { world: { characters: Record<string, { memoriesRecovered: number }> } } }
    tampered.state.world.characters['zahira']!.memoriesRecovered = 7
    const audited = await app.request('/v1/project', {
      method: 'POST',
      headers,
      body: JSON.stringify({ contract: 1, pack: { id: 'pilot', version: '0.4.0' }, ruleset: 'fantasy-d20-lite@1.0.0', events, compareWith: tampered }),
    })
    expect(((await audited.json()) as ProjectResponse).divergence?.map((d) => d.path)).toEqual(['state.world.characters.zahira.memoriesRecovered'])
  })

  it('probe del proveedor scripted', async () => {
    const response = await app.request('/v1/providers/probe?kind=scripted', { headers })
    expect(await response.json()).toMatchObject({ ok: true, provider: 'scripted' })
  })

  describe('con proveedores de modelo falsos', () => {
    const KEY = 'sk-ant-api03-SECRETA-abcdefghijklmnop'
    const ndjson = [
      '{"kind":"block","block":{"type":"narration","text":"La campana suena sola."}}',
      '{"kind":"event","event":{"type":"world_event","payload":{"note":"La campana suena sola"}}}',
      '{"kind":"addressed","characterIds":["calder"]}',
    ].join('\n')

    const anthropicCalls: Anthropic.MessageCreateParamsStreaming[] = []
    /** Cliente falso de Anthropic que devuelve `text` como un solo delta. */
    function anthropicWith(text: string): AnthropicClientLike {
      return {
        messages: {
          async create(params) {
            anthropicCalls.push(params)
            async function* events(): AsyncGenerator<Anthropic.RawMessageStreamEvent> {
              yield { type: 'message_start', message: { usage: { input_tokens: 900 } } } as unknown as Anthropic.RawMessageStreamEvent
              yield { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text } }
              yield { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 120 } } as unknown as Anthropic.RawMessageStreamEvent
            }
            return events()
          },
        },
        models: {
          async retrieve(id) {
            if (id === 'claude-roto') throw new Error(`404 model not found (x-api-key ${KEY})`)
            return { id, display_name: 'Claude Sonnet 5' }
          },
        },
      }
    }
    const anthropicClient = anthropicWith(ndjson)

    const openaiClient: OpenAIClientLike = {
      chat: {
        completions: {
          async create() {
            throw new Error(`401 Incorrect API key provided: ${KEY}`)
          },
        },
      },
      models: {
        async *list() {
          yield { id: 'qwen2.5:14b' }
        },
      },
    }

    const withFakes = createEngine({
      token: TOKEN,
      packs: new PackStore(join(repoRoot, 'content/packs')),
      now: () => new Date('2026-09-12T20:00:00Z'),
      providers: { anthropicClient, openaiClient },
    })

    async function request(provider: ResolveTurnRequest['provider']): Promise<ResolveTurnRequest> {
      const snapshot = await pilotSnapshot()
      return {
        contract: ENGINE_CONTRACT_VERSION,
        campaignId: '1',
        pack: { id: 'pilot', version: '0.4.0' },
        ruleset: 'fantasy-d20-lite@1.0.0',
        snapshot: snapshot.state,
        events: [sessionStarted(22)],
        turn: { id: 't-1', number: 1, sessionId: '003', responses: [{ characterId: 'zahira', playerId: 'jaz', text: 'Miro la campana.', submittedAt: '2026-09-12T19:30:00Z', late: false }] },
        provider,
        context: { premise: 'Esta noche esperan a Calder en la posada.', sessionNote: 'Anochecer' },
        budget: { maxOutputTokens: 1200 },
      }
    }

    it('resuelve un turno con anthropic: bloques al vuelo, eventos validados, contexto y presupuesto en el prompt', async () => {
      const response = await withFakes.request('/v1/turns/resolve', { method: 'POST', headers, body: JSON.stringify(await request({ kind: 'anthropic', model: 'claude-sonnet-5', credential: KEY })) })
      const lines = await readLines(response)
      const result = lines.at(-1)
      expect(lines.filter((l) => l.kind === 'block').map((l) => (l.kind === 'block' ? l.block.type : ''))).toEqual(['dialogue', 'narration'])
      expect(result?.kind).toBe('result')
      if (result?.kind !== 'result') return
      expect(result.events.map((e) => [e.seq, e.type])).toEqual([[23, 'player_action'], [24, 'narration'], [25, 'world_event']])
      expect(result.addressed).toEqual(['calder'])
      expect(result.usage).toEqual({ inputTokens: 900, outputTokens: 120 })

      const params = anthropicCalls.at(-1)!
      expect(params.max_tokens).toBe(1200)
      const user = String(params.messages[0]?.content)
      expect(user).toContain('<premisa_de_la_mesa>\nEsta noche esperan a Calder en la posada.\n</premisa_de_la_mesa>')
      expect(user).toContain('Anochecer')
      expect(JSON.stringify(params)).not.toContain(KEY)
    })

    it('el lint de conocimiento corta la filtracion de un secreto, deja el motivo en result.lint y ninguna proyeccion lleva el secreto', async () => {
      const leak = [
        '{"kind":"block","block":{"type":"narration","text":"Zahira, lo entiendes de golpe: fue Brorg quien te empujó hacia arriba."}}',
        '{"kind":"block","block":{"type":"narration","text":"El silencio pesa. ¿Qué hacéis?"}}',
        '{"kind":"addressed","characterIds":["zahira"]}',
      ].join('\n')
      const leaking = createEngine({ token: TOKEN, packs: new PackStore(join(repoRoot, 'content/packs')), now: () => new Date('2026-09-12T20:00:00Z'), providers: { anthropicClient: anthropicWith(leak) } })
      const provider = { kind: 'anthropic' as const, model: 'claude-sonnet-5', credential: KEY }

      const lines = await readLines(await leaking.request('/v1/turns/resolve', { method: 'POST', headers, body: JSON.stringify(await request(provider)) }))
      expect(lines.filter((l) => l.kind === 'block').map((l) => (l.kind === 'block' ? l.block : null))).toEqual([
        { type: 'dialogue', speaker: 'Zahira', speakerRef: 'character:zahira', text: 'Miro la campana.' },
        { type: 'system', text: 'El DM revisó su narración: contaba algo que la mesa todavía no ha descubierto.' },
        { type: 'narration', text: 'El silencio pesa. ¿Qué hacéis?' },
      ])
      const result = lines.at(-1)
      expect(result?.kind).toBe('result')
      if (result?.kind !== 'result') return
      expect(result.lint).toEqual([{ level: 'error', secretId: 'brorg-pago-por-zahira', marker: 'fue Brorg', receivers: ['zahira', 'calder'], message: 'usa "fue Brorg" del secreto brorg-pago-por-zahira, que zahira, calder no conocen' }])
      expect(result.events.map((e) => e.type)).toEqual(['player_action', 'narration'])
      const serialized = JSON.stringify({ state: result.state, projections: result.projections })
      expect(serialized).not.toContain('Brorg pagó')
      expect(serialized).not.toContain('quemaduras de bronce')
      expect(serialized).not.toContain('secrets')

      // En modo report el bloque pasa y el hallazgo se anota igual; el engine acepta el campo sin subir el contrato.
      const reported = await readLines(await leaking.request('/v1/turns/resolve', { method: 'POST', headers, body: JSON.stringify({ ...(await request(provider)), lint: 'report' }) }))
      expect(reported.filter((l) => l.kind === 'block').map((l) => (l.kind === 'block' ? l.block.type : ''))).toEqual(['dialogue', 'narration', 'narration'])
      expect(reported.at(-1)?.kind === 'result' && reported.at(-1)?.kind === 'result' ? (reported.at(-1) as { lint?: unknown[] }).lint : null).toHaveLength(1)

      // Un secret_revealed propuesto por el modelo entra al log con la party de testigos y queda proyectado en knowledge.
      const revealing = createEngine({
        token: TOKEN,
        packs: new PackStore(join(repoRoot, 'content/packs')),
        now: () => new Date('2026-09-12T20:00:00Z'),
        providers: { anthropicClient: anthropicWith('{"kind":"event","event":{"type":"secret_revealed","payload":{"secretId":"osric-esta-abajo"}}}\n{"kind":"block","block":{"type":"narration","text":"Osric está abajo. Lo veis bajar."}}') },
      })
      const revealed = await readLines(await revealing.request('/v1/turns/resolve', { method: 'POST', headers, body: JSON.stringify(await request(provider)) }))
      const last = revealed.at(-1)
      expect(last?.kind).toBe('result')
      if (last?.kind !== 'result') return
      expect(last.lint).toBeUndefined()
      expect(last.events.map((e) => [e.seq, e.type])).toEqual([[23, 'player_action'], [24, 'secret_revealed'], [25, 'narration']])
      expect((last.projections.players['zahira'] as { knowledge: { secrets?: Record<string, unknown> } }).knowledge.secrets).toEqual({ 'osric-esta-abajo': { event: 'evt-00024', seq: 24, how: 'secret_revealed' } })
    })

    it('un fallo del modelo sale como error NDJSON sin la credencial', async () => {
      const response = await withFakes.request('/v1/turns/resolve', {
        method: 'POST',
        headers,
        body: JSON.stringify(await request({ kind: 'openai', model: 'qwen2.5:14b', credential: KEY, baseUrl: 'http://127.0.0.1:11434/v1', contextProfile: 'compact' })),
      })
      const text = await response.text()
      expect(text).not.toContain(KEY)
      expect(text).not.toContain('SECRETA')
      const lines = text.split('\n').filter((l) => l.trim() !== '').map((l) => ResolveLine.parse(JSON.parse(l)))
      const error = lines.at(-1)
      expect(error?.kind).toBe('error')
      expect(error?.kind === 'error' && error.message).toMatch(/openai\/qwen2\.5:14b falló: 401/)
      expect(error?.kind === 'error' && error.message).toContain('[credencial redactada]')
    })

    it('probe de anthropic y de un compatible con OpenAI, con la credencial en cabecera y nunca en la respuesta', async () => {
      const probeHeaders = { ...headers, 'x-provider-credential': KEY }
      const ok = await withFakes.request('/v1/providers/probe?kind=anthropic&model=claude-sonnet-5', { headers: probeHeaders })
      expect(await ok.json()).toEqual({ ok: true, provider: 'anthropic', model: 'claude-sonnet-5', message: 'Anthropic: Claude Sonnet 5 disponible' })

      const broken = await withFakes.request('/v1/providers/probe?kind=anthropic&model=claude-roto', { headers: probeHeaders })
      const brokenBody = (await broken.json()) as ProbeResponse
      expect(brokenBody.ok).toBe(false)
      expect(JSON.stringify(brokenBody)).not.toContain('SECRETA')

      const ollama = await withFakes.request(`/v1/providers/probe?kind=openai&model=qwen2.5:14b&baseUrl=${encodeURIComponent('http://127.0.0.1:11434/v1')}`, { headers: { ...headers, 'x-provider-credential': 'ollama' } })
      expect(await ollama.json()).toMatchObject({ ok: true, provider: 'openai', model: 'qwen2.5:14b' })

      const missing = await withFakes.request(`/v1/providers/probe?kind=openai&model=llama3.1:8b&baseUrl=${encodeURIComponent('http://127.0.0.1:11434/v1')}`, { headers: { ...headers, 'x-provider-credential': 'ollama' } })
      expect(((await missing.json()) as ProbeResponse).message).toContain('ollama pull llama3.1:8b')

      const invalid = await withFakes.request('/v1/providers/probe?kind=anthropic', { headers })
      expect(invalid.status).toBe(400)
      expect(((await invalid.json()) as ProbeResponse).message).toContain('configuracion invalida')
    })
  })
})
