import { describe, expect, it } from 'vitest'
import { ModelDMProvider, parseLoose } from './model-dm.js'
import { collect, contextFor, FakeTransport, openSession003, response, turn } from './pilot.test-helpers.js'
import { DMProviderError } from './redact.js'

const KEY = 'sk-proj-SECRETA-1234567890abcdef'

const goodTurn = [
  '{"kind":"block","block":{"type":"narration","text":"La campana de bronce está fría al tacto. Bajo el óxido, alguien grabó una fecha."}}',
  '{"kind":"block","block":{"type":"dialogue","speaker":"Tomás","speakerRef":"npc:tomas","text":"Tres días, dije. Han pasado tres días."}}',
  '{"kind":"event","event":{"type":"roll","actor":"character:zahira","resolved":{"kind":"skill","die":"1d20","result":14,"source":"physical","skill":"Historia"}}}',
  '{"kind":"event","event":{"type":"state_change","actor":"character:calder","effects":[{"op":"hp","who":"character:calder","delta":-2}]}}',
  '{"kind":"block","block":{"type":"narration","text":"¿Qué hacéis?"}}',
  '{"kind":"addressed","characterIds":["character:zahira","narivyl"]}',
].join('\n')

describe('ModelDMProvider', () => {
  it('registra las declaraciones, emite bloques al vuelo y solo acepta eventos que el engine puede aplicar', async () => {
    const base = await openSession003()
    const transport = new FakeTransport(goodTurn)
    const provider = new ModelDMProvider(transport, KEY)

    const outputs = await collect(provider.narrate(contextFor(base, turn(1, [response('zahira', 'Miro la campana. Saqué un 14 en Historia.'), response('calder', 'La sigo.')]))))

    const blocks = outputs.filter((o) => o.kind === 'block').map((o) => (o.kind === 'block' ? o.block : null))
    expect(blocks.map((b) => b?.type)).toEqual(['dialogue', 'dialogue', 'narration', 'dialogue', 'narration'])
    expect(blocks[0]).toMatchObject({ speaker: 'Zahira', speakerRef: 'character:zahira' })
    expect(blocks[3]).toMatchObject({ speaker: 'Tomás', speakerRef: 'npc:tomas' })

    const events = outputs.filter((o) => o.kind === 'event').map((o) => (o.kind === 'event' ? o.event : null))
    expect(events.map((e) => e?.['type'])).toEqual(['player_action', 'player_action', 'narration', 'narration', 'roll', 'state_change', 'narration'])
    expect(events[0]).toMatchObject({ actor: 'character:zahira', declared: 'Miro la campana. Saqué un 14 en Historia.', visibility: { witnesses: ['character:zahira', 'character:calder'] } })
    expect(events[3]).toMatchObject({ actor: 'npc:tomas', payload: { text: 'Tomás: Tres días, dije. Han pasado tres días.', speaker: 'Tomás' } })
    expect(events[4]).toMatchObject({ type: 'roll', resolved: { result: 14, source: 'physical' } })

    // addressed: se filtra a la party presente (narivyl no esta en la sesion 003).
    expect(outputs.find((o) => o.kind === 'addressed')).toEqual({ kind: 'addressed', characterIds: ['zahira'] })
    expect(outputs.at(-1)).toEqual({ kind: 'usage', inputTokens: 1200, outputTokens: 300 })

    // El prompt lleva las cuatro capas y respeta el presupuesto de salida por defecto.
    const prompt = transport.prompts[0]!
    expect(prompt.maxOutputTokens).toBe(4000)
    expect(prompt.user).toContain('# Mundo y premisa')
    expect(prompt.user).toContain('## Zahira (character:zahira)')
    expect(prompt.user).toContain('Miro la campana. Saqué un 14 en Historia.')
  })

  it('ignora basura, fences y eventos inaplicables sin romper el turno, y avisa al final', async () => {
    const base = await openSession003()
    const text = [
      'Aquí va la respuesta del DM:',
      '```json',
      'Claro: {"kind":"block","block":{"type":"narration","text":"El aire huele a piedra mojada."}},',
      '{"kind":"event","event":{"type":"state_change","effects":[{"op":"hp","who":"character:orion","delta":-3}]}}',
      '{"kind":"event","event":{"type":"roll","actor":"character":"zahira","resolved":{"kind":"skill","die":"1d20","result":9,"source":"physical"}}}',
      '{"kind":"event","event":{"type":"roll","actor":"character:zahira","resolved":{"kind":"skill","die":"1d20","result":19,"source":"physical"}}}',
      '{"kind":"event","event":{"type":"inventory_change","actor":"character:calder","effects":[{"op":"lose","item":"llave-de-hierro-sin-cerradura"}]}}',
      '{"kind":"event","event":{"type":"inventory_change","actor":"character:calder","effects":[{"op":"lose","item":"cosa-que-no-tiene"}]}}',
      '{"kind":"event","event":{"type":"narration","payload":{"text":"no debe duplicarse"}}}',
      '{"kind":"block","block":{"type":"dialogue","speaker":"Un minero","speakerRef":"minero sin id","text":"¿Quién anda ahí?"}}',
      '```',
    ].join('\n')
    const provider = new ModelDMProvider(new FakeTransport(text), KEY)

    const outputs = await collect(provider.narrate(contextFor(base, turn(2, [response('zahira', 'Escucho.')]))))

    const blocks = outputs.filter((o) => o.kind === 'block').map((o) => (o.kind === 'block' ? o.block : null))
    expect(blocks.map((b) => b?.type)).toEqual(['dialogue', 'narration', 'dialogue', 'system'])
    expect(blocks[2]).toMatchObject({ speaker: 'Un minero', speakerRef: null })
    expect(blocks[3]?.type === 'system' && blocks[3].text).toMatch(/^El DM propuso 5 líneas/)

    const events = outputs.filter((o) => o.kind === 'event').map((o) => (o.kind === 'event' ? o.event['type'] : ''))
    // Orion no esta en la sesion, el roll de 19 no fue reportado, la cosa no esta en el inventario, narration del modelo se descarta.
    expect(events).toEqual(['player_action', 'narration', 'inventory_change', 'narration'])
    expect(outputs.find((o) => o.kind === 'addressed')).toEqual({ kind: 'addressed', characterIds: ['zahira', 'calder'] })
  })

  it('rescata un array JSON con fences y avisa si la salida se corto por presupuesto', async () => {
    const base = await openSession003()
    const text = '```json\n[\n  {"kind":"block","block":{"type":"narration","text":"Todo en una sola estructura."}},\n  {"kind":"addressed","characterIds":["calder"]}\n]\n```'
    const provider = new ModelDMProvider(new FakeTransport(text, { finish: 'length' }), KEY)

    const outputs = await collect(provider.narrate(contextFor(base, turn(1, []))))
    const blocks = outputs.filter((o) => o.kind === 'block').map((o) => (o.kind === 'block' ? o.block : null))
    expect(blocks.map((b) => b?.type)).toEqual(['narration', 'system'])
    expect(blocks[1]?.type === 'system' && blocks[1].text).toMatch(/se cortó por el presupuesto/)
    expect(outputs.find((o) => o.kind === 'addressed')).toEqual({ kind: 'addressed', characterIds: ['calder'] })
  })

  it('falla el turno (para que la plataforma lo reabra) si el modelo no devuelve ningun bloque', async () => {
    const base = await openSession003()
    const provider = new ModelDMProvider(new FakeTransport('Claro, aquí va el turno:\n```json\n```'), KEY)
    await expect(collect(provider.narrate(contextFor(base, turn(1, []))))).rejects.toThrow(/no devolvió ningún bloque/)
  })

  it('convierte la prosa suelta en narracion (modelos chicos que olvidan el formato)', async () => {
    const base = await openSession003()
    // Salida tipica de qwen2.5 / llama3.1: encabezado, prosa en parrafos, un JSON al final dentro de fences.
    const text = [
      '**Narración del DM:**',
      '',
      'La galería se estrecha y el eco de vuestros pasos vuelve con retraso. Zahira nota que el techo fue apuntalado hace poco.',
      '',
      '- Calder siente la llave tibia en la mano.',
      '',
      '¿Qué hacéis?',
      '',
      '```json',
      '{',
      '  "kind": "addressed",',
      '  "characterIds": ["zahira", "calder"]',
      '}',
      '```',
    ].join('\n')
    const outputs = await collect(new ModelDMProvider(new FakeTransport(text), KEY).narrate(contextFor(base, turn(2, [response('zahira', 'Avanzo.')]))))
    const blocks = outputs.filter((o) => o.kind === 'block').map((o) => (o.kind === 'block' ? o.block : null))
    expect(blocks.map((b) => b?.type)).toEqual(['dialogue', 'narration', 'narration', 'narration'])
    expect(blocks[1]).toMatchObject({ text: 'La galería se estrecha y el eco de vuestros pasos vuelve con retraso. Zahira nota que el techo fue apuntalado hace poco.' })
    expect(blocks[2]).toMatchObject({ text: 'Calder siente la llave tibia en la mano.' })
    expect(blocks[3]).toMatchObject({ text: '¿Qué hacéis?' })
    expect(outputs.find((o) => o.kind === 'addressed')).toEqual({ kind: 'addressed', characterIds: ['zahira', 'calder'] })
    expect(outputs.some((o) => o.kind === 'block' && o.block.type === 'system')).toBe(false)
  })

  it('entiende JSON con formato en varias lineas y objetos sin la envoltura kind', async () => {
    const base = await openSession003()
    const text = [
      '[',
      '  {',
      '    "kind": "block",',
      '    "block": {"type": "narration", "text": "Primer bloque con formato."}',
      '  },',
      '  {"type": "dialogue", "speaker": "Tomás", "speakerRef": "npc:tomas", "text": "Sin envoltura."},',
      '  {"type": "world_event", "payload": {"note": "Se apaga el farol"}},',
      '  {"kind": "block", "block": {"type": "narration", "text": "Cierra con pregunta?"}}',
      ']',
    ].join('\n')
    const outputs = await collect(new ModelDMProvider(new FakeTransport(text), KEY).narrate(contextFor(base, turn(2, []))))
    const blocks = outputs.filter((o) => o.kind === 'block').map((o) => (o.kind === 'block' ? o.block : null))
    expect(blocks.map((b) => b?.type)).toEqual(['narration', 'dialogue', 'narration'])
    expect(outputs.filter((o) => o.kind === 'event').map((o) => (o.kind === 'event' ? o.event['type'] : ''))).toEqual(['narration', 'narration', 'world_event', 'narration'])
  })

  it('un objeto roto no se traga las lineas siguientes', async () => {
    const base = await openSession003()
    const text = [
      '{"kind":"block","block":{"type":"narration","text":"roto sin cerrar',
      '{"kind":"block","block":{"type":"narration","text":"Este sí llega."}}',
      '{"kind":"addressed","characterIds":["calder"]}',
    ].join('\n')
    const outputs = await collect(new ModelDMProvider(new FakeTransport(text), KEY).narrate(contextFor(base, turn(2, []))))
    const blocks = outputs.filter((o) => o.kind === 'block').map((o) => (o.kind === 'block' ? o.block : null))
    expect(blocks.map((b) => b?.type)).toEqual(['narration', 'system'])
    expect(blocks[0]).toMatchObject({ text: 'Este sí llega.' })
    expect(outputs.find((o) => o.kind === 'addressed')).toEqual({ kind: 'addressed', characterIds: ['calder'] })
  })

  it('redacta la credencial en errores del transporte y del probe', async () => {
    const base = await openSession003()
    const failing = new FakeTransport('', {}, new Error(`401 Unauthorized: invalid api key ${KEY} (x-api-key: ${KEY})`))
    const provider = new ModelDMProvider(failing, KEY)

    let caught: unknown
    try {
      await collect(provider.narrate(contextFor(base, turn(1, []))))
    } catch (error) {
      caught = error
    }
    expect(caught).toBeInstanceOf(DMProviderError)
    const message = (caught as Error).message
    expect(message).not.toContain(KEY)
    expect(message).not.toContain('SECRETA')
    expect(message).toContain('[credencial redactada]')
    expect((caught as Error).cause).toBeUndefined()

    failing.probe = async () => {
      throw new Error(`forbidden for key ${KEY}`)
    }
    const probe = await provider.probe()
    expect(probe.ok).toBe(false)
    expect(probe.message).not.toContain('SECRETA')
  })

  it('respeta el presupuesto de salida de la peticion', async () => {
    const base = await openSession003()
    const transport = new FakeTransport('{"kind":"block","block":{"type":"narration","text":"Breve."}}')
    await collect(new ModelDMProvider(transport, KEY).narrate(contextFor(base, turn(1, []), { maxOutputTokens: 900 })))
    expect(transport.prompts[0]?.maxOutputTokens).toBe(900)
  })
})

describe('parseLoose', () => {
  it('tolera texto antes del primer objeto y una coma final', () => {
    expect(parseLoose('Respuesta: {"a":1},')).toEqual({ a: 1 })
    expect(parseLoose('1. {"a":[1,2]}')).toEqual({ a: [1, 2] })
    expect(parseLoose('sin json')).toBeUndefined()
    expect(parseLoose('{"roto":')).toBeUndefined()
  })
})
