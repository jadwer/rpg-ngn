import { seededRandom } from '@rpg-ngn/core'
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
  it('cuando el DM pide una tirada sin resultado, el engine tira el dado y la mesa ve el bloque roll', async () => {
    const base = await openSession003()
    const lines = [
      '{"kind":"block","block":{"type":"narration","text":"Las runas exigen atención. Zahira, tu ojo de piedra las recorre."}}',
      '{"kind":"event","event":{"type":"roll","actor":"character:zahira","resolved":{"kind":"skill","die":"1d20","skill":"Historia"}}}',
      '{"kind":"event","event":{"type":"roll","actor":"character:calder","resolved":{"kind":"attack","die":"2d6+1"}}}',
      '{"kind":"event","event":{"type":"roll","actor":"character:calder","resolved":{"kind":"save","die":"1d20","advantage":true}}}',
      '{"kind":"addressed","characterIds":["zahira"]}',
    ].join('\n')
    const provider = new ModelDMProvider(new FakeTransport(lines), KEY, { random: seededRandom(7) })
    const expected = seededRandom(7)
    // Con el servidor tirando, el motor pre-tira un d20 por cada personaje
    // que declaro (Zahira) antes de llamar al modelo; consume el primer valor.
    expected.nextInt(20)
    const zahira = expected.nextInt(20) + 1
    const calder = [expected.nextInt(6) + 1, expected.nextInt(6) + 1]
    const narivyl = [expected.nextInt(20) + 1, expected.nextInt(20) + 1]

    const outputs = await collect(provider.narrate(contextFor(base, turn(1, [response('zahira', 'Examino las runas sin tocarlas.')]))))

    const rolls = outputs.filter((o) => o.kind === 'event').map((o) => (o.kind === 'event' ? o.event : null)).filter((e) => e?.['type'] === 'roll')
    expect(rolls).toHaveLength(3)
    expect(rolls[0]).toMatchObject({ actor: 'character:zahira', resolved: { die: '1d20', result: zahira, rolls: [zahira], source: 'seed:7', skill: 'Historia' } })
    expect(rolls[1]).toMatchObject({ actor: 'character:calder', resolved: { die: '2d6+1', result: calder[0]! + calder[1]! + 1, rolls: calder } })
    expect(rolls[2]).toMatchObject({ actor: 'character:calder', resolved: { die: '1d20', result: Math.max(...narivyl), rolls: narivyl, advantage: true } })
    expect(rolls[0]).not.toHaveProperty('resolved.advantage')

    const rollBlocks = outputs.filter((o) => o.kind === 'block' && o.block.type === 'roll').map((o) => (o.kind === 'block' ? o.block : null))
    expect(rollBlocks.map((b) => b?.type)).toEqual(['roll', 'roll', 'roll'])
    expect(rollBlocks[0]).toMatchObject({ actor: 'character:zahira', die: '1d20', result: zahira, text: `Zahira tira 1d20 (Historia): ${zahira}` })
    expect(rollBlocks[2]?.type === 'roll' ? rollBlocks[2].text : '').toContain(`[${narivyl.join(', ')}]`)
  })

  it('registra las declaraciones, emite bloques al vuelo y solo acepta eventos que el engine puede aplicar', async () => {
    const base = await openSession003()
    const transport = new FakeTransport(goodTurn)
    const provider = new ModelDMProvider(transport, KEY)

    // Mesa presencial (`dice: 'table'`): el numero que escribe el jugador vale. Ya no es el defecto.
    const outputs = await collect(provider.narrate(contextFor(base, turn(1, [response('zahira', 'Miro la campana. Saqué un 14 en Historia.'), response('calder', 'La sigo.')]), { dice: 'table' })))

    const blocks = outputs.filter((o) => o.kind === 'block').map((o) => (o.kind === 'block' ? o.block : null))
    expect(blocks.map((b) => b?.type)).toEqual(['dialogue', 'dialogue', 'narration', 'dialogue', 'roll', 'narration'])
    expect(blocks[0]).toMatchObject({ speaker: 'Zahira', speakerRef: 'character:zahira' })
    expect(blocks[3]).toMatchObject({ speaker: 'Tomás', speakerRef: 'npc:tomas' })
    expect(blocks[4]).toMatchObject({ type: 'roll', actor: 'character:zahira', die: '1d20', result: 14, text: 'Zahira tira 1d20 (Historia) con su dado: 14' })

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

    // Mesa presencial: una tirada "fisica" que nadie escribio se descarta (con el servidor tirando, se tiraria).
    const outputs = await collect(provider.narrate(contextFor(base, turn(2, [response('zahira', 'Escucho.')]), { dice: 'table' })))

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
    expect(blocks[1]?.type === 'system' && blocks[1].text).toMatch(/llegó a su límite de escritura/)
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

  describe('lint de conocimiento', () => {
    // Sesion 003 con Zahira y Calder: ninguno sabe que Osric bajo anoche ni que fue Brorg quien pago por Zahira.
    const leak = [
      '{"kind":"block","block":{"type":"narration","text":"Las velas de Osric siguen apagadas. Zahira, tú lo entiendes de golpe: fue Brorg quien te empujó hacia arriba."}}',
      '{"kind":"block","block":{"type":"dialogue","speaker":"Un minero flaco","speakerRef":null,"text":"Osric está abajo, muchacha. Bajó anoche."}}',
      '{"kind":"event","event":{"type":"world_event","payload":{"note":"Zahira entiende que Brorg pagó por ella"}}}',
      '{"kind":"block","block":{"type":"narration","text":"El silencio pesa en la casa. ¿Qué hacéis?"}}',
      '{"kind":"addressed","characterIds":["zahira","calder"]}',
    ].join('\n')

    it('corta los bloques que revelan un secreto antes de tiempo, no los registra y deja el motivo en el resultado', async () => {
      const base = await openSession003()
      const outputs = await collect(new ModelDMProvider(new FakeTransport(leak), KEY).narrate(contextFor(base, turn(1, [response('zahira', 'Entro en la casa de Osric.')]))))

      const blocks = outputs.filter((o) => o.kind === 'block').map((o) => (o.kind === 'block' ? o.block : null))
      // Un solo aviso, al final del turno: en medio de la historia parecia que el DM se corregia en vivo.
      expect(blocks.map((b) => b?.type)).toEqual(['dialogue', 'narration', 'system'])
      // El aviso del lint es para el anfitrion: un jugador no puede hacer nada con el.
      expect(blocks[2]).toMatchObject({ type: 'system', text: 'El DM revisó su narración: contaba algo que la mesa todavía no ha descubierto.', audience: 'host', tone: 'info' })
      expect(blocks[2]?.type === 'system' && blocks[2].detail).toMatch(/cortó 2 bloques/)
      expect(JSON.stringify(blocks)).not.toContain('Brorg')
      expect(JSON.stringify(blocks)).not.toContain('está abajo')

      // Ni la narracion cortada ni el world_event entran a la cronica.
      const events = outputs.filter((o) => o.kind === 'event').map((o) => (o.kind === 'event' ? o.event : null))
      expect(events.map((e) => e?.['type'])).toEqual(['player_action', 'narration'])
      expect(JSON.stringify(events)).not.toContain('Brorg')

      const findings = outputs.filter((o) => o.kind === 'lint').map((o) => (o.kind === 'lint' ? o.finding : null))
      expect(findings.map((f) => [f?.level, f?.secretId, f?.marker, f?.receivers.join()])).toEqual([
        ['error', 'brorg-pago-por-zahira', 'fue Brorg', 'zahira,calder'],
        ['error', 'osric-esta-abajo', 'Osric está abajo', 'zahira,calder'],
        ['error', 'brorg-pago-por-zahira', 'Brorg pagó', 'zahira,calder'],
      ])
      expect(outputs.find((o) => o.kind === 'addressed')).toEqual({ kind: 'addressed', characterIds: ['zahira', 'calder'] })
    })

    it('un turno limpio pasa sin hallazgos y el contexto lleva la capa del DM marcada', async () => {
      const base = await openSession003()
      const transport = new FakeTransport(goodTurn)
      const outputs = await collect(new ModelDMProvider(transport, KEY).narrate(contextFor(base, turn(1, [response('zahira', 'Miro la campana. Saqué un 14 en Historia.')]))))

      expect(outputs.some((o) => o.kind === 'lint')).toBe(false)
      expect(outputs.some((o) => o.kind === 'block' && o.block.type === 'system')).toBe(false)
      const user = transport.prompts[0]!.user
      expect(user).toContain('# Capa del DM: secretos')
      expect(user).toContain('- osric-esta-abajo (sobre npc:osric; NO REVELADO a Zahira, Calder). Se revela solo si tú lo decides, con un evento secret_revealed; puede soltarlo npc:osric.')
      // El de Brorg no viaja: nadie lo nombro y no esta en la party. El modelo
      // no puede parafrasear lo que no tiene delante (docs/04, regla 2).
      expect(user).not.toContain('brorg-pago-por-zahira')

      // En cuanto la escena lo roza, entra con su condicion de revelacion.
      const transport2 = new FakeTransport(goodTurn)
      await collect(new ModelDMProvider(transport2, KEY).narrate(contextFor(base, turn(1, [response('zahira', '¿Y Brorg? Lo busco entre los ganchos.')]))))
      expect(transport2.prompts[0]!.user).toContain('- brorg-pago-por-zahira (sobre character:brorg; NO REVELADO a Zahira, Calder). Se revela con un evento discovery del hecho fact:brorg-pago-por-zahira; puede soltarlo character:brorg.')
    })

    it('un secret_revealed emitido antes del bloque lo autoriza y llega al engine con la party de testigos', async () => {
      const base = await openSession003()
      const text = [
        '{"kind":"event","event":{"type":"secret_revealed","payload":{"secretId":"osric-esta-abajo","how":"lo encuentran en el tercer nivel"}}}',
        '{"kind":"block","block":{"type":"dialogue","speaker":"Osric","speakerRef":"npc:osric","text":"Bajé anoche. Vengo a devolver lo que debo."}}',
        '{"kind":"event","event":{"type":"secret_revealed","payload":{"secretId":"no-existe"}}}',
        '{"kind":"addressed","characterIds":["zahira"]}',
      ].join('\n')
      const outputs = await collect(new ModelDMProvider(new FakeTransport(text), KEY).narrate(contextFor(base, turn(2, []))))

      expect(outputs.some((o) => o.kind === 'lint')).toBe(false)
      const events = outputs.filter((o) => o.kind === 'event').map((o) => (o.kind === 'event' ? o.event : null))
      expect(events[0]).toEqual({ type: 'secret_revealed', payload: { secretId: 'osric-esta-abajo', how: 'lo encuentran en el tercer nivel' }, visibility: { layer: 'campaign', witnesses: ['character:zahira', 'character:calder'] } })
      expect(events.map((e) => e?.['type'])).toEqual(['secret_revealed', 'narration'])
      const blocks = outputs.filter((o) => o.kind === 'block').map((o) => (o.kind === 'block' ? o.block : null))
      expect(blocks.map((b) => b?.type)).toEqual(['dialogue', 'system'])
      expect(blocks[1]?.type === 'system' && blocks[1].text).toMatch(/1 línea que no se pudo aplicar/)
    })

    it('en modo report el bloque pasa y el hallazgo se anota; en modo off no se revisa', async () => {
      const base = await openSession003()
      const report = await collect(new ModelDMProvider(new FakeTransport(leak), KEY).narrate(contextFor(base, turn(1, []), { lint: 'report' })))
      expect(report.filter((o) => o.kind === 'block').map((o) => (o.kind === 'block' ? o.block.type : ''))).toEqual(['narration', 'dialogue', 'narration'])
      expect(report.filter((o) => o.kind === 'lint')).toHaveLength(3)
      expect(report.filter((o) => o.kind === 'event').map((o) => (o.kind === 'event' ? o.event['type'] : ''))).toEqual(['narration', 'narration', 'world_event', 'narration'])

      const off = await collect(new ModelDMProvider(new FakeTransport(leak), KEY).narrate(contextFor(base, turn(1, []), { lint: 'off' })))
      expect(off.some((o) => o.kind === 'lint')).toBe(false)
      expect(off.filter((o) => o.kind === 'block')).toHaveLength(3)
    })

    it('si el lint corta el ultimo bloque, el motor devuelve la palabra (la mesa no queda a la deriva)', async () => {
      const base = await openSession003()
      const endsCut = [
        '{"kind":"block","block":{"type":"narration","text":"La puerta de la casa cede con un crujido."}}',
        '{"kind":"block","block":{"type":"dialogue","speaker":"Un minero flaco","speakerRef":null,"text":"Osric está abajo, muchacha. ¿Vas a bajar?"}}',
      ].join('\n')
      const outputs = await collect(new ModelDMProvider(new FakeTransport(endsCut), KEY).narrate(contextFor(base, turn(2, [response('zahira', 'Entro en la casa de Osric.')]))))
      const blocks = outputs.filter((o) => o.kind === 'block').map((o) => (o.kind === 'block' ? o.block : null))
      expect(blocks.map((b) => b?.type)).toEqual(['dialogue', 'narration', 'system', 'narration'])
      expect(blocks[3]).toEqual({ type: 'narration', text: '¿Qué hacen?' })
    })
  })

  it('la Fortuna la tira el jugador: el motor no la tira al abrir y el d20 del modelo no la pisa', async () => {
    const base = await openSession003()
    const transport = new FakeTransport('{"kind":"block","block":{"type":"narration","text":"Amanece en Valdoria. ¿Qué hacen?"}}')
    const outputs = await collect(new ModelDMProvider(transport, KEY, { random: seededRandom(3) }).narrate(contextFor(base, turn(1, []))))

    expect(outputs.some((o) => o.kind === 'block' && o.block.type === 'roll')).toBe(false)
    expect(transport.prompts[0]!.user).toContain('la tira cada jugador con su dado')

    // Una tirada que el modelo marque como Fortuna sale como tirada cualquiera.
    const sneaky = ['{"kind":"event","event":{"type":"roll","actor":"character:zahira","resolved":{"kind":"fortune","die":"1d20","result":20,"source":"model"}}}', '{"kind":"block","block":{"type":"narration","text":"Sigue."}}'].join('\n')
    const later = await collect(new ModelDMProvider(new FakeTransport(sneaky), KEY, { random: seededRandom(3) }).narrate(contextFor(base, turn(2, [response('zahira', 'Miro.')]), { dice: 'engine' })))
    const kinds = later.filter((o) => o.kind === 'event' && o.event['type'] === 'roll').map((o) => (o.kind === 'event' ? (o.event['resolved'] as { kind: string }).kind : null))
    expect(kinds).not.toContain('fortune')
  })

  it('el DM puede marcar un momento para ilustrar: uno por turno y pasa por el lint', async () => {
    const base = await openSession003()
    const lines = [
      '{"kind":"block","block":{"type":"narration","text":"La campana tiembla sola en la capilla."}}',
      '{"kind":"scene","text":"Una campana de bronce vibra sola en una capilla minera a la luz de un farol."}',
      '{"kind":"scene","text":"Otra escena que sobra."}',
    ].join('\n')
    const outputs = await collect(new ModelDMProvider(new FakeTransport(lines), KEY).narrate(contextFor(base, turn(2, [response('zahira', 'Miro la campana.')]))))
    const illustrate = outputs.filter((o) => o.kind === 'illustrate')
    expect(illustrate).toEqual([{ kind: 'illustrate', moment: 'Una campana de bronce vibra sola en una capilla minera a la luz de un farol.' }])
  })

  it('con dados del motor ignora el numero que escribio el jugador y tira el engine', async () => {
    const base = await openSession003()
    const transport = new FakeTransport(goodTurn)
    const outputs = await collect(
      new ModelDMProvider(transport, KEY, { random: seededRandom(7) }).narrate(
        contextFor(base, turn(1, [response('zahira', 'Miro la campana. Saqué un 14 en Historia.')]), { dice: 'engine' }),
      ),
    )

    const roll = outputs.filter((o) => o.kind === 'event').map((o) => (o.kind === 'event' ? o.event : null)).find((e) => e?.['type'] === 'roll')
    // El 14 que escribio el jugador no vale: la tirada la hizo el motor.
    const resolved = roll?.['resolved'] as { source?: string; result?: number } | undefined
    expect(resolved?.source).toBe('seed:7')
    expect(resolved?.result).not.toBe(14)
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
