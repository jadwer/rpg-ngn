import { resolve } from 'node:path'
import { loadPack, type LoadedPack } from '@rpg-ngn/content'
import type { ResolveLine, ResolveTurnRequest } from '@rpg-ngn/engine-contract'
import { ModelGMProvider, type ModelPrompt, type ModelReply, type ModelTransport } from '@rpg-ngn/narrative'
import { describe, expect, it } from 'vitest'
import { fsSource } from './packs.js'
import { resolveTurn } from './resolve.js'

/**
 * Arcos de autor (docs/26, H4) con el piloto convertido en una historia de
 * dos capitulos: el 1 con desenlace inevitable y el 2 con dos finales.
 */
class Reply implements ModelTransport {
  readonly kind = 'fake'
  readonly model = 'fake-1'
  prompts: ModelPrompt[] = []
  constructor(private readonly text: string) {}
  async *stream(prompt: ModelPrompt): AsyncGenerator<string, ModelReply, undefined> {
    this.prompts.push(prompt)
    yield this.text
    return { finish: 'stop', inputTokens: 10, outputTokens: 10 }
  }
  async probe() {
    return { ok: true, model: this.model, message: 'ok' }
  }
}

async function twoChapters(): Promise<LoadedPack> {
  const { pack } = await loadPack(fsSource(resolve(import.meta.dirname, '../../../content/packs/pilot')))
  if (!pack) throw new Error('el piloto no carga')
  const sessions = new Map(pack.sessions)
  const first = sessions.get('001')!
  const second = sessions.get('002')!
  sessions.set('001', { ...first, arc: { chapter: { number: 1, title: 'El drama' }, turns: { target: 4 }, objective: 'Llegar al examen', fixedOutcome: 'Pierden el examen.' } })
  sessions.set('002', {
    ...second,
    arc: {
      chapter: { number: 2, title: 'La venganza' },
      turns: { target: 6, min: 2 },
      endings: [
        { id: 'se-repite', when: 'Vuelve a salvar a su padre.', title: 'La historia se repite', text: 'Esta vez no hay otra oportunidad.', final: true },
        { id: 'medico', when: 'Sostiene el no hasta el final.', title: 'FIN', text: 'Se titula y se queda con Mariana.', final: true, default: true },
      ],
    },
  })
  sessions.delete('003')
  return { ...pack, sessions }
}

function request(sessionId: string, turn: number): ResolveTurnRequest {
  return {
    contract: 1,
    campaignId: 'arco',
    pack: { id: 'pilot', version: '0.4.0' },
    ruleset: 'fantasy-d20-lite@1.0.0',
    snapshot: null,
    events: [{ id: 'evt-00001', v: 1, seq: 1, type: 'session_started', sessionId, recordedAt: '2026-10-04T12:00:00.000Z', payload: { party: ['character:zahira'] } }],
    turn: { id: `t-${turn}`, number: turn, sessionId, responses: [{ characterId: 'zahira', playerId: '1', text: 'No voy.', submittedAt: '2026-10-04T12:01:00.000Z', late: false }] },
    provider: { kind: 'scripted' },
    dice: 'engine',
  }
}

async function run(pack: LoadedPack, req: ResolveTurnRequest, text: string): Promise<{ result: Extract<ResolveLine, { kind: 'result' }>; transport: Reply }> {
  const transport = new Reply(text)
  const lines: ResolveLine[] = []
  for await (const line of resolveTurn(req, { loadPack: async () => pack, now: () => new Date('2026-10-04T12:02:00.000Z'), provider: new ModelGMProvider(transport, 'sk-test-arc-000000000000') })) lines.push(line)
  const result = lines.find((l): l is Extract<ResolveLine, { kind: 'result' }> => l.kind === 'result')
  if (!result) throw new Error(`sin resultado: ${JSON.stringify(lines.filter((l) => l.kind === 'error'))}`)
  return { result, transport }
}

const narration = '{"kind":"block","block":{"type":"narration","text":"El telefono suena otra vez."}}'

describe('arcos de autor', () => {
  it('el capitulo con desenlace fijo lleva su presupuesto aunque la mesa juegue libre, y cierra como capitulo', async () => {
    const pack = await twoChapters()
    const { result, transport } = await run(pack, request('001', 4), `${narration}\n{"kind":"close","cliffhanger":"Mañana es otro examen."}`)
    expect(transport.prompts[0]!.user).toContain('Turno 4 de 4')
    expect(transport.prompts[0]!.user).toContain('Desenlace inevitable (capa del GM): Pierden el examen.')
    expect(result.objective).toBe('Llegar al examen')
    expect(result.close).toEqual({ scope: 'chapter', cliffhanger: 'Mañana es otro examen.' })
  })

  it('un final con su condicion cumplida cierra antes del presupuesto y la tarjeta sale del mundo', async () => {
    const pack = await twoChapters()
    const { result, transport } = await run(pack, request('002', 3), `${narration}\n{"kind":"close","ending":"se-repite","cliffhanger":"no deberia quedar"}`)
    expect(transport.prompts[0]!.user).toContain('"se-repite": Vuelve a salvar a su padre.')
    expect(result.close).toEqual({ scope: 'story', endingId: 'se-repite', card: { title: 'La historia se repite', text: 'Esta vez no hay otra oportunidad.' } })
  })

  it('antes del presupuesto un close sin final valido se ignora; en el ultimo turno sin final vale el de por omision', async () => {
    const pack = await twoChapters()
    const early = await run(pack, request('002', 3), `${narration}\n{"kind":"close","ending":"inventado"}`)
    expect(early.result.close).toBeUndefined()

    const last = await run(pack, request('002', 6), narration)
    expect(last.result.close).toEqual({ scope: 'story', endingId: 'medico', card: { title: 'FIN', text: 'Se titula y se queda con Mariana.' } })
  })
})
