import { readFile } from 'node:fs/promises'
import type { CampaignEvent } from '@rpg-ngn/content'
import { fantasyD20Lite } from '@rpg-ngn/rules'
import { describe, expect, it } from 'vitest'
import { loadPilot, pilotSnapshotPath } from './pilot.test-helpers.js'
import { narrativeProjection, playerProjection, worldProjection } from './projections.js'
import { applyEvent, reduce } from './reduce.js'
import { diffSnapshot, serializeSnapshot, takeSnapshot, type Snapshot } from './snapshot.js'

describe('reduce sobre el log real del piloto', () => {
  it('reproduce byte a byte el snapshot canonico de la sesion 002 (BA2)', async () => {
    const { pack, events } = await loadPilot()

    const state = reduce(events, { pack, ruleset: fantasyD20Lite })
    const replay = serializeSnapshot(takeSnapshot(state, '002'))
    const canonical = await readFile(pilotSnapshotPath, 'utf8')

    expect(replay).toBe(canonical)
    expect(diffSnapshot(JSON.parse(canonical) as Snapshot, takeSnapshot(state, '002'))).toEqual([])
  })

  it('el mundo refleja lo que paso en la mesa', async () => {
    const { pack, events } = await loadPilot()
    const state = reduce(events, { pack, ruleset: fantasyD20Lite })
    const world = worldProjection(state)

    expect(world.worldTime).toBe('Valdoria, mañana siguiente')
    expect(world.characters['zahira']?.fortune).toEqual({ result: 6, tier: 'Incómodo' })
    expect(world.characters['zahira']?.memoriesRecovered).toBe(1)
    expect(world.characters['calder']?.inventory.map((i) => i.id)).toEqual(['llave-de-hierro-sin-cerradura'])
    expect(world.npcs['tomas']?.inventory.map((i) => i.id)).toEqual(['campana-de-bronce'])
    expect(world.characters['brorg']?.hp).toEqual({ current: 14, max: 14 })
  })

  it('el conocimiento es por personaje, no por mesa', async () => {
    const { pack, events } = await loadPilot()
    const state = reduce(events, { pack, ruleset: fantasyD20Lite })

    const zahira = playerProjection(state, 'zahira')
    const calder = playerProjection(state, 'calder')

    expect(Object.keys(zahira.knowledge.facts)).toContain('fact:un-medio-orco-la-subio-tocando-la-campana')
    expect(Object.keys(calder.knowledge.facts)).not.toContain('fact:un-medio-orco-la-subio-tocando-la-campana')
    expect(Object.keys(calder.knowledge.facts)).toContain('fact:campana-en-capilla-segundo-nivel')
    expect(zahira.knowledge.facts['fact:alguien-toca-la-campana-abajo']?.confidence).toBe('uncertain')
    expect(playerProjection(state, 'brorg').knowledge.facts).toEqual({})
    expect(() => playerProjection(state, 'nadie')).toThrow(/nadie/)
  })

  it('la sesion queda cerrada con su cliffhanger y la cronica en orden', async () => {
    const { pack, events } = await loadPilot()
    const state = reduce(events, { pack, ruleset: fantasyD20Lite })
    const narrative = narrativeProjection(state)

    expect(state.meta.sessions['002']).toMatchObject({ status: 'closed', startedSeq: 1, closedSeq: 21, party: ['calder', 'narivyl', 'zahira'] })
    expect(narrative.currentSession).toBeNull()
    expect(narrative.lastCliffhanger).toBe('el nombre de Narivyl en la pared de Osric')
    expect(narrative.log.map((e) => e.seq)).toEqual([7, 20])
    expect(state.meta).toMatchObject({ packId: 'pilot', packVersion: '0.4.0', ruleset: 'fantasy-d20-lite@1.0.0', headSeq: 21, headEvent: 'evt-00021' })
  })

  it('el snapshot de una sesion abierta no existe', async () => {
    const { pack, events } = await loadPilot()
    const state = reduce(events.slice(0, 5), { pack, ruleset: fantasyD20Lite })

    expect(() => takeSnapshot(state, '002')).toThrow(/no esta cerrada/)
  })
})

describe('applyEvent', () => {
  const base = (overrides: Record<string, unknown>): CampaignEvent =>
    ({ id: 'evt-00002', v: 1, seq: 2, sessionId: '002', recordedAt: '2026-09-05T00:00:00Z', recordedAtPrecision: 'exact', ...overrides }) as CampaignEvent

  it('rechaza un seq que no sigue al anterior', async () => {
    const { pack, events } = await loadPilot()
    const state = reduce(events.slice(0, 1), { pack, ruleset: fantasyD20Lite })

    expect(() => applyEvent(state, events[2]!, fantasyD20Lite)).toThrow(/seq 3 no sigue a 1/)
  })

  it('rechaza cerrar una sesion que no empezo y una fortuna sin actor', async () => {
    const { pack } = await loadPilot()
    const state = reduce([], { pack, ruleset: fantasyD20Lite })
    const closed = base({ seq: 1, id: 'evt-00001', type: 'session_closed', payload: {} })
    const fortune = base({ seq: 1, id: 'evt-00001', type: 'roll', actor: 'npc:osric', resolved: { kind: 'fortune', die: '1d20', result: 3, source: 'physical' } })

    expect(() => applyEvent(state, closed, fantasyD20Lite)).toThrow(/nunca empezo/)
    expect(() => applyEvent(state, fortune, fantasyD20Lite)).toThrow(/character:/)
  })

  it('testigos, correcciones, narracion y discovery a un target que no es personaje', async () => {
    const { pack, events } = await loadPilot()
    let state = reduce(events.slice(0, 1), { pack, ruleset: fantasyD20Lite })

    state = applyEvent(state, base({ type: 'world_event', payload: { note: 'algo' }, visibility: { layer: 'campaign', witnesses: ['character:calder', 'npc:osric'] } }), fantasyD20Lite)
    expect(state.knowledge['calder']?.witnessed).toEqual(['evt-00002'])

    state = applyEvent(state, base({ seq: 3, id: 'evt-00003', type: 'narration', payload: { text: 'Llueve.' } }), fantasyD20Lite)
    state = applyEvent(state, base({ seq: 4, id: 'evt-00004', type: 'scene_started' }), fantasyD20Lite)
    expect(state.narrative.log.map((e) => e.text)).toEqual(['algo', 'Llueve.', ''])

    state = applyEvent(state, base({ seq: 5, id: 'evt-00005', type: 'correction', payload: { corrects: 'evt-00002', reason: 'anotado mal', patch: {} } }), fantasyD20Lite)
    expect(state.narrative.corrections).toEqual([{ seq: 5, event: 'evt-00005', corrects: 'evt-00002', reason: 'anotado mal' }])

    state = applyEvent(state, base({ seq: 6, id: 'evt-00006', type: 'discovery', targets: ['npc:osric'], payload: { fact: 'fact:x', confidence: 'known', method: 'm' } }), fantasyD20Lite)
    expect(Object.values(state.knowledge).some((k) => 'fact:x' in k.facts)).toBe(false)

    const before = state
    state = applyEvent(state, base({ seq: 7, id: 'evt-00007', type: 'roll', actor: 'character:calder', resolved: { kind: 'skill', die: '1d20', result: 9, source: 'physical' } }), fantasyD20Lite)
    expect(state.world).toBe(before.world)
  })
})

describe('diffSnapshot', () => {
  it('lista las rutas que difieren', async () => {
    const { pack, events } = await loadPilot()
    const state = reduce(events, { pack, ruleset: fantasyD20Lite })
    const canonical = takeSnapshot(state, '002')
    const tampered: Snapshot = JSON.parse(serializeSnapshot(canonical)) as Snapshot
    tampered.state.world.characters['zahira']!.memoriesRecovered = 0
    tampered.state.narrative.log = []

    const divergences = diffSnapshot(canonical, tampered)

    expect(divergences.map((d) => d.path)).toEqual(['state.narrative.log', 'state.world.characters.zahira.memoriesRecovered'])
  })
})
