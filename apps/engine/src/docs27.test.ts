import { resolve } from 'node:path'
import { loadPack, type LoadedPack } from '@rpg-ngn/content'
import type { ResolveLine, ResolveTurnRequest } from '@rpg-ngn/engine-contract'
import { ModelGMProvider, type GMProvider, type ModelPrompt, type ModelReply, type ModelTransport } from '@rpg-ngn/narrative'
import { describe, expect, it } from 'vitest'
import { fsSource } from './packs.js'
import { resolveTurn } from './resolve.js'

/**
 * Lo del engine que salio de leer las mesas 43 y 44 y del VAM del 05-10
 * (docs/27): las ideas se piden con el turno ya aplicado y no pueden retener
 * ni tumbar el turno; un efecto que el ruleset no sabe aplicar se descarta; y
 * lo que el autor escribio para abrir y cerrar una sesion sale tal cual.
 */
class Reply implements ModelTransport {
  readonly kind = 'fake'
  prompts: ModelPrompt[] = []
  constructor(
    readonly model: string,
    private readonly answer: () => string | Promise<string>,
  ) {}
  async *stream(prompt: ModelPrompt): AsyncGenerator<string, ModelReply, undefined> {
    this.prompts.push(prompt)
    yield await this.answer()
    return { finish: 'stop', inputTokens: 10, outputTokens: 10 }
  }
  async probe() {
    return { ok: true, model: this.model, message: 'ok' }
  }
}

async function pilot(): Promise<LoadedPack> {
  const { pack } = await loadPack(fsSource(resolve(import.meta.dirname, '../../../content/packs/pilot')))
  if (!pack) throw new Error('el piloto no carga')
  return pack
}

const at = '2026-10-05T12:00:00.000Z'
const started = (seq: number, sessionId: string) => ({ id: `evt-${String(seq).padStart(5, '0')}`, v: 1, seq, type: 'session_started', sessionId, recordedAt: at, payload: { party: ['character:zahira'] } })

function request(sessionId: string, turn: number, events: unknown[], responses = true): ResolveTurnRequest {
  return {
    contract: 1,
    campaignId: 'docs27',
    pack: { id: 'pilot', version: '0.4.0' },
    ruleset: 'fantasy-d20-lite@1.0.0',
    snapshot: null,
    events: events as ResolveTurnRequest['events'],
    turn: { id: `t-${turn}`, number: turn, sessionId, responses: responses ? [{ characterId: 'zahira', playerId: '1', text: 'Salgo a la plaza.', submittedAt: at, late: false }] : [] },
    provider: { kind: 'scripted' },
    dice: 'engine',
  }
}

async function run(pack: LoadedPack, req: ResolveTurnRequest, provider: GMProvider): Promise<{ lines: ResolveLine[]; result: Extract<ResolveLine, { kind: 'result' }> }> {
  const lines: ResolveLine[] = []
  for await (const line of resolveTurn(req, { loadPack: async () => pack, now: () => new Date(at), provider })) lines.push(line)
  const result = lines.find((l): l is Extract<ResolveLine, { kind: 'result' }> => l.kind === 'result')
  if (!result) throw new Error(`sin resultado: ${JSON.stringify(lines.filter((l) => l.kind === 'error'))}`)
  return { lines, result }
}

const KEY = 'sk-test-docs27-engine-0000'
const moves = ['{"kind":"narration","text":"Zahira cruza la puerta y sale al frío de la plaza."}', '{"kind":"where","location":"plaza"}', '{"kind":"addressed","characterIds":["zahira"]}'].join('\n')

describe('ideas de accion: despues del turno, con tope y aparte', () => {
  it('salen del mundo como quedo tras el turno, no de como estaba antes', async () => {
    const pack = await pilot()
    const ideas = new Reply('ideas', () => '{"kind":"suggest","options":["Cruzo la plaza hacia la fuente","Me quedo en la sombra a mirar"]}')
    const provider = new ModelGMProvider(new Reply('narrador', () => moves), KEY, { ideasTransport: ideas })
    // Zahira empieza en la posada; el turno la lleva a la plaza.
    const located = { id: 'evt-00002', v: 1, seq: 2, type: 'state_change', sessionId: '003', recordedAt: at, effects: [{ op: 'move', who: 'character:zahira', to: 'posada' }] }
    const { result } = await run(pack, request('003', 2, [started(1, '003'), located]), provider)

    expect(result.suggestions).toEqual({ zahira: ['Cruzo la plaza hacia la fuente', 'Me quedo en la sombra a mirar'] })
    const prompt = ideas.prompts[0]!.user
    expect(prompt).toContain(`Dónde está Zahira: ${pack.locations.get('plaza')!.name}`)
    expect(prompt).not.toContain(`Dónde está Zahira: ${pack.locations.get('posada')!.name}`)
    // Lo recien narrado esta en lo que el personaje ha vivido.
    expect(prompt).toContain('sale al frío de la plaza')
    // El consumo del narrador no se mezcla con el de las ideas.
    expect(result.usage).toEqual({ inputTokens: 10, outputTokens: 10 })
    expect(result.diagnostics?.ideasUsage).toEqual({ calls: 1, inputTokens: 10, outputTokens: 10 })
  })

  it('si la llamada de ideas falla, el turno sale igual, sin ideas, y queda apuntado', async () => {
    const pack = await pilot()
    const broken = new Reply('ideas', () => {
      throw new Error(`sin saldo (clave ${KEY})`)
    })
    const provider = new ModelGMProvider(new Reply('narrador', () => moves), KEY, { ideasTransport: broken })
    const { result } = await run(pack, request('003', 2, [started(1, '003')]), provider)
    expect(result.suggestions).toBeUndefined()
    expect(result.addressed).toEqual(['zahira'])
    expect(result.diagnostics?.dropped.join(' ')).toContain('sin ideas para zahira')
    // Ni en el diagnostico sale la credencial.
    expect(JSON.stringify(result.diagnostics)).not.toContain(KEY)
  })

  it('con el GM con guion no hay llamada de ideas ni diagnostico de modelo', async () => {
    const pack = await pilot()
    const lines: ResolveLine[] = []
    for await (const line of resolveTurn(request('003', 2, [started(1, '003')]), { loadPack: async () => pack, now: () => new Date(at) })) lines.push(line)
    const result = lines.find((l): l is Extract<ResolveLine, { kind: 'result' }> => l.kind === 'result')
    expect(result).toBeDefined()
    expect(result?.diagnostics).toBeUndefined()
  })
})

describe('un evento que el ruleset no sabe aplicar no repite el turno', () => {
  it('se descarta, se apunta y los demas eventos siguen con su seq en orden', async () => {
    const pack = await pilot()
    const provider: GMProvider = {
      kind: 'fake',
      async *narrate() {
        yield { kind: 'block', block: { type: 'narration', text: 'Zahira busca en su bolsa.' } }
        yield { kind: 'event', event: { type: 'narration', payload: { text: 'Zahira busca en su bolsa.' }, visibility: { layer: 'campaign', witnesses: ['character:zahira'] } } }
        // Perder lo que no se tiene: el ruleset lanza.
        yield { kind: 'event', event: { type: 'inventory_change', actor: 'character:zahira', effects: [{ op: 'lose', item: 'cosa-que-no-tiene', holder: 'character:zahira' }] } }
        yield { kind: 'event', event: { type: 'world_event', payload: { note: 'Empieza a nevar.' }, visibility: { layer: 'campaign', witnesses: ['character:zahira'] } } }
        yield { kind: 'diagnostics', diagnostics: { finish: 'stop', ignored: [], ignoredCount: 0, lostStory: 0, repaired: [], dropped: [], lintCuts: 0, raw: '' } }
        yield { kind: 'addressed', characterIds: ['zahira'] }
        yield { kind: 'usage', inputTokens: 1, outputTokens: 1 }
      },
      async probe() {
        return { ok: true, model: null, message: null }
      },
    }
    const { lines, result } = await run(pack, request('003', 2, [started(1, '003')]), provider)
    expect(lines.some((l) => l.kind === 'error')).toBe(false)
    expect(result.events.map((e) => [e.seq, e.type])).toEqual([[2, 'narration'], [3, 'world_event']])
    expect(result.diagnostics?.dropped.join(' ')).toMatch(/inventory_change: .*cosa-que-no-tiene/)
  })
})

describe('lo que el autor escribio para abrir y cerrar una sesion', () => {
  async function authored(): Promise<LoadedPack> {
    const pack = await pilot()
    const sessions = new Map(pack.sessions)
    sessions.set('001', { ...sessions.get('001')!, arc: { chapter: { number: 1, title: 'El drama' }, turns: { target: 3 }, endCard: { title: 'Fin del capítulo 1', text: 'No era el plan. Pero ahí estaba.', scene: 'Un salón gris al amanecer, un examen a medio llenar.' } } })
    sessions.set('002', { ...sessions.get('002')!, startLocation: 'plaza', arc: { chapter: { number: 2, title: 'La revelación' }, turns: { target: 5 }, previously: 'Perdiste el examen por ir a salvarlo.', goal: 'Que este año, por fin, algo cambie.' } })
    sessions.delete('003')
    return { ...pack, sessions }
  }
  const text = (line: ResolveLine): string => (line.kind === 'block' && 'text' in line.block ? (line.block.text ?? '') : '')

  it('la imagen del cierre es la del autor aunque el GM mande otra, y sin ninguna de las dos, la tarjeta', async () => {
    const pack = await authored()
    const closing = ['{"kind":"narration","text":"Amanece sobre los edificios."}', '{"kind":"scene","text":"La casa de siempre, vacía."}', '{"kind":"close","cliffhanger":"Mañana es otro día."}'].join('\n')
    const { result } = await run(pack, request('001', 3, [started(1, '001')]), new ModelGMProvider(new Reply('narrador', () => closing), KEY))
    expect(result.illustrations?.[0]).toMatchObject({ reason: 'ending', alt: 'Un salón gris al amanecer, un examen a medio llenar.' })

    const sessions = new Map(pack.sessions)
    sessions.set('001', { ...sessions.get('001')!, arc: { ...sessions.get('001')!.arc!, endCard: { title: 'Fin del capítulo 1', text: 'No era el plan. Pero ahí estaba.' } } })
    const bare = await run({ ...pack, sessions }, request('001', 3, [started(1, '001')]), new ModelGMProvider(new Reply('narrador', () => '{"kind":"narration","text":"Amanece."}\n{"kind":"close"}'), KEY))
    expect(bare.result.illustrations?.[0]).toMatchObject({ reason: 'ending', alt: 'No era el plan.' })
  })

  it('al abrir: el "Anteriormente" del autor, la meta de esta sesion en privado y la party en el lugar de inicio', async () => {
    const pack = await authored()
    const closed = { id: 'evt-00003', v: 1, seq: 3, type: 'session_closed', sessionId: '001', recordedAt: at, payload: {} }
    const elsewhere = { id: 'evt-00002', v: 1, seq: 2, type: 'state_change', sessionId: '001', recordedAt: at, effects: [{ op: 'move', who: 'character:zahira', to: 'posada' }] }
    const transport = new Reply('narrador', () => '{"kind":"recap","text":"Un resumen inventado por el modelo."}\n{"kind":"narration","text":"Quince años después, suena el teléfono."}\n{"kind":"addressed","characterIds":["zahira"]}')
    const { lines, result } = await run(pack, request('002', 1, [started(1, '001'), elsewhere, closed, started(4, '002')], false), new ModelGMProvider(transport, KEY))

    const recaps = lines.filter((l) => l.kind === 'block' && l.block.type === 'system' && l.block.recap)
    // Uno solo, el del autor: el del modelo no entra aunque lo escriba.
    expect(recaps.map(text)).toEqual(['Perdiste el examen por ir a salvarlo.'])
    expect(transport.prompts[0]!.user).not.toContain('{"kind":"recap"')
    const goal = lines.find((l) => l.kind === 'block' && l.block.type === 'narration' && l.block.to?.includes('zahira'))
    expect(goal ? text(goal) : '').toBe('Eres Zahira. Esto solo lo sabes tú. Tu meta: Que este año, por fin, algo cambie.')
    // Venia de la posada: la sesion arranca en la plaza y ahi se la coloca.
    const world = result.state as { world: { characters: Record<string, { location: string | null }> } }
    expect(world.world.characters['zahira']?.location).toBe('plaza')
    // Y el GM ve esa meta en la ficha, no la de la hoja.
    expect(transport.prompts[0]!.user).toContain('Meta: Que este año, por fin, algo cambie.')
  })

  it('un secreto que es del personaje (knownBy) se le cuenta solo a el al abrir, queda como conocido y el GM lo sabe', async () => {
    const pack = await pilot()
    const secrets = new Map(pack.secrets)
    const own = [...secrets.values()][0]!
    secrets.set(own.id, { ...own, knownBy: ['character:zahira'], text: 'Fuiste tú quien dejó la puerta abierta aquella noche.' })
    const party = { ...started(1, '003'), payload: { party: ['character:zahira', 'character:calder'] } }
    const transport = new Reply('narrador', () => '{"kind":"narration","text":"La posada huele a humo."}\n{"kind":"addressed","characterIds":["zahira","calder"]}')
    const { lines, result } = await run({ ...pack, secrets }, request('003', 1, [party], false), new ModelGMProvider(transport, KEY))

    const whisperTo = (id: string) => lines.filter((l) => l.kind === 'block' && l.block.type === 'narration' && l.block.to?.includes(id)).map(text).join(' ')
    const toZahira = whisperTo('zahira')
    const toCalder = whisperTo('calder')
    expect(toZahira).toContain('Y sabes algo que los demás no: Fuiste tú quien dejó la puerta abierta aquella noche.')
    expect(toCalder).not.toContain('puerta abierta')
    // Registrado como conocido por ella y solo por ella; a la mesa no se publica nada.
    const revealed = result.events.filter((e) => (e as { type: string }).type === 'secret_revealed') as Array<{ visibility: { witnesses: string[] } }>
    expect(revealed).toHaveLength(1)
    expect(revealed[0]!.visibility.witnesses).toEqual(['character:zahira'])
    const knowledge = (result.state as { knowledge: Record<string, { secrets?: Record<string, unknown> }> }).knowledge
    expect(knowledge['zahira']?.secrets?.[own.id]).toBeTruthy()
    expect(knowledge['calder']?.secrets?.[own.id]).toBeUndefined()
    expect(lines.some((l) => l.kind === 'block' && !('to' in l.block && l.block.to) && 'text' in l.block && (l.block.text ?? '').includes('puerta abierta'))).toBe(false)
    // El GM lo ve como el secreto de Zahira en su capa.
    expect(transport.prompts[0]!.user).toContain(`es el secreto de Zahira`)
  })
})
