import { describe, expect, it } from 'vitest'
import { buildPlayerContext, buildTurnContext } from './context.js'
import { buildKnowledgeView } from './lint.js'
import { isModelNote } from './model-gm.js'
import { ModelGMProvider } from './model-gm.js'
import { collect, contextFor, FakeTransport, openSession003, response, turn } from './pilot.test-helpers.js'

/**
 * Turno de noche en la Persefone (08-10), pieza 8.1: en una mesa de acciones
 * privadas lo que escribe cada jugador lo lee el GM y el, no la mesa.
 */

const KEY = 'sk-test-persefone-00000000'

describe('acciones privadas', () => {
  const answers = () => [response('zahira', 'Voy a Eléctrico y saboteo las luces.'), response('calder', 'Reviso las cámaras en Seguridad.')]

  it('cada declaracion sale solo para quien la escribio, y su evento en la capa del jugador', async () => {
    const base = await openSession003()
    const ctx = contextFor(base, turn(2, answers()), { notes: { privateActions: true } })
    const outputs = await collect(new ModelGMProvider(new FakeTransport('{"kind":"narration","text":"Las luces parpadean."}\n{"kind":"addressed","characterIds":["zahira","calder"]}'), KEY).narrate(ctx))
    const declared = outputs.flatMap((o) => (o.kind === 'block' && o.block.type === 'dialogue' && o.block.declared ? [o.block] : []))
    expect(declared.map((b) => [b.text, b.to])).toEqual([
      ['Voy a Eléctrico y saboteo las luces.', ['zahira']],
      ['Reviso las cámaras en Seguridad.', ['calder']],
    ])
    const actions = outputs.flatMap((o) => (o.kind === 'event' && o.event['type'] === 'player_action' ? [o.event['visibility']] : []))
    expect(actions).toEqual([{ layer: 'player', witnesses: ['character:zahira'] }, { layer: 'player', witnesses: ['character:calder'] }])
  })

  it('el GM sabe que son privadas; las ideas de un jugador no ven lo que escribio otro; el lint no lo da por oido', async () => {
    const base = await openSession003()
    const ctx = contextFor(base, turn(2, answers()), { notes: { privateActions: true } })
    expect(buildTurnContext(ctx).user).toContain('# Acciones privadas')
    // El GM si recibe las dos.
    expect(buildTurnContext(ctx).user).toContain('saboteo las luces')
    const forCalder = buildPlayerContext(ctx, 'calder')
    expect(forCalder).toContain('Reviso las cámaras')
    expect(forCalder).not.toContain('saboteo las luces')
    expect(buildKnowledgeView(ctx, ['zahira', 'calder']).heard).not.toContain('saboteo')
  })

  it('las ideas de una partida de roles ocultos ven la vista de su jugador, nunca la del GM; el modelo corrigiendose no llega a la mesa', async () => {
    const base = await openSession003()
    const ctx = contextFor(base, turn(2, answers()), { notes: { privateActions: true }, deduction: { phase: 'accion', view: 'SOLO PARA EL GM: Brorg es el Huésped', players: { calder: '# Tu partida\n\nEres tripulante.' } } })
    const forCalder = buildPlayerContext(ctx, 'calder')
    expect(forCalder).toContain('Eres tripulante.')
    expect(forCalder).not.toContain('SOLO PARA EL GM')
    expect(buildTurnContext(ctx).user).toContain('SOLO PARA EL GM')
    expect(isModelNote('Espera, tengo que corregir: el contexto dice que es reunión.')).toBe(true)
    expect(isModelNote('Reviso: según el contexto dice que nadie se mueve.')).toBe(true)
    expect(isModelNote('Espera un momento en la puerta, sin moverse.')).toBe(false)
  })

  it('sin el ajuste, todo sigue publico como siempre; el mundo puede pedirlo y la mesa apagarlo', async () => {
    const base = await openSession003()
    const plain = await collect(new ModelGMProvider(new FakeTransport('{"kind":"narration","text":"Nada."}'), KEY).narrate(contextFor(base, turn(2, answers()))))
    expect(plain.some((o) => o.kind === 'block' && o.block.type === 'dialogue' && o.block.declared && o.block.to)).toBe(false)
    expect(buildTurnContext(contextFor(base, turn(2, answers()))).user).not.toContain('# Acciones privadas')

    const secretWorld = { ...base, pack: { ...base.pack, manifest: { ...base.pack.manifest, privateActions: true } } }
    expect(buildTurnContext(contextFor(secretWorld, turn(2, answers()))).user).toContain('# Acciones privadas')
    expect(buildTurnContext(contextFor(secretWorld, turn(2, answers()), { notes: { privateActions: false } })).user).not.toContain('# Acciones privadas')
  })
})
