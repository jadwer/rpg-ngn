import { applyEvent } from '@rpg-ngn/campaign'
import { CampaignEvent } from '@rpg-ngn/content'
import { fantasyD20Lite } from '@rpg-ngn/rules'
import { describe, expect, it } from 'vitest'
import { buildPlayerContext, buildTurnContext, rollAllowance } from './context.js'
import { ModelGMProvider, normalizeRecord, repairJson, salvageStory, type ModelPrompt, type ModelReply, type ModelTransport } from './model-gm.js'
import { clockLayer, storyClock } from './pacing.js'
import { systemPromptFor } from './prompt.js'
import { collect, contextFor, diagnosticsOf, FakeTransport, openSession003, response, turn } from './pilot.test-helpers.js'
import type { GMOutput, GMProbe } from './provider.js'

/**
 * Lo que salio de leer completas las mesas 43 y 44 (docs/27). Cada prueba
 * lleva el fallo de produccion que la motivo; la mayoria se reprodujo aqui
 * antes de corregirse.
 */
const KEY = 'sk-test-docs27-0000000000'

const blocksOf = (outputs: GMOutput[]) => outputs.flatMap((o) => (o.kind === 'block' ? [o.block] : []))
const storyOf = (outputs: GMOutput[]) => blocksOf(outputs).flatMap((b) => (b.type === 'narration' || b.type === 'dialogue' ? [b.text] : []))

/** Responde una cosa al director y otra a la llamada de ideas, y guarda lo que le preguntaron. */
class Scripted implements ModelTransport {
  readonly kind = 'fake'
  prompts: ModelPrompt[] = []
  constructor(
    readonly model: string,
    private readonly answer: (prompt: ModelPrompt) => string,
  ) {}
  async *stream(prompt: ModelPrompt): AsyncGenerator<string, ModelReply, undefined> {
    this.prompts.push(prompt)
    yield this.answer(prompt)
    return { finish: 'stop', inputTokens: 100, outputTokens: 20 }
  }
  async probe(): Promise<GMProbe> {
    return { ok: true, model: this.model, message: 'ok' }
  }
}

describe('F1: lo que el jugador escribe junto al dado llega al GM', () => {
  const rolled = (text: string) => ({ ...response('zahira', text), roll: { die: '1d20', result: 12, rolls: [12], kind: 'social' as const, skill: 'Ingenio' } })

  it('el texto que sigue a la linea de la tirada va en el turno', async () => {
    // Mesa 44: "Le explico que ... mañana tengo un examen, que me haga paro" nunca llego al modelo.
    const base = await openSession003()
    const built = buildTurnContext(contextFor(base, turn(3, [rolled('Tiro 1d20 (Ingenio): 12\nLe digo que mañana tengo examen, que me haga paro')]), { dice: 'dice' }))
    expect(built.user).toContain('tiró 1d20 (Ingenio) cuando se lo pediste: 12.')
    expect(built.user).toContain('Junto al dado escribió: "Le digo que mañana tengo examen, que me haga paro"')
  })

  it('sin texto, se le dice al GM que no le invente palabras al jugador', async () => {
    const base = await openSession003()
    const built = buildTurnContext(contextFor(base, turn(3, [rolled('Tiro 1d20 (Ingenio): 12')]), { dice: 'dice' }))
    expect(built.user).not.toContain('Junto al dado escribió')
    expect(built.user).toContain('sin ponerle palabras ni decisiones nuevas')
  })
})

describe('F2: una linea rota no daña a las demas', () => {
  it('una llave de menos se repara y el resto del turno llega (mesa 44, sesion 003, turno 5)', async () => {
    const base = await openSession003()
    const lines = [
      '{"kind":"block","block":{"type":"narration","text":"Ignacio se rasca la nuca."}}',
      // Le falta una llave de cierre: antes se tragaba todo lo que venia detras.
      '{"kind":"block","block":{"type":"dialogue","speaker":"Ignacio","speakerRef":null,"text":"Oí que buscaban a un muchacho."}',
      '{"kind":"block","block":{"type":"narration","text":"La patrulla apaga la sirena."}}',
      '{"kind":"where","location":"posada"}',
      '{"kind":"suggest","characterId":"zahira","options":["Cierro la puerta","Salgo a la calle"]}',
      '{"kind":"addressed","characterIds":["zahira"]}',
    ].join('\n')
    const outputs = await collect(new ModelGMProvider(new FakeTransport(lines), KEY).narrate(contextFor(base, turn(2, [response('zahira', 'Pregunto.')]))))
    expect(storyOf(outputs)).toEqual(['Pregunto.', 'Ignacio se rasca la nuca.', 'Oí que buscaban a un muchacho.', 'La patrulla apaga la sirena.'])
    expect(outputs.find((o) => o.kind === 'suggestions')).toEqual({ kind: 'suggestions', byCharacter: { zahira: ['Cierro la puerta', 'Salgo a la calle'] } })
    expect(outputs.find((o) => o.kind === 'addressed')).toEqual({ kind: 'addressed', characterIds: ['zahira'] })
    expect(diagnosticsOf(outputs)).toMatchObject({ ignoredCount: 0, lostStory: 0, repaired: [expect.stringContaining('Ignacio')] })
  })

  it('comillas sin escapar dentro del texto: el parrafo se rescata', async () => {
    const base = await openSession003()
    const lines = ['{"kind":"narration","text":"El cartel dice "cerrado" y nadie contesta."}', '{"kind":"narration","text":"Detrás, una luz."}'].join('\n')
    const outputs = await collect(new ModelGMProvider(new FakeTransport(lines), KEY).narrate(contextFor(base, turn(2, [response('zahira', 'Miro.')]))))
    expect(storyOf(outputs)).toEqual(['Miro.', 'El cartel dice "cerrado" y nadie contesta.', 'Detrás, una luz.'])
    expect(diagnosticsOf(outputs).lostStory).toBe(0)
  })

  it('un salto de linea en mitad de un texto no parte el parrafo', async () => {
    const base = await openSession003()
    const lines = ['{"kind":"narration","text":"Primera frase.', 'Segunda frase."}', '{"kind":"addressed","characterIds":["calder"]}'].join('\n')
    const outputs = await collect(new ModelGMProvider(new FakeTransport(lines), KEY).narrate(contextFor(base, turn(2, [response('zahira', 'Miro.')]))))
    expect(storyOf(outputs)[1]).toMatch(/^Primera frase\.\s+Segunda frase\.$/)
    expect(outputs.find((o) => o.kind === 'addressed')).toEqual({ kind: 'addressed', characterIds: ['calder'] })
  })

  it('una linea rota de verdad se reporta con SU texto, no con la ultima del turno', async () => {
    const base = await openSession003()
    const lines = ['{"kind":"narration","text":"Todo en orden."}', '{"kind":"state_change","effects":[{"op":"hp","who":', '{"kind":"addressed","characterIds":["zahira"]}'].join('\n')
    const outputs = await collect(new ModelGMProvider(new FakeTransport(lines), KEY).narrate(contextFor(base, turn(2, [response('zahira', 'Miro.')]))))
    const diagnostics = diagnosticsOf(outputs)
    expect(diagnostics.ignoredCount).toBe(1)
    expect(diagnostics.ignored[0]).toContain('"op":"hp"')
    expect(diagnostics.ignored[0]).not.toContain('addressed')
    expect(outputs.find((o) => o.kind === 'addressed')).toEqual({ kind: 'addressed', characterIds: ['zahira'] })
  })

  it('repairJson y salvageStory, sueltos', () => {
    expect(repairJson('{"kind":"narration","text":"hola"')).toEqual({ kind: 'narration', text: 'hola' })
    expect(repairJson('{"kind":"narration","text":"hola"}')).toBeUndefined()
    expect(salvageStory('{"kind":"dialogue","speaker":"Bren","speakerRef":"npc:bren","text":"Dije "alto"."}')).toEqual({ type: 'dialogue', speaker: 'Bren', speakerRef: 'npc:bren', text: 'Dije "alto".' })
    // Un evento roto no es historia: no se rescata.
    expect(salvageStory('{"kind":"world_event","payload":{"note":"algo "roto""}}')).toBeNull()
  })
})

describe('formato plano: el que el modelo escribe solo', () => {
  it('todas las formas de decir lo mismo se reducen a tres', () => {
    const flat = normalizeRecord({ kind: 'narration', text: 'x' })
    expect(flat).toEqual({ kind: 'block', raw: { type: 'narration', text: 'x' } })
    expect(normalizeRecord({ kind: 'block', block: { type: 'narration', text: 'x' } })).toEqual({ kind: 'block', raw: { type: 'narration', text: 'x' } })
    expect(normalizeRecord({ kind: 'narration', block: { type: 'narration', text: 'x' } })).toEqual({ kind: 'block', raw: { type: 'narration', text: 'x' } })
    expect(normalizeRecord({ type: 'dialogue', speaker: 'Bren', text: 'x' })?.kind).toBe('block')
    const event = { type: 'npc_action', actor: 'npc:tomas', payload: { text: 'Cierra' } }
    expect(normalizeRecord({ kind: 'npc_action', actor: 'npc:tomas', payload: { text: 'Cierra' } })).toEqual({ kind: 'event', raw: event })
    expect(normalizeRecord({ kind: 'event', event })).toEqual({ kind: 'event', raw: event })
    expect(normalizeRecord({ kind: 'roll', event })).toEqual({ kind: 'event', raw: event })
    expect(normalizeRecord(event)).toEqual({ kind: 'event', raw: event })
    expect(normalizeRecord({ kind: 'addressed', characterIds: ['zahira'] })?.kind).toBe('line')
    expect(normalizeRecord({ kind: 'addressed' })).toBeNull()
    expect(normalizeRecord('texto')).toBeNull()
  })

  it('un turno entero en formato plano se narra y se registra sin nada ignorado', async () => {
    const base = await openSession003()
    const lines = [
      '{"kind":"narration","text":"Tomás baja la vista."}',
      '{"kind":"dialogue","speaker":"Tomás","speakerRef":"npc:tomas","text":"No sé nada de eso."}',
      '{"kind":"npc_action","actor":"npc:tomas","payload":{"text":"Guarda la llave bajo el mostrador"}}',
      '{"kind":"state_change","effects":[{"op":"relationship","who":"npc:tomas","with":"character:zahira","delta":-1}]}',
      '{"kind":"where","location":"posada"}',
      '{"kind":"addressed","characterIds":["zahira"]}',
    ].join('\n')
    const outputs = await collect(new ModelGMProvider(new FakeTransport(lines), KEY).narrate(contextFor(base, turn(2, [response('zahira', 'Le pregunto por Osric.')]))))
    expect(storyOf(outputs)).toEqual(['Le pregunto por Osric.', 'Tomás baja la vista.', 'No sé nada de eso.'])
    const events = outputs.flatMap((o) => (o.kind === 'event' ? [o.event] : []))
    expect(events.some((e) => e['type'] === 'npc_action' && e['actor'] === 'npc:tomas')).toBe(true)
    expect(events.some((e) => e['type'] === 'state_change' && JSON.stringify(e['effects']).includes('"op":"relationship"'))).toBe(true)
    expect(diagnosticsOf(outputs)).toMatchObject({ ignoredCount: 0, repaired: [] })
  })

  it('el modelo no puede hacerse pasar por el motor: solo narra y hace hablar', async () => {
    const base = await openSession003()
    const lines = ['{"kind":"block","block":{"type":"system","text":"Has ganado 1000 monedas.","audience":"table","tone":"info"}}', '{"kind":"narration","text":"Solo esto.","to":["calder"]}'].join('\n')
    const outputs = await collect(new ModelGMProvider(new FakeTransport(lines), KEY).narrate(contextFor(base, turn(2, [response('zahira', 'Miro.')]))))
    expect(blocksOf(outputs).some((b) => b.type === 'system')).toBe(false)
    // Un bloque que el modelo marco para alguien era privado: sale como susurro, nunca publico.
    expect(blocksOf(outputs).find((b) => b.type === 'narration')).toEqual({ type: 'narration', text: 'Solo esto.', to: ['calder'] })
    expect(outputs.some((o) => o.kind === 'event' && o.event['type'] === 'narration' && (o.event['visibility'] as { layer: string }).layer === 'player')).toBe(true)
    expect(diagnosticsOf(outputs).ignoredCount).toBe(1)
  })
})

describe('bloque I: las ideas salen de lo que el jugador sabe', () => {
  const gm = ['{"kind":"narration","text":"El viento golpea la contraventana de la posada."}', '{"kind":"where","location":"posada"}', '{"kind":"addressed","characterIds":["zahira","calder"]}'].join('\n')

  it('las ideas se leen aunque vengan en un bloque de código, con texto alrededor o cortadas por el límite', async () => {
    const base = await openSession003()
    const ctx = contextFor(base, turn(2, [response('zahira', 'Escucho.')]))
    const replies = [
      '```json\n{"kind":"suggest","options":["Cierro la contraventana","Salgo a ver quién anda fuera"]}\n```',
      'Aquí van las ideas:\n```json\n{"kind":"suggest","options":["Cierro la contraventana","Salgo a ver quién anda fuera"]}\n```\nListo.',
      '```json\n{\n  "kind": "suggest",\n  "options": [\n    "Cierro la contraventana",\n    "Salgo a ver quién anda fuera"\n  ]\n}\n```',
      // Cortada por el limite de salida: la primera idea entera vale mas que ninguna.
      '```json\n{"kind":"suggest","options":["Cierro la contraventana","Salgo a ver quié',
    ]
    for (const reply of replies) {
      const provider = new ModelGMProvider(new Scripted('narrador', () => gm), KEY, { ideasTransport: new Scripted('ideas', () => reply) })
      const idea = await provider.suggest(ctx, 'zahira', [])
      expect(idea.options[0], reply).toBe('Cierro la contraventana')
    }
  })

  it('con transporte de ideas, el GM deja de escribirlas y el engine las pide aparte', async () => {
    const base = await openSession003()
    const main = new Scripted('narrador', () => gm)
    const ideas = new Scripted('ideas', () => '{"kind":"suggest","options":["Cierro la contraventana","Salgo a ver quién anda fuera"]}')
    const provider = new ModelGMProvider(main, KEY, { ideasTransport: ideas })
    const ctx = contextFor(base, turn(2, [response('zahira', 'Escucho.')]))
    const outputs = await collect(provider.narrate(ctx))

    // `narrate` ya no trae ideas ni llama al modelo de ideas: el engine las pide despues, con el estado aplicado.
    expect(provider.separateIdeas).toBe(true)
    expect(outputs.some((o) => o.kind === 'suggestions')).toBe(false)
    expect(ideas.prompts).toHaveLength(0)
    expect(main.prompts[0]!.system).not.toContain('"kind":"suggest"')
    expect(main.prompts[0]!.user).toContain('# Capa del GM: secretos')
    expect(outputs.find((o) => o.kind === 'usage')).toEqual({ kind: 'usage', inputTokens: 100, outputTokens: 20 })

    const idea = await provider.suggest(ctx, 'zahira', [], { narrated: ['El viento golpea la contraventana de la posada.'] })
    expect(idea.options).toEqual(['Cierro la contraventana', 'Salgo a ver quién anda fuera'])
    const prompt = ideas.prompts[0]!
    // Lo que no esta delante no se puede filtrar: ni el texto de un secreto, ni su id, ni la capa del GM.
    expect(prompt.user).not.toContain('Capa del GM')
    for (const secret of base.pack.secrets.values()) {
      expect(prompt.user).not.toContain(secret.id)
      expect(prompt.user).not.toContain(secret.text.slice(0, 40))
    }
    expect(prompt.system).not.toContain('Contrato de realidad')
    // Y si lleva lo que acaba de pasar.
    expect(prompt.user).toContain('El viento golpea la contraventana')
  })

  it('sin transporte de ideas (modelos locales), valen las que escribio el GM', async () => {
    const base = await openSession003()
    const lines = `${gm.replace('{"kind":"addressed"', '{"kind":"suggest","characterId":"zahira","options":["Cierro","Salgo"]}\n{"kind":"addressed"')}`
    const provider = new ModelGMProvider(new Scripted('local', () => lines), KEY)
    expect(provider.separateIdeas).toBe(false)
    const outputs = await collect(provider.narrate(contextFor(base, turn(2, [response('zahira', 'Escucho.')]))))
    expect(outputs.find((o) => o.kind === 'suggestions')).toEqual({ kind: 'suggestions', byCharacter: { zahira: ['Cierro', 'Salgo'] } })
  })

  it('una idea que nombra a alguien que la mesa no ha presenciado se descarta (mesa 43: "Pregunto por Suirei")', async () => {
    const pilot = await openSession003()
    // Una NPC del mundo de la que la mesa todavia no ha oido hablar.
    const suirei = { ...[...pilot.pack.npcs.values()][0]!, id: 'suirei', name: 'Suirei' }
    const base = { ...pilot, pack: { ...pilot.pack, npcs: new Map([...pilot.pack.npcs, ['suirei', suirei]]) } }
    const ideas = new Scripted('ideas', () => '{"kind":"suggest","options":["Pregunto directamente por Suirei","Espero junto a la puerta","Reviso mis cosas"]}')
    const provider = new ModelGMProvider(new Scripted('narrador', () => gm), KEY, { ideasTransport: ideas })
    const idea = await provider.suggest(contextFor(base, turn(2, [response('zahira', 'Escucho.')])), 'zahira', [])
    expect(idea.options).toEqual(['Espero junto a la puerta', 'Reviso mis cosas'])
    // Aunque el GM le haya puesto una actitud a esa NPC sin que nadie la viera, sigue sin poder nombrarse.
    const event = CampaignEvent.parse({ id: 'evt-00023', v: 1, seq: 23, type: 'state_change', sessionId: '003', recordedAt: '2026-09-12T19:10:00Z', effects: [{ op: 'relationship', who: 'npc:suirei', with: 'character:zahira', delta: -1 }] })
    const state = applyEvent(base.state, event, fantasyD20Lite)
    expect(state.world.npcs['suirei']).toBeDefined()
    const after = await provider.suggest(contextFor({ ...base, state }, turn(2, [response('zahira', 'Escucho.')])), 'zahira', [])
    expect(after.options).toEqual(['Espero junto a la puerta', 'Reviso mis cosas'])
  })

  it('lo que solo sabe el GM de la ficha no llega a las ideas: que rumor es falso, ni la meta de otro capitulo', async () => {
    const base = await openSession003()
    const rumor = CampaignEvent.parse({ id: 'evt-00023', v: 1, seq: 23, type: 'rumor_heard', sessionId: '003', recordedAt: '2026-09-12T19:10:00Z', targets: ['character:zahira'], payload: { text: 'dicen que Osric subió con los bolsillos llenos', false: true }, visibility: { layer: 'campaign', witnesses: ['character:zahira'] } })
    const state = applyEvent(base.state, rumor, fantasyD20Lite)
    const session = { ...base.pack.sessions.get('003')!, arc: { turns: { target: 8 }, goal: 'META-DE-ESTE-CAPITULO' } }
    const ctx = contextFor({ ...base, state }, turn(2, []), { session })
    const player = buildPlayerContext(ctx, 'zahira')
    expect(player).toContain('dicen que Osric subió con los bolsillos llenos')
    expect(player).not.toContain('[FALSO]')
    expect(player).toContain('META-DE-ESTE-CAPITULO')
    // El GM si sabe que es falso, y tambien ve la meta del capitulo en la ficha.
    const gmContext = buildTurnContext(ctx).user
    expect(gmContext).toContain('[FALSO]')
    expect(gmContext).toContain('Meta: META-DE-ESTE-CAPITULO')
  })

  it('el contexto del jugador no trae puntos de trama, desenlace ni finales', async () => {
    const base = await openSession003()
    const session = { ...base.pack.sessions.get('003')!, arc: { turns: { target: 8 }, objective: 'Encontrar a Osric', beats: ['PUNTO-SECRETO-DE-TRAMA'], fixedOutcome: 'DESENLACE-QUE-NADIE-DEBE-VER', canon: ['HECHO-FIJO'], endings: [{ id: 'a', when: 'CONDICION-DEL-FINAL', title: 'Fin', default: true }] } }
    const ctx = contextFor(base, turn(2, [response('zahira', 'Escucho.')]), { session })
    const player = buildPlayerContext(ctx, 'zahira', ['Suena la campana.'])
    for (const hidden of ['PUNTO-SECRETO-DE-TRAMA', 'DESENLACE-QUE-NADIE-DEBE-VER', 'HECHO-FIJO', 'CONDICION-DEL-FINAL']) expect(player).not.toContain(hidden)
    expect(player).toContain('Objetivo a la vista: Encontrar a Osric')
    expect(player).toContain('Suena la campana.')
    // El GM si los ve.
    const gmContext = buildTurnContext(ctx).user
    for (const shown of ['PUNTO-SECRETO-DE-TRAMA', 'DESENLACE-QUE-NADIE-DEBE-VER', 'HECHO-FIJO']) expect(gmContext).toContain(shown)
  })
})

describe('R1: las tiradas pedidas son pocas', () => {
  const rollEvent = (seq: number, actor: string, source = 'csprng:server', kind = 'skill') =>
    CampaignEvent.parse({ id: `evt-${String(seq).padStart(5, '0')}`, v: 1, seq, type: 'roll', sessionId: '003', recordedAt: '2026-09-12T19:10:00Z', actor: `character:${actor}`, resolved: { kind, die: '1d20', result: 9, rolls: [9], source } })

  it('una por personaje en una sesion corta; la Fortuna y los dados del motor no cuentan', async () => {
    const base = await openSession003()
    const corta = { pacing: { length: 'corta' as const, extra: 0, wrap: false } }
    const fresh = contextFor(base, turn(3, []), { dice: 'dice', notes: corta })
    expect(rollAllowance(fresh, ['zahira', 'calder'])).toEqual({ limit: 1, left: { zahira: 1, calder: 1 } })
    const used = contextFor(base, turn(3, []), { dice: 'dice', notes: corta, recentEvents: [...base.recentEvents, rollEvent(23, 'zahira'), rollEvent(24, 'calder', 'csprng:server', 'fortune'), rollEvent(25, 'calder', 'engine')] })
    expect(rollAllowance(used, ['zahira', 'calder'])).toEqual({ limit: 1, left: { zahira: 0, calder: 1 } })
    // Con el motor tirando no hay ronda de espera y no hay tope.
    expect(rollAllowance(contextFor(base, turn(3, []), { dice: 'engine' }), ['zahira'])).toBeNull()
    const text = buildTurnContext(used).user
    expect(text).toContain('# Tiradas pedidas')
    expect(text).toContain('Les queda: Calder 1')
    expect(text).toContain('Ya no les queda: Zahira')
    expect(text).toContain('en ESTE turno, sin dado')
  })

  it('una tirada pedida de mas se descarta: nadie se queda esperando un dado', async () => {
    const base = await openSession003()
    const lines = ['{"kind":"narration","text":"La cornisa cruje."}', '{"kind":"ask_roll","characterId":"zahira","die":"1d20","rollKind":"skill","skill":"Atletismo","reason":"la cornisa"}', '{"kind":"ask_roll","characterId":"calder","die":"1d20","rollKind":"skill","skill":"Atletismo","reason":"la cornisa"}', '{"kind":"addressed","characterIds":["zahira","calder"]}'].join('\n')
    const ctx = contextFor(base, turn(3, [response('zahira', 'Salto.')]), { dice: 'dice', notes: { pacing: { length: 'corta', extra: 0, wrap: false } }, recentEvents: [...base.recentEvents, rollEvent(23, 'zahira')] })
    const outputs = await collect(new ModelGMProvider(new FakeTransport(lines), KEY).narrate(ctx))
    expect(outputs.find((o) => o.kind === 'rollRequests')).toEqual({ kind: 'rollRequests', requests: [{ characterId: 'calder', die: '1d20', kind: 'skill', skill: 'Atletismo', reason: 'la cornisa' }] })
    const diagnostics = diagnosticsOf(outputs)
    expect(diagnostics.ignoredCount).toBe(0)
    expect(diagnostics.dropped.join(' ')).toContain('tirada pedida de mas para zahira')
  })

  it('con desenlace inevitable, el GM sabe que un dado que no cambia nada es una ronda perdida', async () => {
    const base = await openSession003()
    const session = { ...base.pack.sessions.get('003')!, arc: { turns: { target: 6 }, fixedOutcome: 'Pase lo que pase, termina detenido.' } }
    // Va en el reloj y no en "Tiradas pedidas": vale tambien cuando tira el motor.
    for (const dice of ['dice', 'engine'] as const) expect(buildTurnContext(contextFor(base, turn(3, []), { dice, session })).user).toContain('no pidas ni uses un dado para nada que ese desenlace ya decide')
  })
})

describe('F3 y F4: lo que el motor guarda de un NPC vuelve al GM', () => {
  it('la actitud y la condicion de un NPC se guardan y salen en el contexto del turno siguiente', async () => {
    const base = await openSession003()
    const event = (seq: number, effects: unknown[]) => CampaignEvent.parse({ id: `evt-${String(seq).padStart(5, '0')}`, v: 1, seq, type: 'state_change', sessionId: '003', recordedAt: '2026-09-12T19:10:00Z', effects })
    let state = applyEvent(base.state, event(23, [{ op: 'relationship', who: 'npc:mera', with: 'character:zahira', delta: -2 }]), fantasyD20Lite)
    state = applyEvent(state, event(24, [{ op: 'condition', who: 'npc:mera', add: 'recelosa' }]), fantasyD20Lite)
    expect(state.world.npcs['mera']?.custom).toMatchObject({ relationships: { 'character:zahira': -2 }, conditions: ['recelosa'] })
    const text = buildTurnContext(contextFor({ ...base, state }, turn(3, []))).user
    expect(text).toMatch(/npc:mera\).*Ahora: con Zahira -2; recelosa\./)
  })
})

describe('H: canon, anteriormente y logros', () => {
  it('los hechos fijos del autor van al GM y su "Anteriormente" quita el del modelo', async () => {
    const base = await openSession003()
    const session = { ...base.pack.sessions.get('003')!, arc: { turns: { target: 8 }, canon: ['La mamá está en el hospital desde las once.'], previously: 'Hace quince años perdiste el examen.' } }
    const text = buildTurnContext(contextFor(base, turn(1, []), { session })).user
    expect(text).toContain('Hechos fijos de esta sesión')
    expect(text).toContain('1. La mamá está en el hospital desde las once.')
    expect(text).not.toContain('{"kind":"recap"')
    // Sin `previously`, el GM escribe el suyo como antes.
    const plain = buildTurnContext(contextFor(base, turn(1, []), { session: { ...session, arc: { turns: { target: 8 } } } })).user
    expect(plain).toContain('{"kind":"recap"')
  })

  it('el logro sale despues de lo narrado, no antes', async () => {
    const base = await openSession003()
    const lines = ['{"kind":"milestone","title":"Llegó al lugar del choque"}', '{"kind":"narration","text":"Llegas corriendo."}', '{"kind":"addressed","characterIds":["zahira"]}'].join('\n')
    const corta = { notes: { pacing: { length: 'corta' as const, extra: 0, wrap: false } } }
    // Turno 4 de 8: empieza la escalada y el reloj pide logro.
    const outputs = await collect(new ModelGMProvider(new FakeTransport(lines), KEY).narrate(contextFor(base, turn(4, [response('zahira', 'Corro.')]), corta)))
    expect(blocksOf(outputs).map((b) => b.type)).toEqual(['dialogue', 'narration', 'milestone'])
    // Turno 3: sigue la complicacion, nadie pidio logro; el del modelo se descarta y queda apuntado.
    const early = await collect(new ModelGMProvider(new FakeTransport(lines), KEY).narrate(contextFor(base, turn(3, [response('zahira', 'Corro.')]), corta)))
    expect(blocksOf(early).map((b) => b.type)).toEqual(['dialogue', 'narration'])
    expect(diagnosticsOf(early).dropped.join(' ')).toContain('logro fuera de su turno')
    // El logro queda en la cronica como evento, y el GM del turno siguiente lo ve para no repetirlo (boticaria, mesa 42).
    const logged = outputs.find((o) => o.kind === 'event' && o.event['type'] === 'world_event' && String((o.event['payload'] as { note: string }).note).startsWith('Logro: '))
    expect(logged).toBeTruthy()
    const seq = (base.recentEvents.at(-1)?.seq ?? 0) + 1
    const event = CampaignEvent.parse({ ...(logged as { event: object }).event, id: `evt-${String(seq).padStart(5, '0')}`, v: 1, seq, sessionId: '003', recordedAt: '2026-10-06T10:00:00Z' })
    const ctx = contextFor({ ...base, recentEvents: [...base.recentEvents, event] }, turn(6, [response('zahira', 'Sigo.')]), corta)
    expect(buildTurnContext(ctx).user).toContain('Logros ya dados en esta sesión, que no se repiten ni con otras palabras: "Llegó al lugar del choque"')
  })

  it('en sesiones de seis turnos no hay logro en cada turno, y en mesa de uno va en singular', () => {
    const arc = { turns: { target: 6 } }
    const asks = [2, 3, 4, 5].map((n) => clockLayer(storyClock(n, undefined, arc)!, 1, arc).includes('{"kind":"milestone"'))
    // Complicacion (2) no; escalada (3) y climax (4) si; 5 sigue en climax.
    expect(asks).toEqual([false, true, true, false])
    expect(clockLayer(storyClock(3, undefined, arc)!, 1, arc)).toContain('en singular')
    expect(clockLayer(storyClock(3, undefined, arc)!, 3, arc)).not.toContain('en singular')
  })

  it('con reloj, fallar avanza y no se borra la escena que el jugador abrio', () => {
    const arc = { turns: { target: 8 }, beats: ['La llamada', 'El choque', 'La agencia'] }
    const text = clockLayer(storyClock(4, undefined, arc)!, 1, arc)
    expect(text).toContain('un fallo nunca deja el turno vacío')
    expect(text).toContain('Lo que un jugador ganó con su acción lo aprovecha ese jugador')
    expect(text).toContain('no borres lo que el jugador acaba de abrir')
    expect(text).not.toContain('aunque tengas que saltar tiempo')
  })
})

/**
 * Lo que el fiscal del VAM rompio en la primera version de la reparacion
 * (05-10): reparaba demasiado pronto y rescataba texto de mas. Cada caso es
 * una entrada que un modelo puede escribir de verdad.
 */
describe('VAM: la reparacion no inventa ni publica lo que no debe', () => {
  const play = async (lines: string[], extra: Parameters<typeof contextFor>[2] = {}, reply: Partial<ModelReply> = {}, number = 2) => {
    const base = await openSession003()
    return collect(new ModelGMProvider(new FakeTransport(lines.join('\n'), reply), KEY).narrate(contextFor(base, turn(number, [response('zahira', 'Miro.')]), extra)))
  }
  const publicStory = (outputs: GMOutput[]) => blocksOf(outputs).flatMap((b) => ((b.type === 'narration' || b.type === 'dialogue') && !b.to && !(b.type === 'dialogue' && b.declared) ? [b.text] : []))
  const noJson = (outputs: GMOutput[]) => {
    for (const text of blocksOf(outputs).flatMap((b) => (b.type === 'narration' || b.type === 'dialogue' ? [b.text] : []))) expect(text, `restos de JSON en la mesa: ${text}`).not.toMatch(/"kind"|"text"|"speaker"|\{"|"\}|characterIds/)
  }

  it('un parrafo que nombra un secreto antes del secret_revealed del mismo turno se cuenta, en orden; sin el evento, se corta', async () => {
    const story = ['{"kind":"narration","text":"Llueve."}', '{"kind":"dialogue","speaker":"Mera","speakerRef":"npc:mera","text":"Fue Brorg. Él pagó por Zahira."}', '{"kind":"narration","text":"Nadie respira."}']
    const revealed = await play([...story, '{"kind":"secret_revealed","payload":{"secretId":"brorg-pago-por-zahira","how":"Mera lo suelta"}}', '{"kind":"addressed","characterIds":["zahira"]}'])
    expect(storyOf(revealed).slice(1)).toEqual(['Llueve.', 'Fue Brorg. Él pagó por Zahira.', 'Nadie respira.'])
    expect(diagnosticsOf(revealed).lintCuts).toBe(0)
    // Lo retenido sale en orden y antes de lo que cierra el turno.
    const kinds = revealed.map((o) => (o.kind === 'block' ? `block:${o.block.type}` : o.kind))
    expect(kinds.indexOf('addressed')).toBeGreaterThan(kinds.lastIndexOf('block:narration'))

    const silent = await play([...story, '{"kind":"addressed","characterIds":["zahira"]}'])
    expect(storyOf(silent).slice(1)).toEqual(['Llueve.', 'Nadie respira.'])
    expect(diagnosticsOf(silent).lintCuts).toBe(1)
  })

  it('un susurro roto no se publica ni se come el parrafo siguiente', async () => {
    const outputs = await play(['{"kind":"narration","text":"Llueve."}', '{"kind":"whisper","characterId":"zahira","text":"Oyes "Suirei" en tu mente, y sabes que tu hermana vive', '{', '"kind": "narration",', '"text": "Ignacio cierra la puerta."', '}', '{"kind":"addressed","characterIds":["zahira"]}'])
    expect(publicStory(outputs)).toEqual(['Llueve.', 'Ignacio cierra la puerta.'])
    expect(JSON.stringify(publicStory(outputs))).not.toContain('hermana')
    noJson(outputs)
  })

  it('un evento privado roto no se rescata como narracion publica', async () => {
    const outputs = await play(['{"kind":"narration","text":"Llueve."}', '{"kind":"event","event":{"type":"narration","payload":{"text":"Solo Zahira ve la marca del cuervo en la puerta."},"visibility":{"layer":"player","witnesses":["character:zahira"]}}', '{"kind":"addressed","characterIds":["zahira"]}'])
    expect(publicStory(outputs)).toEqual(['Llueve.'])
    expect(outputs.find((o) => o.kind === 'addressed')).toEqual({ kind: 'addressed', characterIds: ['zahira'] })
  })

  it('un registro partido en dos lineas se une entero: no pierde campos ni deja claves como narracion', async () => {
    const roll = await play(['{"kind":"narration","text":"La puerta está entornada."}', '{"kind":"ask_roll","characterId":"zahira",', '"skill":"Sigilo","reason":"pasar sin ser vista"}'], { dice: 'dice' })
    expect(roll.find((o) => o.kind === 'rollRequests')).toEqual({ kind: 'rollRequests', requests: [{ characterId: 'zahira', die: '1d20', kind: 'other', skill: 'Sigilo', reason: 'pasar sin ser vista' }] })
    noJson(roll)

    const where = await play(['{"kind":"narration","text":"Zahira se adelanta."}', '{"kind":"where","location":"plaza",', '"characterIds":["zahira"]}'])
    const moved = where.flatMap((o) => (o.kind === 'event' && o.event['type'] === 'state_change' ? (o.event['effects'] as Array<{ who: string }>).map((e) => e.who) : []))
    expect(moved).toEqual(['character:zahira'])
    noJson(where)

    const dialogue = await play(['{"kind":"dialogue","text":"Ven conmigo.",', '"speaker":"Ignacio","speakerRef":null}'])
    expect(blocksOf(dialogue).find((b) => b.type === 'dialogue' && !b.declared)).toMatchObject({ speaker: 'Ignacio', text: 'Ven conmigo.' })
    noJson(dialogue)
  })

  it('lineas con un punto o un guion de mas tambien cortan lo pendiente', async () => {
    const dotted = await play(['{"kind":"narration","text":"Llueve sobre Valdoria.', '{"kind":"narration","text":"Ignacio entra."}.', '{"kind":"addressed","characterIds":["zahira"]}.'])
    expect(publicStory(dotted)).toEqual(['Llueve sobre Valdoria.', 'Ignacio entra.'])
    expect(dotted.find((o) => o.kind === 'addressed')).toEqual({ kind: 'addressed', characterIds: ['zahira'] })
    noJson(dotted)

    const listed = await play(['{"kind":"npc_action","npc":"ignacio","action":"huye"', '- {"kind":"narration","text":"Ignacio sale corriendo."}', '- {"kind":"addressed","characterIds":["zahira"]}'])
    expect(publicStory(listed)).toEqual(['Ignacio sale corriendo.'])
    expect(listed.find((o) => o.kind === 'addressed')).toEqual({ kind: 'addressed', characterIds: ['zahira'] })
    noJson(listed)
  })

  it('dos objetos en una linea con el segundo roto: el segundo no se pierde ni en silencio', async () => {
    const twin = await play(['{"kind":"narration","text":"Llueve."} {"kind":"narration","text":"Ignacio entra."', '{"kind":"addressed","characterIds":["zahira"]}'])
    noJson(twin)
    expect(publicStory(twin)).toEqual(['Llueve.', 'Ignacio entra.'])
    expect(twin.find((o) => o.kind === 'addressed')).toEqual({ kind: 'addressed', characterIds: ['zahira'] })

    // Cortado en mitad de la frase y sin ser el final de la salida: se repara, y queda apuntado como reparado.
    const cut = await play(['{"kind":"narration","text":"Llueve."} {"kind":"dialogue","speaker":"Ignacio","speakerRef":null,"text":"Ven conmigo, rápido', '{"kind":"addressed","characterIds":["zahira"]}'])
    expect(publicStory(cut)).toEqual(['Llueve.', 'Ven conmigo, rápido'])
    expect(diagnosticsOf(cut).repaired.join(' ')).toContain('Ven conmigo')

    // Narracion y evento en una linea, al evento le falta la llave final: el evento se aplica.
    const hit = await play(['{"kind":"narration","text":"El golpe la derriba."} {"kind":"state_change","effects":[{"op":"hp","who":"character:zahira","delta":-2}]', '{"kind":"narration","text":"Zahira cae."}', '{"kind":"addressed","characterIds":["zahira"]}'])
    expect(publicStory(hit)).toEqual(['El golpe la derriba.', 'Zahira cae.'])
    expect(hit.some((o) => o.kind === 'event' && o.event['type'] === 'state_change' && JSON.stringify(o.event['effects']).includes('"delta":-2'))).toBe(true)
  })

  it('JSON con formato al que le falta una llave: el registro siguiente llega entero y `addressed` no se pierde', async () => {
    const pretty = await play(['{', '  "kind": "dialogue",', '  "speaker": "Ignacio",', '  "speakerRef": null,', '  "text": "Oí algo."', '{', '  "kind": "narration",', '  "text": "La patrulla apaga la sirena."', '}', '{', '  "kind": "addressed",', '  "characterIds": ["zahira"]', '}'])
    noJson(pretty)
    expect(publicStory(pretty)).toEqual(['Oí algo.', 'La patrulla apaga la sirena.'])
    expect(pretty.find((o) => o.kind === 'addressed')).toEqual({ kind: 'addressed', characterIds: ['zahira'] })
    // Y el JSON con formato sano sigue leyendose, tambien con una lista de objetos dentro.
    const sane = await play(['{', '  "kind": "state_change",', '  "effects": [', '    {', '      "op": "condition",', '      "who": "character:zahira",', '      "add": "mojada"', '    }', '  ]', '}', '{', '  "kind": "narration",', '  "text": "Llueve."', '}'])
    expect(publicStory(sane)).toEqual(['Llueve.'])
    expect(sane.some((o) => o.kind === 'event' && o.event['type'] === 'state_change')).toBe(true)
    expect(diagnosticsOf(sane).ignoredCount).toBe(0)
  })

  it('lo privado no se publica con ninguna forma de marcarlo, y un susurro de mas no cuenta como historia perdida', async () => {
    for (const line of ['{"kind":"narration","text":"Solo tú recuerdas la voz de tu madre.","to":"zahira"}', '{"kind":"narration","text":"Solo tú recuerdas la voz de tu madre.","to":["zahira"]}']) {
      const outputs = await play(['{"kind":"narration","text":"Llueve."}', line])
      expect(publicStory(outputs), line).toEqual(['Llueve.'])
      expect(blocksOf(outputs).some((b) => b.type === 'narration' && b.to?.[0] === 'zahira'), line).toBe(true)
    }
    // `characterId` en una narracion es un campo de mas, no un destinatario: la mesa la lee
    // (tratarlo como privado le quitaba a la mesa parrafos enteros) y queda apuntado.
    const tagged = await play(['{"kind":"narration","characterId":"zahira","text":"Zahira empuja la puerta y entra a la posada."}', '{"kind":"narration","characterId":"zahira","text":"Todos la miran en silencio."}', '{"kind":"dialogue","speaker":"Bren","speakerRef":"npc:bren","characterId":"zahira","text":"Tú, la del pañuelo, ven aquí."}'])
    expect(publicStory(tagged)).toEqual(['Zahira empuja la puerta y entra a la posada.', 'Todos la miran en silencio.', 'Tú, la del pañuelo, ven aquí.'])
    expect(diagnosticsOf(tagged).dropped.join(' ')).toContain('characterId de mas')
    // Una forma que no se puede leer: no sale de ninguna manera.
    const weird = await play(['{"kind":"narration","text":"Llueve."}', '{"kind":"narration","text":"Solo para algunos.","to":{"who":"zahira"}}'])
    expect(publicStory(weird)).toEqual(['Llueve.'])
    const twice = await play(['{"kind":"narration","text":"Llueve. ¿Qué haces?"}', '{"kind":"narration","text":"Uno.","to":["zahira"]}', '{"kind":"narration","text":"Dos.","to":["zahira"]}'])
    expect(diagnosticsOf(twice)).toMatchObject({ ignoredCount: 1, lostStory: 0 })
    // Sin el "¿Qué hacen?" de relleno: nada de la mesa se corto.
    expect(publicStory(twice)).toEqual(['Llueve. ¿Qué haces?'])
  })

  it('la prosa que cita algo entre comillas se narra; solo los restos de un registro se descartan, y cuentan', async () => {
    const quoted = await play(['El letrero dice "Cerrado": "Vuelva mañana".', '"Ignacio": "Ven conmigo, muchacha."', '"Ven": eso es todo lo que dice Ignacio.'])
    expect(publicStory(quoted)).toEqual(['El letrero dice "Cerrado": "Vuelva mañana".', '"Ignacio": "Ven conmigo, muchacha."', '"Ven": eso es todo lo que dice Ignacio.'])
    const salvaged = await play(['{"kind":"narration","text":"El letrero dice "Cerrado": "Vuelva mañana"."}'])
    expect(publicStory(salvaged)).toEqual(['El letrero dice "Cerrado": "Vuelva mañana".'])
    const residue = await play(['{"kind":"narration","text":"Llueve."}', '"speaker":"Ignacio","speakerRef":null}'])
    // El resto no se narra; como lo ultimo del turno se perdio, el motor devuelve la palabra.
    expect(publicStory(residue)).toEqual(['Llueve.', '¿Qué hacen?'])
    expect(diagnosticsOf(residue)).toMatchObject({ ignoredCount: 1, lostStory: 1 })
  })

  it('con la salida cortada, solo se tira lo que llega hasta el final: la linea anterior, a la que le faltaba una llave, se repara', async () => {
    const outputs = await play(['{"kind":"narration","text":"Llueve."}', '{"kind":"dialogue","speaker":"Ignacio","speakerRef":null,"text":"Oí algo."', '{"kind":"narration","text":"Truena y el'], {}, { finish: 'length' })
    expect(publicStory(outputs)).toEqual(['Llueve.', 'Oí algo.'])
    const diagnostics = diagnosticsOf(outputs)
    expect(diagnostics.dropped.join(' ')).toContain('Truena y el')
    expect(diagnostics.dropped.join(' ')).not.toContain('Oí algo')
    // Lo que si corto el limite era historia, y se cuenta.
    expect(diagnostics.lostStory).toBe(1)
  })

  it('lo que corto el limite de salida no se repara: ni el numero a medias ni la frase a medias', async () => {
    const damage = await play(['{"kind":"narration","text":"El golpe llega."}', '{"kind":"state_change","effects":[{"op":"hp","who":"character:zahira","delta":-1'], {}, { finish: 'length' })
    expect(damage.some((o) => o.kind === 'event' && o.event['type'] === 'state_change')).toBe(false)
    expect(diagnosticsOf(damage).dropped.join(' ')).toContain('salida cortada')

    const phrase = await play(['{"kind":"narration","text":"El golpe llega."}', '{"kind":"narration","text":"No hay nadie en Valdoria que no'], {}, { finish: 'length' })
    expect(publicStory(phrase)).toEqual(['El golpe llega.'])
  })

  it('un campo de mas o un dialogo sin speakerRef no tumban el turno, y el rescate corta en cualquier campo', async () => {
    const extra = await play(['{"kind":"narration","text":"Llueve.","mood":"tenso"}', '{"kind":"dialogue","speaker":"Ignacio","text":"Ven."}'])
    expect(publicStory(extra)).toEqual(['Llueve.', 'Ven.'])
    const salvaged = await play(['{"kind":"narration","text":"El cartel dice "cerrado".","mood":"tenso"}'])
    expect(publicStory(salvaged)).toEqual(['El cartel dice "cerrado".'])
  })

  it('el diagnostico dice la verdad: un evento duplicado no es historia perdida y lo ignorado sale con su texto', async () => {
    const dup = await play(['{"kind":"narration","text":"Llueve."}', '{"type":"narration","payload":{"text":"Llueve."}}'])
    expect(diagnosticsOf(dup)).toMatchObject({ ignoredCount: 1, lostStory: 0 })
    const where = await play(['{"kind":"narration","text":"Llueve."}', '{', '"kind": "where",', '"location": "mordor"', '}'])
    expect(diagnosticsOf(where).ignored.join(' ')).toContain('mordor')
  })

  it('a quien se le descarta una tirada de mas conserva la palabra y el GM se entera en su capa', async () => {
    const base = await openSession003()
    const used = CampaignEvent.parse({ id: 'evt-00023', v: 1, seq: 23, type: 'roll', sessionId: '003', recordedAt: '2026-09-12T19:10:00Z', actor: 'character:zahira', resolved: { kind: 'skill', die: '1d20', result: 9, rolls: [9], source: 'csprng:server' } })
    const lines = ['{"kind":"narration","text":"Tira el dado: todo depende de este salto."}', '{"kind":"ask_roll","characterId":"zahira","die":"1d20","rollKind":"skill","skill":"Atletismo","reason":"el salto"}', '{"kind":"addressed","characterIds":["calder"]}'].join('\n')
    const ctx = contextFor(base, turn(3, [response('zahira', 'Salto.')]), { dice: 'dice', notes: { pacing: { length: 'corta', extra: 0, wrap: false } }, recentEvents: [...base.recentEvents, used] })
    const outputs = await collect(new ModelGMProvider(new FakeTransport(lines), KEY).narrate(ctx))
    expect(outputs.some((o) => o.kind === 'rollRequests')).toBe(false)
    expect(outputs.find((o) => o.kind === 'addressed')).toEqual({ kind: 'addressed', characterIds: ['calder', 'zahira'] })
    const note = outputs.find((o) => o.kind === 'event' && o.event['type'] === 'world_event' && (o.event['visibility'] as { layer: string }).layer === 'gm')
    expect(note?.kind === 'event' && (note.event['payload'] as { note: string }).note).toContain('Su acción sigue sin resolver')
  })

  it('con dados de verdad, el numero que el jugador escribio por su cuenta no gasta el tope', async () => {
    const base = await openSession003()
    const physical = CampaignEvent.parse({ id: 'evt-00023', v: 1, seq: 23, type: 'roll', sessionId: '003', recordedAt: '2026-09-12T19:10:00Z', actor: 'character:zahira', resolved: { kind: 'skill', die: '1d20', result: 14, source: 'physical' } })
    const ctx = contextFor(base, turn(3, []), { dice: 'table', notes: { pacing: { length: 'corta', extra: 0, wrap: false } }, recentEvents: [...base.recentEvents, physical] })
    expect(rollAllowance(ctx, ['zahira'])?.left).toEqual({ zahira: 1 })
    expect(buildTurnContext(ctx).user).toContain('si el jugador escribió su número, úsalo')
  })
})

describe('cuando el modelo escribe la historia como prosa (Sonnet sin razonar, 05-10)', () => {
  it('un dialogo en prosa sale como dialogo, con su hablante y sin la referencia interna a la vista', async () => {
    const base = await openSession003()
    const text = ['Le dices a tu papá que espere y marcas al hospital.', '', 'Lucía (npc:lucia): «¿Emiliano? ¿Qué pasó?»', '', 'Bren: "Nadie baja hoy."', '', 'El letrero dice: "Cerrado".', '{"kind":"where","location":"posada"}', '{"kind":"addressed","characterIds":["zahira"]}'].join('\n')
    const outputs = await collect(new ModelGMProvider(new FakeTransport(text), KEY).narrate(contextFor(base, turn(2, [response('zahira', 'Llamo.')]))))
    const blocks = blocksOf(outputs).filter((b) => !(b.type === 'dialogue' && b.declared))
    expect(blocks).toEqual([
      { type: 'narration', text: 'Le dices a tu papá que espere y marcas al hospital.' },
      { type: 'dialogue', speaker: 'Lucía', speakerRef: 'npc:lucia', text: '¿Emiliano? ¿Qué pasó?' },
      // Sin referencia escrita, pero Bren es alguien del mundo: sale con la suya.
      { type: 'dialogue', speaker: 'Bren', speakerRef: 'npc:bren', text: 'Nadie baja hoy.' },
      // Una frase con dos puntos y una cita no es alguien hablando.
      { type: 'narration', text: 'El letrero dice: "Cerrado".' },
    ])
    expect(JSON.stringify(blocks)).not.toContain('(npc:')
  })

  it('solo es dialogo si alguien conocido habla y la cita cierra la linea; una nota del modelo no llega a la mesa', async () => {
    const base = await openSession003()
    const text = [
      'La lluvia golpea los cristales.',
      // Nadie se llama asi: no son dialogos.
      'Las once: «ya es tarde»',
      'Valdoria: "la ciudad que nunca duerme".',
      // Texto detras de la cita, o un verbo en el "nombre": narracion.
      'Bren: «Ven conmigo.» Y se marcha sin mirar atrás.',
      'Bren murmura: "ven"',
      // Con negrita, el hablante se conserva.
      '**Bren:** "Ven conmigo, rápido."',
      '**Mera (npc:mera):** «¿Quién anda ahí?»',
      '*La puerta se cierra sola.*',
      // Notas del modelo para si mismo.
      'Nota: "el jugador eligió X, sigue el final médico"',
      'Nota: el jugador eligió ayudar a Bren, sigue el final médico.',
      '(Nota para mí: Bren miente sobre la llave.)',
      '**Nota del GM:** el secreto del alcalde se revela en el turno 6.',
      'GM: subo la tensión aquí.',
      'Resultado: "fracaso" para character:zahira',
      // Una referencia de jugador colgada a otro nombre no vale.
      'Bren (character:zahira): «Yo no fui.»',
      '{"kind":"addressed","characterIds":["zahira"]}',
    ].join('\n')
    const outputs = await collect(new ModelGMProvider(new FakeTransport(text), KEY).narrate(contextFor(base, turn(2, [response('zahira', 'Miro.')]))))
    const blocks = blocksOf(outputs).filter((b) => !(b.type === 'dialogue' && b.declared))
    expect(blocks).toEqual([
      { type: 'narration', text: 'La lluvia golpea los cristales.' },
      { type: 'narration', text: 'Las once: «ya es tarde»' },
      { type: 'narration', text: 'Valdoria: "la ciudad que nunca duerme".' },
      { type: 'narration', text: 'Bren: «Ven conmigo.» Y se marcha sin mirar atrás.' },
      { type: 'narration', text: 'Bren murmura: "ven"' },
      { type: 'dialogue', speaker: 'Bren', speakerRef: 'npc:bren', text: 'Ven conmigo, rápido.' },
      { type: 'dialogue', speaker: 'Mera', speakerRef: 'npc:mera', text: '¿Quién anda ahí?' },
      { type: 'narration', text: 'La puerta se cierra sola.' },
      // Bren es conocido: habla el, con SU referencia, no con la de Zahira.
      { type: 'dialogue', speaker: 'Bren', speakerRef: 'npc:bren', text: 'Yo no fui.' },
    ])
    const dropped = diagnosticsOf(outputs).dropped.join('\n')
    for (const note of ['el jugador eligió X', 'eligió ayudar a Bren', 'Bren miente sobre la llave', 'el secreto del alcalde', 'subo la tensión', 'character:zahira']) expect(dropped).toContain(note)
  })

  it('una linea JSON sin su llave final, seguida de prosa, no se traga la prosa', async () => {
    const base = await openSession003()
    const run = async (lines: string[], reply: Partial<ModelReply> = {}) => collect(new ModelGMProvider(new FakeTransport(lines.join('\n'), reply), KEY).narrate(contextFor(base, turn(2, [response('zahira', 'Miro.')]))))
    // El dialogo se repara y la narracion sale aparte, no en boca del NPC.
    const spoken = await run(['{"kind":"narration","text":"Llueve."}', '{"kind":"dialogue","speaker":"Bren","speakerRef":"npc:bren","text":"Oí algo en el sótano."', 'Bren baja la mirada y se marcha.', 'La lluvia arrecia.', '{"kind":"addressed","characterIds":["zahira"]}'])
    expect(blocksOf(spoken).filter((b) => !(b.type === 'dialogue' && b.declared))).toEqual([
      { type: 'narration', text: 'Llueve.' },
      { type: 'dialogue', speaker: 'Bren', speakerRef: 'npc:bren', text: 'Oí algo en el sótano.' },
      { type: 'narration', text: 'Bren baja la mirada y se marcha.' },
      { type: 'narration', text: 'La lluvia arrecia.' },
    ])
    // Con un susurro igual: el susurro sigue privado y la prosa publica no se pierde.
    const whispered = await run(['{"kind":"whisper","characterId":"zahira","text":"Tu hermana vive."', 'Bren baja la mirada y se marcha.'])
    expect(blocksOf(whispered).filter((b) => b.type === 'narration')).toEqual([{ type: 'narration', text: 'Tu hermana vive.', to: ['zahira'] }, { type: 'narration', text: 'Bren baja la mirada y se marcha.' }])
    // Prosa pegada a un objeto en la misma linea, delante o detras.
    const glued = await run(['{"kind":"narration","text":"Llueve."} Bren entra empapado y cierra la puerta.', 'Mera lo mira sin decir nada. {"kind":"addressed","characterIds":["zahira"]}'])
    expect(storyOf(glued).slice(1)).toEqual(['Llueve.', 'Bren entra empapado y cierra la puerta.', 'Mera lo mira sin decir nada.'])
    expect(glued.find((o) => o.kind === 'addressed')).toEqual({ kind: 'addressed', characterIds: ['zahira'] })
    // Con la salida cortada: la linea anterior, entera salvo su llave, se repara aunque la cola sea prosa o no haya cola.
    for (const tail of ['Bren se va y la', '{"op":"hp"', '']) {
      const cut = await run(['{"kind":"narration","text":"Llueve."}', '{"kind":"dialogue","speaker":"Bren","speakerRef":null,"text":"Oí algo."', tail].filter((l, i) => i < 2 || l !== ''), { finish: 'length' })
      expect(storyOf(cut).slice(1, 3), `cola: ${tail}`).toEqual(['Llueve.', 'Oí algo.'])
    }
  })

  it('lo que el modelo deja colgando al final de un texto no llega a la mesa', async () => {
    const base = await openSession003()
    // Cerro con `}"` en vez de `"}`, y una comilla angular que nunca abrio: los dos se vieron con Sonnet.
    const text = ['{"kind":"narration","text":"Te pide que te cuides.}"', '{"kind":"narration","text":"El oficial estira la mano, esperando.»"}', '{"kind":"dialogue","speaker":"Bren","speakerRef":"npc:bren","text":"«Nadie baja hoy», dijo."}'].join('\n')
    const outputs = await collect(new ModelGMProvider(new FakeTransport(text), KEY).narrate(contextFor(base, turn(2, [response('zahira', 'Miro.')]))))
    expect(storyOf(outputs).slice(1)).toEqual(['Te pide que te cuides.', 'El oficial estira la mano, esperando.', '«Nadie baja hoy», dijo.'])
  })

  it('ronda 4 del fiscal: tras una linea rota, la prosa que empieza con comilla, guion, numero o corchete sigue siendo prosa', async () => {
    const base = await openSession003()
    const run = async (lines: string[], reply: Partial<ModelReply> = {}) => collect(new ModelGMProvider(new FakeTransport(lines.join('\n'), reply), KEY).narrate(contextFor(base, turn(2, [response('zahira', 'Miro.')]))))
    const prose = ['"Nadie baja hoy", repite Bren sin mirarte.', '- Mera lo deja pasar.', '3 pasos mas y la puerta cede.', '[El reloj marca las once.]', 'true dice el letrero, y nadie entiende.']
    const outputs = await run(['{"kind":"narration","text":"Llueve."}', '{"kind":"dialogue","speaker":"Bren","speakerRef":"npc:bren","text":"Oí algo."', ...prose, '{"kind":"addressed","characterIds":["zahira"]}'])
    expect(storyOf(outputs).slice(1)).toEqual(['Llueve.', 'Oí algo.', '"Nadie baja hoy", repite Bren sin mirarte.', 'Mera lo deja pasar.', '3 pasos mas y la puerta cede.', '[El reloj marca las once.]', 'true dice el letrero, y nadie entiende.'])
    expect(outputs.find((o) => o.kind === 'addressed')).toEqual({ kind: 'addressed', characterIds: ['zahira'] })
    // Un registro roto dentro de una cadena solo lo cierra otro registro.
    const inString = await run(['{"kind":"narration","text":"Llueve, y Bren', 'dice que no baja.', '{"kind":"narration","text":"Mera entra."}'])
    expect(storyOf(inString).slice(1)).toEqual(['Llueve, y Bren\ndice que no baja.', 'Mera entra.'])
  })

  it('ronda 4 del fiscal: frases en español con dos puntos, parentesis o verbos que parecen etiquetas son historia; las notas al GM no', async () => {
    const base = await openSession003()
    const story = ['Todo está en silencio: nadie respira.', '(La puerta se cierra sola.)', 'Los jugadores de cartas levantan la vista.', 'Nota el frío en la nuca antes de oír los pasos.', 'Meta la mano en el bolsillo: la llave sigue ahí.']
    const notes = ['Recordatorio: Bren miente sobre la llave.', 'Objetivo oculto: que Zahira baje al sótano.', '> Nota: subir la tensión en el turno 4.', 'Narrador (para mí): el alcalde ya lo sabe.', '// fin del turno', '# turno 2', '<- aquí iba el logro']
    const outputs = await collect(new ModelGMProvider(new FakeTransport([...story, ...notes, '{"kind":"addressed","characterIds":["zahira"]}'].join('\n')), KEY).narrate(contextFor(base, turn(2, [response('zahira', 'Miro.')]))))
    expect(storyOf(outputs).slice(1)).toEqual(['Todo está en silencio: nadie respira.', '(La puerta se cierra sola.)', 'Los jugadores de cartas levantan la vista.', 'Nota el frío en la nuca antes de oír los pasos.', 'Meta la mano en el bolsillo: la llave sigue ahí.'])
    const dropped = diagnosticsOf(outputs).dropped.join('\n')
    for (const note of ['Bren miente', 'baje al sótano', 'subir la tensión', 'el alcalde ya lo sabe', 'fin del turno', 'iba el logro']) expect(dropped).toContain(note)
  })

  it('ronda 4 del fiscal: prosa entre objetos de una misma linea, cola cortada por el limite y un turno solo de prosa', async () => {
    const base = await openSession003()
    const run = async (lines: string[], reply: Partial<ModelReply> = {}) => collect(new ModelGMProvider(new FakeTransport(lines.join('\n'), reply), KEY).narrate(contextFor(base, turn(2, [response('zahira', 'Miro.')]))))
    const between = await run(['{"kind":"narration","text":"Llueve."} Bren entra empapado. {"kind":"dialogue","speaker":"Mera","speakerRef":"npc:mera","text":"Cierra."} Y la puerta cede.', '{"kind":"addressed","characterIds":["zahira"]}'])
    expect(storyOf(between).slice(1)).toEqual(['Llueve.', 'Bren entra empapado.', 'Cierra.', 'Y la puerta cede.'])
    // La prosa que corto el limite de salida no llega a la mesa, y cuenta como historia perdida.
    const cut = await run(['{"kind":"narration","text":"Llueve."}', 'Bren entra empapado y, antes de que nadie diga nada, se'], { finish: 'length' })
    expect(storyOf(cut).slice(1)).toEqual(['Llueve.'])
    expect(diagnosticsOf(cut).lostStory).toBeGreaterThan(0)
    // Un turno escrito entero en prosa se narra; no muere por falta de objetos.
    const plain = await run(['Bren entra empapado.', '', 'Mera lo mira sin decir nada.'])
    expect(storyOf(plain).slice(1)).toEqual(['Bren entra empapado.', 'Mera lo mira sin decir nada.'])
    expect(diagnosticsOf(plain).lostStory).toBe(0)
  })

  it('el prompt enseña un turno completo y dice que todo va en un objeto', () => {
    for (const ruleset of ['fantasy-d20-lite', 'court-intrigue', 'masquerade', 'drama-lite']) {
      const prompt = systemPromptFor(ruleset, false, 'dice', 'es', 'separate')
      expect(prompt).toContain('Un turno completo se ve así:')
      expect(prompt).toContain('nunca escribas prosa suelta')
    }
  })
})

describe('VAM, segunda ronda del fiscal de contexto', () => {
  it('la sesion puede decir quien es el personaje ahora: clase, edad y bio en la ficha del GM y en las ideas', async () => {
    const base = await openSession003()
    const session = { ...base.pack.sessions.get('003')!, arc: { turns: { target: 8 }, sheets: { zahira: { class: 'Ingeniera en un call center', age: '32 años', bio: 'Vive sola en un octavo piso.' } } } }
    const ctx = contextFor(base, turn(2, []), { session })
    const gm = buildTurnContext(ctx).user
    expect(gm).toContain('Ingeniera en un call center, 32 años')
    expect(gm).toContain('Vive sola en un octavo piso.')
    expect(gm).not.toContain(base.pack.characters.get('zahira')!.bio.slice(0, 30))
    expect(buildPlayerContext(ctx, 'zahira')).toContain('Ingeniera en un call center')
    // Solo a quien va: Calder sigue con su ficha.
    expect(gm).toContain(base.pack.characters.get('calder')!.bio.slice(0, 30))
  })

  it('la nota de una tirada de mas solo llega al GM en el turno siguiente, no el resto de la sesion', async () => {
    const base = await openSession003()
    const note = (seq: number, turnNumber: number) => CampaignEvent.parse({ id: `evt-${String(seq).padStart(5, '0')}`, v: 1, seq, type: 'world_event', sessionId: '003', recordedAt: '2026-09-12T19:10:00Z', payload: { note: `Pendiente del GM (turno ${turnNumber}): se le pidió una tirada a Zahira y no hubo dado. Su acción sigue sin resolver: resuélvela al empezar este turno, sin dado y con un costo.` }, visibility: { layer: 'gm', witnesses: [] } })
    const events = [...base.recentEvents, note(23, 3)]
    expect(buildTurnContext(contextFor(base, turn(4, []), { recentEvents: events })).user).toContain('Pendiente del GM (turno 3)')
    expect(buildTurnContext(contextFor(base, turn(5, []), { recentEvents: events })).user).not.toContain('Pendiente del GM')
    // Y nunca a quien juega.
    expect(buildPlayerContext(contextFor(base, turn(4, []), { recentEvents: events }), 'zahira')).not.toContain('Pendiente del GM')
  })
})
