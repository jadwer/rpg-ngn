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

describe('relaciones con NPC', () => {
  /** Un `state_change` con el efecto `relationship`, como lo propone el DM. */
  const trato = (delta: number, seq: number): CampaignEvent =>
    ({
      id: `evt-rel-${seq}`,
      v: 1,
      seq,
      type: 'state_change',
      sessionId: '002',
      recordedAt: '2026-09-12T19:00:00Z',
      effects: [{ op: 'relationship', who: 'npc:tomas', with: 'character:calder', delta }],
    }) as unknown as CampaignEvent

  it('se acumulan por NPC y personaje, y no se salen de la escala', async () => {
    const { pack, events } = await loadPilot()
    let state = reduce(events, { pack, ruleset: fantasyD20Lite })
    const seq = state.meta.headSeq

    state = applyEvent(state, trato(2, seq + 1), fantasyD20Lite)
    expect((state.world.npcs['tomas']?.custom['relationships'] as Record<string, number>)['character:calder']).toBe(2)

    state = applyEvent(state, trato(-3, seq + 2), fantasyD20Lite)
    expect((state.world.npcs['tomas']?.custom['relationships'] as Record<string, number>)['character:calder']).toBe(-1)

    // Tope: por mucho que el DM insista, de -5 a 5.
    for (let i = 3; i <= 8; i++) state = applyEvent(state, trato(3, seq + i), fantasyD20Lite)
    expect((state.world.npcs['tomas']?.custom['relationships'] as Record<string, number>)['character:calder']).toBe(5)

    // Y no toca el inventario del NPC ni el resto de su estado.
    expect(state.world.npcs['tomas']?.inventory.map((i) => i.id)).toEqual(['campana-de-bronce'])
  })

  it('un NPC que no existe en el mundo no crea estado de la nada', async () => {
    const { pack, events } = await loadPilot()
    const state = reduce(events, { pack, ruleset: fantasyD20Lite })
    const fantasma = {
      id: 'evt-rel-x',
      v: 1,
      seq: state.meta.headSeq + 1,
      type: 'state_change',
      sessionId: '002',
      recordedAt: '2026-09-12T19:00:00Z',
      effects: [{ op: 'relationship', who: 'npc:nadie', with: 'character:calder', delta: 1 }],
    } as unknown as CampaignEvent
    expect(applyEvent(state, fantasma, fantasyD20Lite).world.npcs['nadie']).toBeUndefined()
  })
})

describe('condiciones de NPC', () => {
  const condicion = (add: string | null, remove: string | null, seq: number): CampaignEvent =>
    ({
      id: `evt-cond-${seq}`,
      v: 1,
      seq,
      type: 'state_change',
      sessionId: '002',
      recordedAt: '2026-09-12T19:00:00Z',
      effects: [{ op: 'condition', who: 'npc:tomas', ...(add ? { add } : {}), ...(remove ? { remove } : {}) }],
    }) as unknown as CampaignEvent

  it('se acumulan sin repetirse y se quitan, sin tocar el resto del NPC', async () => {
    const { pack, events } = await loadPilot()
    let state = reduce(events, { pack, ruleset: fantasyD20Lite })
    const seq = state.meta.headSeq

    state = applyEvent(state, condicion('receloso', null, seq + 1), fantasyD20Lite)
    state = applyEvent(state, condicion('receloso', null, seq + 2), fantasyD20Lite)
    state = applyEvent(state, condicion('agradecido', null, seq + 3), fantasyD20Lite)
    expect(state.world.npcs['tomas']?.custom['conditions']).toEqual(['receloso', 'agradecido'])

    state = applyEvent(state, condicion(null, 'receloso', seq + 4), fantasyD20Lite)
    expect(state.world.npcs['tomas']?.custom['conditions']).toEqual(['agradecido'])
    expect(state.world.npcs['tomas']?.inventory.map((i) => i.id)).toEqual(['campana-de-bronce'])
  })

  it('la condicion sobre un personaje sigue siendo cosa del ruleset', async () => {
    const { pack, events } = await loadPilot()
    const state = reduce(events, { pack, ruleset: fantasyD20Lite })
    const sobrePersonaje = {
      id: 'evt-cond-pj',
      v: 1,
      seq: state.meta.headSeq + 1,
      type: 'state_change',
      sessionId: '002',
      recordedAt: '2026-09-12T19:00:00Z',
      effects: [{ op: 'condition', who: 'character:zahira', add: 'envenenada' }],
    } as unknown as CampaignEvent
    const next = applyEvent(state, sobrePersonaje, fantasyD20Lite)
    expect(next.world.characters['zahira']?.conditions).toContain('envenenada')
  })
})

describe('rumores oidos', () => {
  const rumor = (text: string, seq: number, falso = false): CampaignEvent =>
    ({
      id: `evt-rum-${seq}`,
      v: 1,
      seq,
      type: 'rumor_heard',
      sessionId: '002',
      recordedAt: '2026-09-12T19:00:00Z',
      targets: ['character:zahira'],
      payload: { text, from: 'npc:tomas', ...(falso ? { false: true } : {}) },
    }) as unknown as CampaignEvent

  it('se guardan aparte de los hechos, sin repetirse, y marcan los falsos', async () => {
    const { pack, events } = await loadPilot()
    let state = reduce(events, { pack, ruleset: fantasyD20Lite })
    const seq = state.meta.headSeq
    const factsAntes = Object.keys(state.knowledge['zahira']?.facts ?? {}).length

    state = applyEvent(state, rumor('Osric subió con los bolsillos llenos', seq + 1, true), fantasyD20Lite)
    state = applyEvent(state, rumor('Osric subió con los bolsillos llenos', seq + 2), fantasyD20Lite)
    state = applyEvent(state, rumor('la campana suena sola de noche', seq + 3), fantasyD20Lite)

    const rumores = state.knowledge['zahira']?.rumors ?? []
    expect(rumores.map((r) => r.text)).toEqual(['Osric subió con los bolsillos llenos', 'la campana suena sola de noche'])
    expect(rumores[0]?.false).toBe(true)
    expect(rumores[0]?.from).toBe('npc:tomas')
    // Un rumor NO es un hecho: no entra en lo que el personaje sabe.
    expect(Object.keys(state.knowledge['zahira']?.facts ?? {})).toHaveLength(factsAntes)
    // Pero si queda en la cronica, para que el DM pueda retomarlo.
    expect(state.narrative.log.some((e) => e.text.includes('la campana suena sola'))).toBe(true)
  })
})

describe('progreso de misiones', () => {
  const avance = (seq: number, payload: Record<string, unknown>): CampaignEvent =>
    ({
      id: `evt-q-${seq}`,
      v: 1,
      seq,
      type: 'quest_update',
      sessionId: '002',
      recordedAt: '2026-09-12T19:00:00Z',
      payload: { quest: 'quest:la-campana', ...payload },
    }) as unknown as CampaignEvent

  it('acumula objetivos sin repetir y cierra la mision', async () => {
    const { pack, events } = await loadPilot()
    let state = reduce(events, { pack, ruleset: fantasyD20Lite })
    const seq = state.meta.headSeq
    expect(state.quests).toBeUndefined()

    state = applyEvent(state, avance(seq + 1, { objective: 'encontrar-la-campana', note: 'Estaba en la capilla' }), fantasyD20Lite)
    state = applyEvent(state, avance(seq + 2, { objective: 'encontrar-la-campana' }), fantasyD20Lite)
    expect(state.quests?.['la-campana']?.completed).toEqual(['encontrar-la-campana'])
    expect(state.quests?.['la-campana']?.status).toBe('active')
    expect(state.quests?.['la-campana']?.note).toBe('Estaba en la capilla')

    state = applyEvent(state, avance(seq + 3, { status: 'done' }), fantasyD20Lite)
    expect(state.quests?.['la-campana']?.status).toBe('done')
    // Cerrarla no borra lo conseguido.
    expect(state.quests?.['la-campana']?.completed).toEqual(['encontrar-la-campana'])
  })
})

describe('donde esta cada personaje', () => {
  const mover = (to: string | null, seq: number): CampaignEvent =>
    ({
      id: `evt-mv-${seq}`,
      v: 1,
      seq,
      type: 'state_change',
      sessionId: '002',
      recordedAt: '2026-09-12T19:00:00Z',
      effects: [{ op: 'move', who: 'character:zahira', to }],
    }) as unknown as CampaignEvent

  it('se mueve entre lugares y sale de escena sin tocar el resto de su estado', async () => {
    const { pack, events } = await loadPilot()
    let state = reduce(events, { pack, ruleset: fantasyD20Lite })
    const seq = state.meta.headSeq
    const hpAntes = state.world.characters['zahira']?.hp

    state = applyEvent(state, mover('capilla-de-los-mineros', seq + 1), fantasyD20Lite)
    expect(state.world.characters['zahira']?.location).toBe('capilla-de-los-mineros')

    // Acepta tambien la referencia con prefijo, como la escribe el DM.
    state = applyEvent(state, mover('location:segundo-nivel', seq + 2), fantasyD20Lite)
    expect(state.world.characters['zahira']?.location).toBe('segundo-nivel')

    // null: va de camino o sale de escena.
    state = applyEvent(state, mover(null, seq + 3), fantasyD20Lite)
    expect(state.world.characters['zahira']?.location).toBeNull()
    expect(state.world.characters['zahira']?.hp).toEqual(hpAntes)
  })
})
