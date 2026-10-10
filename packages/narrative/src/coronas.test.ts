import { applyEvent } from '@rpg-ngn/campaign'
import { CampaignEvent, type LoadedPack } from '@rpg-ngn/content'
import { fantasyD20Lite } from '@rpg-ngn/rules'
import { describe, expect, it } from 'vitest'
import { buildTurnContext } from './context.js'
import { ModelGMProvider } from './model-gm.js'
import { collect, contextFor, diagnosticsOf, FakeTransport, openSession003, response, turn } from './pilot.test-helpers.js'

/** Las Siete Coronas (10-10): el golpe elemental sale con su elemento y su daño tirados por el motor. */

const KEY = 'sk-test-coronas-000000000'

async function arena() {
  const base = await openSession003()
  const characters = new Map(base.pack.characters)
  const zahira = characters.get('zahira')!
  characters.set('zahira', { ...zahira, attacks: [{ id: 'ola', name: 'Ola', use: 'sab', damage: '2d6', damageType: 'agua', range: 'corta' }, ...zahira.attacks] })
  const npcs = new Map(base.pack.npcs)
  const [first] = [...npcs.values()]
  npcs.set(first!.id, { ...first!, combat: { hp: 40, element: 'roca' } })
  const pack: LoadedPack = { ...base.pack, characters, npcs, manifest: { ...base.pack.manifest, elements: true } }
  return { base: { ...base, pack }, foe: first!.id }
}

describe('combate por elementos', () => {
  it('el GM registra quien golpea a quien con que ataque; el motor pone elemento, daño y la vida del enemigo', async () => {
    const { base, foe } = await arena()
    const ctx = contextFor(base, turn(2, [response('zahira', 'Le lanzo una ola.')]))
    expect(buildTurnContext(ctx).fixed).toContain('Combate por elementos (este mundo)')
    expect(buildTurnContext(ctx).fixed).toContain('Enemigo: 40 de vida, de roca.')
    const lines = ['{"kind":"narration","text":"El agua golpea al enemigo."}', `{"kind":"state_change","effects":[{"op":"elemental","who":"character:zahira","target":"npc:${foe}","attack":"ola"}]}`, '{"kind":"addressed","characterIds":["zahira"]}'].join('\n')
    const outputs = await collect(new ModelGMProvider(new FakeTransport(lines), KEY, { random: { nextInt: () => 3, describe: () => 'fijo' } }).narrate(ctx))
    expect(diagnosticsOf(outputs).ignoredCount).toBe(0)
    const event = outputs.find((o) => o.kind === 'event' && o.event['type'] === 'state_change')
    const effect = (event as { event: { effects: Array<Record<string, unknown>> } }).event.effects[0]!
    expect(effect).toMatchObject({ op: 'elemental', element: 'agua', damage: 8, targetMax: 40 })

    const sealed = CampaignEvent.parse({ ...(event as { event: object }).event, id: 'evt-00099', v: 1, seq: base.state.meta.headSeq + 1, sessionId: '003', recordedAt: '2026-10-10T10:00:00Z' })
    const state = applyEvent(base.state, sealed, fantasyD20Lite)
    expect(state.world.npcs[foe]?.custom).toMatchObject({ hp: 32, hpMax: 40, aura: 'agua' })
    expect(buildTurnContext(contextFor({ ...base, state }, turn(3, []))).user).toContain('32 de 40 de vida, aura de agua')
  })

  it('un ataque sin elemento o un blanco sin vida no se registra', async () => {
    const { base, foe } = await arena()
    const ctx = contextFor(base, turn(2, [response('zahira', 'Ataco.')]))
    const plainAttack = base.pack.characters.get('zahira')!.attacks.find((a) => a.id !== 'ola')!.id
    const lines = [`{"kind":"state_change","effects":[{"op":"elemental","who":"character:zahira","target":"npc:${foe}","attack":"${plainAttack}"}]}`, '{"kind":"narration","text":"Nada."}'].join('\n')
    const outputs = await collect(new ModelGMProvider(new FakeTransport(lines), KEY).narrate(ctx))
    expect(outputs.some((o) => o.kind === 'event' && o.event['type'] === 'state_change')).toBe(false)
  })
})
