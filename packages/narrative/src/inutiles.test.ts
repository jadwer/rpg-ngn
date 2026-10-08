import { applyEvent, initialState } from '@rpg-ngn/campaign'
import { CampaignEvent, type LoadedPack } from '@rpg-ngn/content'
import { fantasyD20Lite } from '@rpg-ngn/rules'
import { describe, expect, it } from 'vitest'
import { buildPlayerContext, buildTurnContext } from './context.js'
import { ModelGMProvider } from './model-gm.js'
import { collect, contextFor, diagnosticsOf, FakeTransport, openSession003, response, turn } from './pilot.test-helpers.js'

/**
 * Lo que pide el primer mundo inspirado ("Benditos sean los inutiles", 08-10):
 * la gracia de cada personaje, el tono del mundo y la deuda de la party.
 */

const KEY = 'sk-test-inutiles-00000000'

async function comedy(): Promise<Awaited<ReturnType<typeof openSession003>>> {
  const base = await openSession003()
  const characters = new Map(base.pack.characters)
  characters.set('zahira', { ...characters.get('zahira')!, quirk: 'Gasta lo que no tiene y llora cuando se lo reclaman.' })
  const pack: LoadedPack = { ...base.pack, characters, manifest: { ...base.pack.manifest, tone: 'Comedia: el plan falla por alguien de la party.', debt: { start: 30, note: 'la posada' } } }
  return { ...base, pack, state: { ...base.state, world: { ...base.state.world, partyDebt: 30 } } }
}

describe('Benditos sean los inutiles: gracia, tono y deuda', () => {
  it('la gracia va a la ficha del GM y no a la del jugador; el tono va al prefijo fijo', async () => {
    const base = await comedy()
    const ctx = contextFor(base, turn(2, [response('zahira', 'Miro.')]))
    const built = buildTurnContext(ctx)
    expect(built.fixed).toContain('Gracia (provócala una vez por sesión')
    expect(built.fixed).toContain('Gasta lo que no tiene')
    expect(built.fixed).toContain('Tono de este mundo (manda sobre tu estilo por omisión): Comedia')
    expect(buildPlayerContext(ctx, 'zahira')).not.toContain('Gasta lo que no tiene')
  })

  it('la deuda empieza donde dice el mundo, el GM la mueve con debt y nunca baja de cero', async () => {
    const base = await comedy()
    expect(initialState({ pack: base.pack, ruleset: fantasyD20Lite }).world.partyDebt).toBe(30)

    const ctx = contextFor(base, turn(2, [response('zahira', 'Pago.')]))
    expect(buildTurnContext(ctx).user).toContain('Deuda de la party: 30 monedas.')
    expect(buildTurnContext(ctx).fixed).toContain('"op":"debt"')

    const lines = ['{"kind":"narration","text":"Casimiro apunta otra multa."}', '{"kind":"state_change","effects":[{"op":"debt","delta":12}]}', '{"kind":"addressed","characterIds":["zahira"]}'].join('\n')
    const outputs = await collect(new ModelGMProvider(new FakeTransport(lines), KEY).narrate(ctx))
    expect(diagnosticsOf(outputs).ignoredCount).toBe(0)
    const proposed = outputs.flatMap((o) => (o.kind === 'event' && o.event['type'] === 'state_change' ? [o.event] : []))
    expect(proposed).toHaveLength(1)

    const seal = (seq: number, event: Record<string, unknown>) => CampaignEvent.parse({ ...event, id: `evt-${String(seq).padStart(5, '0')}`, v: 1, seq, sessionId: '003', recordedAt: '2026-10-08T10:00:00Z' })
    let state = applyEvent(base.state, seal(base.state.meta.headSeq + 1, proposed[0]!), fantasyD20Lite)
    expect(state.world.partyDebt).toBe(42)
    state = applyEvent(state, seal(state.meta.headSeq + 1, { type: 'state_change', effects: [{ op: 'debt', delta: -100 }] }), fantasyD20Lite)
    expect(state.world.partyDebt).toBe(0)
  })

  it('en mesa de uno, los compañeros que nadie juega llegan al GM con su ficha corta; los que juega alguien, no se repiten', async () => {
    const base = await comedy()
    const sessions = new Map(base.pack.sessions)
    sessions.set('003', { ...sessions.get('003')!, companions: ['brorg', 'zahira', 'no-existe'] })
    const pack = { ...base.pack, sessions }
    const ctx = contextFor({ ...base, pack }, turn(2, [response('zahira', 'Miro.')]), { session: sessions.get('003') })
    const fixed = buildTurnContext(ctx).fixed
    const calder = pack.characters.get('brorg')!
    expect(fixed).toContain('# Compañeros que lleva el GM')
    expect(fixed).toContain(`- ${calder.name}: ${calder.race}, ${calder.class}`)
    // Zahira juega en esta mesa: va en la party, no como compañera.
    expect(fixed.split('# Compañeros que lleva el GM')[1]).not.toContain('Zahira:')
  })

  it('sin deuda declarada el mundo no la menciona', async () => {
    const base = await openSession003()
    const built = buildTurnContext(contextFor(base, turn(2, [response('zahira', 'Miro.')])))
    expect(built.user).not.toContain('Deuda de la party')
    expect(built.user).not.toContain('"op":"debt"')
  })
})
