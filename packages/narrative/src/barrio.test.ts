import { applyEvent, initialState, type CampaignState } from '@rpg-ngn/campaign'
import { CampaignEvent, type LoadedPack } from '@rpg-ngn/content'
import { fantasyD20Lite } from '@rpg-ngn/rules'
import { describe, expect, it } from 'vitest'
import { buildTurnContext } from './context.js'
import { ModelGMProvider } from './model-gm.js'
import { collect, contextFor, diagnosticsOf, FakeTransport, openSession003, response, turn } from './pilot.test-helpers.js'

/** Vuelta al barrio (10-10): calor de la banda y respeto de cada uno en un mundo de calle. */

const KEY = 'sk-test-barrio-0000000000'
const seal = (seq: number, event: Record<string, unknown>) => CampaignEvent.parse({ ...event, id: `evt-${String(seq).padStart(5, '0')}`, v: 1, seq, sessionId: '003', recordedAt: '2026-10-10T10:00:00Z' })

describe('mundo de calle: calor y respeto', () => {
  it('el calor empieza en cero, el GM lo sube y lo baja entre 0 y 6, y el respeto va de 0 a 10 por personaje', async () => {
    const base = await openSession003()
    const pack: LoadedPack = { ...base.pack, manifest: { ...base.pack.manifest, street: { heat: true, respect: true } } }
    expect(initialState({ pack, ruleset: fantasyD20Lite }).world.heat).toBe(0)
    const state0: CampaignState = { ...base.state, world: { ...base.state.world, heat: 0 } }
    const ctx = contextFor({ ...base, pack, state: state0 }, turn(2, [response('zahira', 'Me robo el coche frente al Oxxo.')]))
    expect(buildTurnContext(ctx).fixed).toContain('Calor y respeto (este mundo es de calle)')
    expect(buildTurnContext(ctx).user).toContain('Calor de la banda: 0 de 6. Nadie los busca.')

    const lines = ['{"kind":"narration","text":"Arrancas el coche y suena la alarma."}', '{"kind":"state_change","effects":[{"op":"heat","delta":2}]}', '{"kind":"state_change","effects":[{"op":"respect","who":"character:zahira","delta":1}]}', '{"kind":"addressed","characterIds":["zahira"]}'].join('\n')
    const outputs = await collect(new ModelGMProvider(new FakeTransport(lines), KEY).narrate(ctx))
    expect(diagnosticsOf(outputs).ignoredCount).toBe(0)
    let state = state0
    for (const o of outputs) if (o.kind === 'event' && o.event['type'] === 'state_change') state = applyEvent(state, seal(state.meta.headSeq + 1, o.event), fantasyD20Lite)
    expect(state.world.heat).toBe(2)
    expect(state.world.characters['zahira']?.custom['respect']).toBe(1)
    state = applyEvent(state, seal(state.meta.headSeq + 1, { type: 'state_change', effects: [{ op: 'heat', delta: 10 }] }), fantasyD20Lite)
    expect(state.world.heat).toBe(6)
    state = applyEvent(state, seal(state.meta.headSeq + 1, { type: 'state_change', effects: [{ op: 'heat', delta: -9 }] }), fantasyD20Lite)
    expect(state.world.heat).toBe(0)
    expect(buildTurnContext(contextFor({ ...base, pack, state }, turn(3, []))).user).toContain('Respeto en el barrio (0 a 10): Zahira 1.')
  })

  it('un mundo que no es de calle no habla de calor', async () => {
    const base = await openSession003()
    expect(buildTurnContext(contextFor(base, turn(2, []))).user).not.toContain('Calor')
  })
})
