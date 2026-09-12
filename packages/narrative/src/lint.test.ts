import { applyEvent, reduce } from '@rpg-ngn/campaign'
import { CampaignEvent, loadPack, memorySource } from '@rpg-ngn/content'
import { fantasyD20Lite } from '@rpg-ngn/rules'
import { describe, expect, it } from 'vitest'
import { buildKnowledgeView, lintText, markRevealed, secretSubjectPresent } from './lint.js'
import { contextFor, openSession003, pilotContext, response, turn } from './pilot.test-helpers.js'

/** Sesion 003 con Zahira y Calder mas un secret_revealed de `secretId` a `witnesses`. */
async function withRevealed(secretId: string, witnesses: string[]) {
  const base = await openSession003()
  const revealed = CampaignEvent.parse({
    id: 'evt-00023', v: 1, seq: 23, type: 'secret_revealed', sessionId: '003', recordedAt: '2026-09-12T19:10:00Z',
    visibility: { layer: 'campaign', witnesses: witnesses.map((id) => `character:${id}`) },
    payload: { secretId },
  })
  return { ...base, state: applyEvent(base.state, revealed, fantasyD20Lite, [...base.pack.secrets.values()]) }
}

describe('lint de conocimiento sobre el pack piloto', () => {
  it('corta el secreto de Brorg cuando un receptor no lo conoce y lo deja pasar cuando todos lo conocen', async () => {
    const base = await openSession003()
    const view = buildKnowledgeView(contextFor(base, turn(1, [])), ['zahira', 'calder'])

    const leak = lintText('Zahira, ahora lo entiendes: fue Brorg quien te empujó hacia arriba.', view, base.pack)
    expect(leak).toEqual([expect.objectContaining({ level: 'error', secretId: 'brorg-pago-por-zahira', marker: 'fue Brorg', receivers: ['zahira', 'calder'] })])
    expect(leak[0]?.message).toContain('zahira, calder no conocen')

    // Revelado solo a Calder: Zahira sigue sin saberlo.
    const half = await withRevealed('brorg-pago-por-zahira', ['calder'])
    expect(lintText('Fue Brorg.', buildKnowledgeView(contextFor(half, turn(2, [])), ['zahira', 'calder']), base.pack)).toEqual([
      expect.objectContaining({ level: 'error', receivers: ['zahira'] }),
    ])
    expect(lintText('Fue Brorg.', buildKnowledgeView(contextFor(half, turn(2, [])), ['calder']), base.pack)).toEqual([])

    const both = await withRevealed('brorg-pago-por-zahira', ['zahira', 'calder'])
    expect(lintText('Fue Brorg, y Brorg pagó con sus manos.', buildKnowledgeView(contextFor(both, turn(2, [])), ['zahira', 'calder']), base.pack)).toEqual([])
  })

  it('un texto limpio pasa; lo que la mesa ya puede leer en la sesion o en la cronica no es filtracion; los marcadores ignoran acentos y mayusculas', async () => {
    const base = await openSession003()
    const view = buildKnowledgeView(contextFor(base, turn(1, [])), ['zahira', 'calder'])

    expect(lintText('La campana de bronce está fría al tacto. ¿Qué hacéis?', view, base.pack)).toEqual([])
    // El recap publico de la 002 ya cuenta que Osric subio solo y que alguien pago por el.
    expect(lintText('Recordáis lo que Osric confesó: subió solo porque alguien pagó por él.', view, base.pack)).toEqual([])
    // El hilo abierto de la mano verdosa es publico; la identidad no.
    expect(lintText('Zahira recuerda la mano verdosa con la cicatriz.', view, base.pack)).toEqual([])
    expect(lintText('OSRIC ESTA ABAJO, en el tercer nivel.', view, base.pack)).toEqual([expect.objectContaining({ level: 'error', secretId: 'osric-esta-abajo', marker: 'Osric está abajo' })])
  })

  it('lo que un jugador declaro este turno no cuenta como filtracion, pero otra keyword del mismo secreto si', async () => {
    const base = await openSession003()
    const view = buildKnowledgeView(contextFor(base, turn(2, [response('zahira', 'Estoy segura: fue Brorg. Reconozco la mano.')])), ['zahira', 'calder'])

    expect(lintText('Calder te mira. "¿Fue Brorg?", repite. Nadie contesta.', view, base.pack)).toEqual([])
    expect(lintText('Calder te mira. Fue Brorg, sí: Brorg pagó por ti con sus manos.', view, base.pack)).toEqual([
      expect.objectContaining({ level: 'error', marker: 'Brorg pagó' }),
    ])
  })

  it('un secret_revealed de este turno marca el secreto como conocido para toda la party', async () => {
    const base = await openSession003()
    const view = buildKnowledgeView(contextFor(base, turn(1, [])), ['zahira', 'calder'])
    markRevealed(view, 'osric-esta-abajo')

    expect(lintText('Osric está abajo. Bajó anoche.', view, base.pack)).toEqual([])
    expect(lintText('Y fue Brorg.', view, base.pack)).toHaveLength(1)
    expect(secretSubjectPresent(base.pack.secrets.get('brorg-pago-por-zahira')!, ['brorg'])).toBe(true)
    expect(secretSubjectPresent(base.pack.secrets.get('osric-esta-abajo')!, ['calder'])).toBe(false)
  })

  it('sin party no hay receptores y el pack piloto no produce avisos de entidades (no declara NPC)', async () => {
    const { pack, state } = await pilotContext()
    const view = buildKnowledgeView({ pack, state, session: undefined, turn: turn(1, []) }, [])
    expect(view.party).toEqual([])
    expect(lintText('Tomás y Osric esperan en la posada. Osric está abajo.', view, pack)).toEqual([])
  })
})

describe('aviso por entidades no presenciadas', () => {
  async function miniPack() {
    const manifest = {
      id: 'mini', type: 'campaign', version: '0.1.0', name: 'Mini', system: 'fantasy-d20-lite',
      provenance: { class: 'original', authors: ['test'], sources: [], license: 'propietario', createdAt: '2026-09-05', updatedAt: '2026-09-05' },
      characters: ['ana'], npcs: ['bruno', 'celia'], locations: ['pozo'], sessions: ['001'],
    }
    const ana = {
      id: 'ana', name: 'Ana', race: 'Humana', class: 'Exploradora', age: '30 anios', quote: 'Vamos.', bio: 'Camina.',
      stats: { fue: 10, des: 14, con: 12, int: 10, sab: 12, car: 10 }, hp: 10, ac: 12,
      attacks: [{ id: 'daga', name: 'Daga', use: 'des', damage: '1d4', damageType: 'perforante', range: 'cuerpo a cuerpo' }],
      abilities: [], skills: ['Sigilo'], roles: ['Exploracion'], goal: 'Llegar.', portrait: null,
    }
    const npc = (id: string, name: string) => ({ id, name, description: 'Alguien.' })
    const session = { id: '001', title: 'Uno', date: '2026-09-05', status: 'planned', briefing: 'Bruno te espera en la posada.', howToPlay: ['Di que haces.'], fortune: [{ range: '1-20', label: 'Normal' }], party: [{ player: 'P', character: 'ana' }] }
    const { pack } = await loadPack(memorySource({
      'pack.json': JSON.stringify(manifest),
      'characters/ana.json': JSON.stringify(ana),
      'npcs/bruno.json': JSON.stringify(npc('bruno', 'Bruno')),
      'npcs/celia.json': JSON.stringify(npc('celia', 'Celia')),
      'locations/pozo.json': JSON.stringify({ id: 'pozo', name: 'El Pozo Viejo', description: 'Un pozo.', newcomerView: 'Un brocal.' }),
      'sessions/001.json': JSON.stringify(session),
    }))
    return pack!
  }

  it('avisa del NPC y del lugar que la mesa no ha visto; el del briefing y el de un evento presenciado no', async () => {
    const pack = await miniPack()
    const started = CampaignEvent.parse({ id: 'evt-00001', v: 1, seq: 1, type: 'session_started', sessionId: '001', recordedAt: '2026-09-05T00:00:00Z', payload: { party: ['character:ana'] } })
    const state = reduce([started], { pack, ruleset: fantasyD20Lite })
    const ctx = { pack, state, session: pack.sessions.get('001'), turn: { id: 't', number: 1, sessionId: '001', responses: [] }, recentEvents: [started] }
    const view = buildKnowledgeView(ctx, ['ana'])

    const findings = lintText('Bruno te saluda. Celia observa desde El Pozo Viejo, junto a la posada.', view, pack)
    expect(findings.map((f) => [f.level, f.entity, f.marker])).toEqual([
      ['warning', 'npc:celia', 'Celia'],
      ['warning', 'location:pozo', 'El Pozo Viejo'],
    ])
    expect(findings[0]?.message).toBe('nombra a Celia (npc:celia), que la mesa no ha presenciado')

    // Un evento presenciado con Celia como actor la vuelve conocida; el pozo por su ref tambien se detecta.
    const met = CampaignEvent.parse({ id: 'evt-00002', v: 1, seq: 2, type: 'npc_action', sessionId: '001', recordedAt: '2026-09-05T00:00:00Z', actor: 'npc:celia', visibility: { layer: 'campaign', witnesses: ['character:ana'] }, payload: { text: 'Hola.' } })
    const seen = buildKnowledgeView({ ...ctx, recentEvents: [started, met] }, ['ana'])
    expect(lintText('Celia sonríe. El brocal de location:pozo brilla.', seen, pack).map((f) => f.marker)).toEqual(['location:pozo'])

    // Un evento de la capa dm no enseña nada a la mesa.
    const hidden = CampaignEvent.parse({ ...met, id: 'evt-00003', seq: 3, visibility: { layer: 'dm', witnesses: ['character:ana'] } })
    expect(lintText('Celia sonríe.', buildKnowledgeView({ ...ctx, recentEvents: [started, hidden] }, ['ana']), pack)).toHaveLength(1)
  })
})
