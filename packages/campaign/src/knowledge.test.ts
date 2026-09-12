import { CampaignEvent, type Secret } from '@rpg-ngn/content'
import { fantasyD20Lite } from '@rpg-ngn/rules'
import { describe, expect, it } from 'vitest'
import { fold, matchesRevealWhen, revealedSecrets, revealsOf, secretsKnownBy, visibleTo } from './knowledge.js'
import { loadPilot } from './pilot.test-helpers.js'
import { applyEvent, reduce } from './reduce.js'

const event = (overrides: Record<string, unknown>): CampaignEvent =>
  CampaignEvent.parse({ id: 'evt-00030', v: 1, seq: 30, sessionId: '002', recordedAt: '2026-09-05T00:00:00Z', ...overrides })

describe('proyeccion de secretos sobre el log del piloto', () => {
  it('la confesion de Osric queda revelada a Calder y Narivyl por el discovery de la campana, y Brorg sigue en secreto', async () => {
    const { pack, events } = await loadPilot()
    const state = reduce(events, { pack, ruleset: fantasyD20Lite })

    expect(revealedSecrets(state, 'calder')).toEqual(['osric-subio-solo'])
    expect(revealedSecrets(state, 'narivyl')).toEqual(['osric-subio-solo'])
    expect(revealedSecrets(state, 'zahira')).toEqual([])
    expect(state.knowledge['calder']?.secrets?.['osric-subio-solo']).toEqual({ event: 'evt-00003', seq: 3, how: 'revealWhen' })
    expect(state.knowledge['brorg']?.secrets).toBeUndefined()

    const known = secretsKnownBy(state, ['zahira', 'calder'])
    expect([...(known.get('osric-subio-solo') ?? [])]).toEqual(['calder'])
    expect(known.has('brorg-pago-por-zahira')).toBe(false)
  })

  it('secret_revealed revela a sus testigos y no se duplica', async () => {
    const { pack, events } = await loadPilot()
    const secrets = [...pack.secrets.values()]
    let state = reduce(events.slice(0, 2), { pack, ruleset: fantasyD20Lite })

    state = applyEvent(state, event({ id: 'evt-00003', seq: 3, type: 'secret_revealed', visibility: { layer: 'campaign', witnesses: ['character:zahira', 'npc:tomas'] }, payload: { secretId: 'brorg-pago-por-zahira', how: 'Brorg se lo dijo' } }), fantasyD20Lite, secrets)
    expect(state.knowledge['zahira']?.secrets).toEqual({ 'brorg-pago-por-zahira': { event: 'evt-00003', seq: 3, how: 'secret_revealed' } })
    expect(state.knowledge['calder']?.secrets).toBeUndefined()

    state = applyEvent(state, event({ id: 'evt-00004', seq: 4, type: 'secret_revealed', visibility: { layer: 'campaign', witnesses: ['character:zahira'] }, payload: { secretId: 'brorg-pago-por-zahira' } }), fantasyD20Lite, secrets)
    expect(state.knowledge['zahira']?.secrets?.['brorg-pago-por-zahira']?.event).toBe('evt-00003')
  })

  it('sin secretos en el reductor, el estado no cambia de forma', async () => {
    const { pack, events } = await loadPilot()
    const state = events.reduce((s, e) => applyEvent(s, e, fantasyD20Lite), reduce([], { pack, ruleset: fantasyD20Lite }))
    expect(Object.values(state.knowledge).every((k) => k.secrets === undefined)).toBe(true)
  })
})

describe('visibleTo', () => {
  it('testigos, destinatarios de discovery y knowledgeGranted; la capa dm no es visible para nadie', async () => {
    const { pack, events } = await loadPilot()
    const state = reduce(events, { pack, ruleset: fantasyD20Lite })

    expect(visibleTo(event({ type: 'narration', visibility: { layer: 'campaign', witnesses: ['character:zahira', 'npc:tomas'] } }), state)).toEqual(['zahira'])
    expect(visibleTo(event({ type: 'discovery', targets: ['character:calder'], payload: { fact: 'fact:x', confidence: 'known', method: 'm' } }), state)).toEqual(['calder'])
    expect(visibleTo(event({ type: 'world_event', payload: { note: 'n' }, knowledgeGranted: [{ to: 'character:narivyl', fact: 'fact:x', confidence: 'known' }] }), state)).toEqual(['narivyl'])
    expect(visibleTo(event({ type: 'narration', visibility: { layer: 'dm', witnesses: ['character:zahira'] } }), state)).toEqual([])
    // Sin testigos ni capa: lo oyo la party de la sesion.
    expect(visibleTo(event({ type: 'world_event', payload: { note: 'n' } }), state)).toEqual(['calder', 'narivyl', 'zahira'])
    expect(visibleTo(event({ type: 'world_event', sessionId: '003', payload: { note: 'n' } }), state)).toEqual([])
  })
})

describe('matchesRevealWhen', () => {
  const base: Secret = { id: 's', about: 'npc:osric', text: 't', keywords: ['k'], revealWhen: { manual: true } }
  const npcAction = event({ type: 'npc_action', actor: 'npc:osric', targets: ['character:calder'], payload: { text: 'Subí solo, muchacho.' } })

  it('compara tipo, fact, actor, target y texto sin acentos; manual nunca coincide solo', () => {
    expect(matchesRevealWhen(base, npcAction)).toBe(false)
    expect(matchesRevealWhen({ ...base, revealWhen: { event: 'npc_action' } }, npcAction)).toBe(true)
    expect(matchesRevealWhen({ ...base, revealWhen: { event: 'npc_action', actor: 'npc:osric', target: 'character:calder', match: 'SUBI SOLO' } }, npcAction)).toBe(true)
    expect(matchesRevealWhen({ ...base, revealWhen: { event: 'npc_action', actor: 'npc:tomas' } }, npcAction)).toBe(false)
    expect(matchesRevealWhen({ ...base, revealWhen: { event: 'npc_action', target: 'character:zahira' } }, npcAction)).toBe(false)
    expect(matchesRevealWhen({ ...base, revealWhen: { event: 'npc_action', match: 'otra cosa' } }, npcAction)).toBe(false)
    expect(matchesRevealWhen({ ...base, revealWhen: { event: 'discovery', fact: 'fact:x' } }, npcAction)).toBe(false)
    expect(matchesRevealWhen({ ...base, revealWhen: { event: 'player_action', fact: 'fact:x' } }, event({ type: 'player_action', declared: 'x' }))).toBe(false)
    expect(fold('Subió SOLO, ¿verdad?')).toBe('subio solo, ¿verdad?')
  })

  it('revealsOf ignora eventos que nadie presencio', async () => {
    const { pack, events } = await loadPilot()
    const state = reduce(events, { pack, ruleset: fantasyD20Lite })
    const secret: Secret = { ...base, revealWhen: { event: 'narration' } }
    expect(revealsOf(event({ type: 'narration', sessionId: '003', payload: { text: 'x' } }), [secret], state)).toEqual([])
    expect(revealsOf(event({ type: 'narration', payload: { text: 'x' } }), [secret], state)).toEqual([{ secretId: 's', to: ['calder', 'narivyl', 'zahira'], how: 'revealWhen' }])
  })
})
