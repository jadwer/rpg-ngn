import { resolve } from 'node:path'
import { loadPack, type LoadedPack } from '@rpg-ngn/content'
import type { ResolveLine, ResolveTurnRequest } from '@rpg-ngn/engine-contract'
import { ModelGMProvider, type GMProvider, type ModelPrompt, type ModelReply, type ModelTransport } from '@rpg-ngn/narrative'
import { describe, expect, it } from 'vitest'
import { fsSource } from './packs.js'
import { resolveTurn } from './resolve.js'

/**
 * Turno de noche en la Persefone (08-10), pieza 8.3: el motor sortea, guarda
 * lo privado, cuenta los votos y decide quien gana. El GM es un guion: no se
 * gasta API y cada turno dice exactamente lo que el modelo "propone".
 */

const at = '2026-10-08T20:00:00.000Z'
const PARTY = ['brorg', 'calder', 'dayan', 'hector', 'zahira']

/** El piloto con tareas en sus lugares y acciones privadas: la estacion de prueba. */
async function station(): Promise<LoadedPack> {
  const { pack } = await loadPack(fsSource(resolve(import.meta.dirname, '../../../content/packs/pilot')))
  if (!pack) throw new Error('el piloto no carga')
  const locations = new Map(pack.locations)
  for (const id of ['tercer-nivel', 'plaza', 'posada']) {
    const location = locations.get(id)!
    locations.set(id, { ...location, tasks: [1, 2, 3, 4, 5, 6].map((n) => ({ id: `${id}-${n}`, name: `Tarea ${n} de ${location.name}` })) })
  }
  const sessions = new Map(pack.sessions)
  const session = sessions.get('003')!
  sessions.set('003', {
    ...session,
    arc: {
      turns: { target: 8 },
      endings: [
        { id: 'tripulacion', when: 'Lo decide el motor.', title: 'Fin: La estación se salva' },
        { id: 'huesped', when: 'Lo decide el motor.', title: 'Fin: Las luces no vuelven', default: true },
      ],
    },
  })
  return { ...pack, locations, sessions, manifest: { ...pack.manifest, privateActions: true } }
}

/** Siempre el primero: Brorg es el Huesped y las tareas salen en orden. */
const first = { nextInt: () => 0, describe: () => 'primero' }

const started = { id: 'evt-00001', v: 1, seq: 1, type: 'session_started', sessionId: '003', recordedAt: at, payload: { party: PARTY.map((id) => `character:${id}`) } }

function request(turn: number, events: unknown[], responses: Array<{ characterId: string; text: string; vote?: string | null }>): ResolveTurnRequest {
  const votes = Object.fromEntries(responses.filter((r) => r.vote !== undefined).map((r) => [r.characterId, r.vote ?? null]))
  return {
    contract: 1,
    campaignId: 'persefone',
    pack: { id: 'pilot', version: '0.4.0' },
    ruleset: 'deduccion-social@1.0.0',
    snapshot: null,
    events: events as ResolveTurnRequest['events'],
    turn: { id: `t-${turn}`, number: turn, sessionId: '003', responses: responses.map(({ vote: _vote, ...r }) => ({ ...r, playerId: r.characterId, submittedAt: at, late: false })), ...(Object.keys(votes).length ? { votes } : {}) },
    provider: { kind: 'scripted' },
    dice: 'engine',
  }
}

/** El modelo de mentira: devuelve las lineas planas de un turno, como las escribiria el GM. */
class Lines implements ModelTransport {
  readonly kind = 'fake'
  readonly model = 'guion'
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

/** Un GM con guion: bloques de narracion y eventos, en el formato plano del modelo. */
function scripted(turns: Array<{ blocks: Array<Record<string, unknown>>; events?: Array<Record<string, unknown>> }>): GMProvider {
  const turn = turns[0]!
  const lines = [
    ...(turn.events ?? []).map((e) => JSON.stringify({ ...e, kind: e['type'], type: undefined })),
    ...turn.blocks.map((b) => JSON.stringify({ kind: b['type'], text: b['text'] })),
    JSON.stringify({ kind: 'addressed', characterIds: PARTY }),
  ]
  return new ModelGMProvider(new Lines(lines.join('\n')), 'sk-test-deduccion-000000')
}

async function play(pack: LoadedPack, req: ResolveTurnRequest, provider: GMProvider): Promise<{ lines: ResolveLine[]; result: Extract<ResolveLine, { kind: 'result' }> }> {
  const lines: ResolveLine[] = []
  for await (const line of resolveTurn(req, { loadPack: async () => pack, now: () => new Date(at), provider, random: first })) lines.push(line)
  const result = lines.find((l): l is Extract<ResolveLine, { kind: 'result' }> => l.kind === 'result')
  if (!result) throw new Error(`sin resultado: ${JSON.stringify(lines.filter((l) => l.kind === 'error'))}`)
  return { lines, result }
}

const blocks = (lines: ResolveLine[]) => lines.flatMap((l) => (l.kind === 'block' ? [l.block] : []))
const world = (result: Extract<ResolveLine, { kind: 'result' }>) => (result.state as { world: { characters: Record<string, { custom: Record<string, unknown>; location?: string | null }>; deduction?: Record<string, unknown> } }).world

describe('deduccion social en el motor', () => {
  it('al abrir sortea un Huesped y le susurra a cada uno su rol y sus tareas; nadie mas lo ve', async () => {
    const pack = await station()
    const { lines, result } = await play(pack, request(1, [started], []), scripted([{ blocks: [{ type: 'narration', text: 'La alarma suena.' }] }]))
    const whispers = blocks(lines).filter((b) => b.type === 'narration' && b.to?.length && /Eres (tripulante|el Huésped)/.test(b.text))
    expect(whispers).toHaveLength(5)
    expect(whispers.find((b) => b.type === 'narration' && b.to?.[0] === 'brorg' && b.text.startsWith('Eres el Huésped'))).toBeTruthy()
    expect(world(result).characters['calder']?.custom['role']).toBe('tripulante')
    expect((world(result).characters['calder']?.custom['tasks'] as unknown[]).length).toBe(3)
    // El reparto va en la capa del GM: no entra a la cronica.
    expect(blocks(lines).some((b) => b.type === 'narration' && !b.to && /Huésped/.test(b.text))).toBe(false)
  })

  it('una partida entera: la muerte se guarda, el reporte abre reunion, la mesa vota y gana la tripulacion', async () => {
    const pack = await station()
    let events: unknown[] = [started]
    const turn = async (number: number, responses: Parameters<typeof request>[2], script: Parameters<typeof scripted>[0][number]) => {
      const out = await play(pack, request(number, events, responses), scripted([script]))
      events = [...events, ...out.result.events]
      return out
    }
    await turn(1, [], { blocks: [{ type: 'narration', text: 'La alarma suena.' }] })

    // Turno 2: Brorg (el Huesped) lleva a Calder a la plaza y lo mata. El GM se va de la lengua.
    const killing = await turn(2, [{ characterId: 'brorg', text: 'Voy a la plaza y mato a Calder.' }, { characterId: 'calder', text: 'Voy a la plaza a hacer mi tarea.' }], {
      blocks: [
        { type: 'narration', text: 'Las luces de la plaza zumban.' },
        { type: 'narration', text: 'Brorg se acerca a Calder por la espalda en la plaza.' },
        { type: 'narration', text: 'En la posada no pasa nada.' },
      ],
      events: [
        { type: 'state_change', effects: [{ op: 'move', who: 'character:brorg', to: 'plaza' }, { op: 'move', who: 'character:calder', to: 'plaza' }] },
        { type: 'state_change', effects: [{ op: 'kill', who: 'character:brorg', target: 'character:calder' }] },
      ],
    })
    const published = blocks(killing.lines).filter((b) => b.type === 'narration' && !b.to).map((b) => (b.type === 'narration' ? b.text : ''))
    expect(published).toContain('Las luces de la plaza zumban.')
    expect(published).not.toContain('Brorg se acerca a Calder por la espalda en la plaza.')
    expect(blocks(killing.lines).find((b) => b.type === 'narration' && b.text.startsWith('Brorg se acerca'))).toMatchObject({ to: ['brorg', 'calder'] })
    // Lo que escribio cada uno es suyo.
    expect(blocks(killing.lines).find((b) => b.type === 'dialogue' && b.declared && b.text.startsWith('Voy a la plaza y mato'))).toMatchObject({ to: ['brorg'] })
    expect(world(killing.result).characters['calder']?.custom['alive']).toBe(false)
    expect(world(killing.result).deduction).toMatchObject({ actionTurns: 1 })

    // Turno 3: Dayan entra a la plaza, encuentra el cuerpo y lo reporta.
    const report = await turn(3, [{ characterId: 'dayan', text: 'Voy a la plaza.' }], {
      blocks: [{ type: 'narration', text: 'Dayan encuentra a Calder en el suelo de la plaza.' }],
      events: [{ type: 'state_change', effects: [{ op: 'move', who: 'character:dayan', to: 'plaza' }] }, { type: 'state_change', effects: [{ op: 'report', who: 'character:dayan' }] }],
    })
    // Sin muerte este turno, la victima se puede nombrar.
    expect(blocks(report.lines).find((b) => b.type === 'narration' && b.text.startsWith('Dayan encuentra'))).not.toHaveProperty('to')
    expect(world(report.result).deduction).toMatchObject({ meetingNext: true })

    // Turno 4, reunion: los argumentos son publicos, los votos se cuentan antes de narrar y el GM no puede matar.
    const meeting = await turn(
      4,
      [
        { characterId: 'dayan', text: 'Brorg estaba en la plaza.', vote: 'brorg' },
        { characterId: 'hector', text: 'Le creo a Dayan.', vote: 'brorg' },
        { characterId: 'zahira', text: 'Yo también.', vote: 'brorg' },
        { characterId: 'brorg', text: 'Yo estaba en la posada.', vote: 'dayan' },
        { characterId: 'calder', text: 'Fui yo.', vote: 'zahira' },
      ],
      { blocks: [{ type: 'narration', text: 'La tripulación discute junto a la esclusa.' }], events: [{ type: 'state_change', effects: [{ op: 'kill', who: 'character:brorg', target: 'character:dayan' }] }] },
    )
    expect(blocks(meeting.lines).find((b) => b.type === 'dialogue' && b.declared && b.text === 'Brorg estaba en la plaza.')).not.toHaveProperty('to')
    // Calder esta muerto: su "Fui yo." no lo oye nadie mas, y su voto no cuenta.
    expect(blocks(meeting.lines).find((b) => b.type === 'dialogue' && b.declared && b.text === 'Fui yo.')).toMatchObject({ to: ['calder'] })
    const system = blocks(meeting.lines).flatMap((b) => (b.type === 'system' ? [b] : []))
    expect(system.find((b) => b.text.includes('sella a Brorg'))?.text).toContain('Era el Huésped')
    expect(world(meeting.result).characters['dayan']?.custom['alive']).toBe(true)
    expect(meeting.result.close?.endingId).toBe('tripulacion')
    expect(system.find((b) => b.title === 'Los roles')?.text).toContain('Brorg: el Huésped')
  })
})
