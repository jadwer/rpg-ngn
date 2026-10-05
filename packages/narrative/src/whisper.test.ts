import { describe, expect, it } from 'vitest'
import { ModelGMProvider } from './model-gm.js'
import { collect, contextFor, diagnosticsOf, FakeTransport, openSession003, response, turn } from './pilot.test-helpers.js'

const KEY = 'sk-test-whisper-000000000'

/** Lo privado (docs/26, H7): lo que el director le dice a un solo personaje. */
describe('susurros', () => {
  it('un susurro va solo a ese personaje: bloque con destinatario y evento en la capa del jugador', async () => {
    const base = await openSession003()
    const lines = [
      '{"kind":"block","block":{"type":"narration","text":"La campana suena tres veces."}}',
      '{"kind":"whisper","characterId":"zahira","text":"Solo tú notas que el badajo está atado con un cordel nuevo."}',
      '{"kind":"whisper","characterId":"zahira","text":"Un segundo susurro no cuenta."}',
      '{"kind":"whisper","characterId":"nadie","text":"Alguien que no está en la mesa."}',
    ].join('\n')
    const outputs = await collect(new ModelGMProvider(new FakeTransport(lines), KEY).narrate(contextFor(base, turn(2, [response('zahira', 'Miro la campana.')]))))

    const whispers = outputs.flatMap((o) => (o.kind === 'block' && o.block.type === 'narration' && o.block.to ? [o.block] : []))
    expect(whispers).toEqual([{ type: 'narration', text: 'Solo tú notas que el badajo está atado con un cordel nuevo.', to: ['zahira'] }])
    const event = outputs.find((o) => o.kind === 'event' && o.event['type'] === 'narration' && (o.event['visibility'] as { layer: string }).layer === 'player')
    expect(event?.kind === 'event' && event.event['visibility']).toEqual({ layer: 'player', witnesses: ['character:zahira'] })
  })

  it('un susurro puede revelarle un secreto solo a ese personaje, sin que el lint lo corte', async () => {
    const base = await openSession003()
    const lines = [
      '{"kind":"block","block":{"type":"narration","text":"Calder se queda en la puerta."}}',
      '{"kind":"whisper","characterId":"calder","text":"Recuerdas el trato: fue Brorg quien pagó por Zahira."}',
    ].join('\n')
    const outputs = await collect(new ModelGMProvider(new FakeTransport(lines), KEY).narrate(contextFor(base, turn(2, [response('calder', 'Espero.')]), { lint: 'enforce' })))

    expect(outputs.some((o) => o.kind === 'block' && o.block.type === 'narration' && o.block.to?.[0] === 'calder')).toBe(true)
    const reveal = outputs.find((o) => o.kind === 'event' && o.event['type'] === 'secret_revealed')
    expect(reveal?.kind === 'event' && reveal.event['visibility']).toEqual({ layer: 'player', witnesses: ['character:calder'] })
    expect(diagnosticsOf(outputs)).toMatchObject({ ignoredCount: 0, lintCuts: 0 })
  })
})
