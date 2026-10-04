import { describe, expect, it } from 'vitest'
import { ModelGMProvider } from './model-gm.js'
import { clockLayer, sessionBudget, storyClock } from './pacing.js'
import { collect, contextFor, FakeTransport, openSession003, response, turn } from './pilot.test-helpers.js'

const KEY = 'sk-test-pacing-0000000000'
const corta = { length: 'corta', extra: 0, wrap: false } as const

describe('reloj de la historia', () => {
  it('una sesion corta reparte 8 turnos en cinco tramos', () => {
    const phases = Array.from({ length: 8 }, (_, i) => storyClock(i + 1, corta)?.phase)
    expect(phases).toEqual(['gancho', 'complicacion', 'complicacion', 'escalada', 'escalada', 'climax', 'climax', 'cierre'])
    // Logro al empezar cada tramo y aviso en el penultimo.
    expect(storyClock(4, corta)?.phaseStart).toBe(true)
    expect(storyClock(5, corta)?.phaseStart).toBe(false)
    expect(storyClock(7, corta)?.penultimate).toBe(true)
  })

  it('sin largo no hay reloj; las extensiones y el arco del mundo mueven el presupuesto', () => {
    expect(storyClock(3, undefined)).toBeNull()
    expect(storyClock(3, { length: 'libre', extra: 0, wrap: false })).toBeNull()
    expect(sessionBudget({ length: 'corta', extra: 2, wrap: false })).toBe(10)
    expect(sessionBudget({ length: 'media', extra: 0, wrap: false })).toBe(14)
    expect(sessionBudget(corta, 6)).toBe(6)
    expect(storyClock(8, { length: 'corta', extra: 2, wrap: false })?.phase).toBe('climax')
  })

  it('"pedir el final" vuelve cierre el turno que sigue', () => {
    expect(storyClock(3, { length: 'corta', extra: 0, wrap: true })?.phase).toBe('cierre')
  })

  it('el contexto del turno lleva el tramo, el limite de texto y, al cierre, como terminar', () => {
    const layer = clockLayer(storyClock(8, corta)!, 3)
    expect(layer).toContain('Turno 8 de 8. Tramo: cierre')
    expect(layer).toContain('180 palabras')
    expect(layer).toContain('{"kind":"close"')
    expect(clockLayer(storyClock(4, corta)!, 1)).toContain('{"kind":"milestone"')
  })
})

describe('el director con reloj', () => {
  const closing = [
    '{"kind":"block","block":{"type":"narration","text":"La campana suena tres veces y el pueblo respira."}}',
    '{"kind":"milestone","title":"Rescataron a Osric de la mina"}',
    '{"kind":"close","cliffhanger":"Alguien vio la llave de hierro."}',
  ].join('\n')

  it('en el turno de cierre emite el logro y cierra la sesion, sin devolver la palabra', async () => {
    const base = await openSession003()
    const transport = new FakeTransport(closing)
    const outputs = await collect(new ModelGMProvider(transport, KEY).narrate(contextFor(base, turn(8, [response('zahira', 'Toco la campana.')]), { notes: { pacing: corta } })))

    expect(transport.prompts[0]!.user).toContain('# Reloj de la historia')
    expect(outputs.some((o) => o.kind === 'block' && o.block.type === 'milestone' && o.block.title === 'Rescataron a Osric de la mina')).toBe(true)
    expect(outputs.find((o) => o.kind === 'close')).toEqual({ kind: 'close', cliffhanger: 'Alguien vio la llave de hierro.' })
    expect(outputs.some((o) => o.kind === 'addressed')).toBe(false)
  })

  it('fuera del cierre la linea close se ignora y el turno sigue', async () => {
    const base = await openSession003()
    const outputs = await collect(new ModelGMProvider(new FakeTransport(closing), KEY).narrate(contextFor(base, turn(3, [response('zahira', 'Toco la campana.')]), { notes: { pacing: corta } })))
    expect(outputs.some((o) => o.kind === 'close')).toBe(false)
    expect(outputs.some((o) => o.kind === 'addressed')).toBe(true)
  })

  it('si el modelo olvida cerrar en el ultimo turno, el motor cierra igual', async () => {
    const base = await openSession003()
    const plain = '{"kind":"block","block":{"type":"narration","text":"El pueblo duerme por fin."}}'
    const outputs = await collect(new ModelGMProvider(new FakeTransport(plain), KEY).narrate(contextFor(base, turn(8, [response('zahira', 'Me voy a dormir.')]), { notes: { pacing: corta } })))
    expect(outputs.find((o) => o.kind === 'close')).toEqual({ kind: 'close' })
  })

  it('sin reloj nada cambia: ni seccion en el contexto ni cierre', async () => {
    const base = await openSession003()
    const transport = new FakeTransport(closing)
    const outputs = await collect(new ModelGMProvider(transport, KEY).narrate(contextFor(base, turn(8, [response('zahira', 'Toco la campana.')]))))
    expect(transport.prompts[0]!.user).not.toContain('# Reloj de la historia')
    expect(outputs.some((o) => o.kind === 'close')).toBe(false)
  })
})

describe('logros', () => {
  it('un logro largo se corta sin partir palabras', async () => {
    const base = await openSession003()
    const long = '{"kind":"milestone","title":"Confirmaron que el pueblo oculta algo sobre la mina y un nombre que empieza por ene"}\n{"kind":"block","block":{"type":"narration","text":"Sigue."}}'
    const outputs = await collect(new ModelGMProvider(new FakeTransport(long), KEY).narrate(contextFor(base, turn(4, [response('zahira', 'Miro.')]), { notes: { pacing: corta } })))
    const title = outputs.flatMap((o) => (o.kind === 'block' && o.block.type === 'milestone' ? [o.block.title] : []))[0]!
    expect(title.length).toBeLessThanOrEqual(80)
    expect(title.endsWith('…')).toBe(true)
    expect(title).not.toMatch(/ …$/)
  })
})

describe('apertura con gancho (docs/26, H2)', () => {
  it('pide un incidente en el primer bloque, una linea por personaje, lo que esta en juego y un dilema con plazo', async () => {
    const base = await openSession003()
    const transport = new FakeTransport('{"kind":"block","block":{"type":"narration","text":"Un grito corta la noche."}}')
    await collect(new ModelGMProvider(transport, KEY).narrate(contextFor(base, turn(1, []), { notes: { pacing: corta } })))
    const user = transport.prompts[0]!.user
    expect(user).toContain('el PRIMER bloque es un incidente')
    expect(user).toContain('UNA frase atada al incidente')
    expect(user).toContain('qué está en juego')
    expect(user).toContain('dilema con prisa')
    expect(user).not.toContain('con un detalle propio')
  })
})
