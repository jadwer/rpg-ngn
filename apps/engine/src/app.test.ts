import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { ENGINE_CONTRACT_VERSION, ResolveLine, type ProjectResponse, type ResolveTurnRequest } from '@rpg-ngn/engine-contract'
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
})
