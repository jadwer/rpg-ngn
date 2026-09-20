import { rollD20, seededRandom } from '@rpg-ngn/core'
import { describe, expect, it } from 'vitest'
import { ModelDMProvider, preRollFor, type ModelPrompt, type ModelReply, type ModelTransport } from './model-dm.js'
import { contextFor, openSession003, response, turn } from './pilot.test-helpers.js'
import type { DMProbe } from './provider.js'

/**
 * Con el servidor tirando, el motor tira un d20 por cada personaje que
 * declaro algo ANTES de llamar al modelo, se lo enseña, y acepta ese numero
 * de vuelta para narrar la consecuencia en el mismo turno. Seis turnos de una
 * mesa de cinco sin un solo dado (19-09) fueron el motivo.
 */
class OneShotTransport implements ModelTransport {
  readonly kind = 'fake'
  readonly model = 'fake-1'
  prompts: ModelPrompt[] = []

  constructor(private readonly reply: (prompt: ModelPrompt) => string) {}

  async *stream(prompt: ModelPrompt): AsyncGenerator<string, ModelReply, undefined> {
    this.prompts.push(prompt)
    yield this.reply(prompt)
    return { finish: 'stop', inputTokens: 10, outputTokens: 10 }
  }

  async probe(): Promise<DMProbe> {
    return { ok: true, model: this.model, message: 'ok' }
  }
}

async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = []
  for await (const item of iterable) out.push(item)
  return out
}

describe('dados pre-tirados', () => {
  it('un d20 por personaje que declaro, sin repetir y en orden', () => {
    const rolled = preRollFor(['zahira', 'calder', 'zahira'], seededRandom(7))
    expect(Object.keys(rolled)).toEqual(['zahira', 'calder'])
    for (const n of Object.values(rolled)) expect(n).toBeGreaterThanOrEqual(1)
  })

  it('el modelo ve los dados, devuelve el de Zahira y el bloque de tirada sale con ese numero', async () => {
    const base = await openSession003()
    const expected = rollD20(seededRandom(7), {}).result
    const transport = new OneShotTransport((prompt) => {
      expect(prompt.user).toContain('Dados de este turno')
      expect(prompt.user).toContain(`Zahira (character:zahira): ${expected}`)
      return [
        `{"kind":"event","event":{"type":"roll","actor":"character:zahira","resolved":{"kind":"skill","die":"1d20","result":${expected},"source":"engine","skill":"Percepción"}}}`,
        '{"kind":"block","block":{"type":"narration","text":"La madera cede y ves lo que hay detrás."}}',
        '{"kind":"addressed","characterIds":["zahira"]}',
      ].join('\n')
    })
    const provider = new ModelDMProvider(transport, 'sk-test-0000000000', { random: seededRandom(7) })
    const outputs = await collect(provider.narrate(contextFor(base, turn(2, [response('zahira', 'Empujo la viga.')]))))

    const roll = outputs.find((o) => o.kind === 'event' && o.event.type === 'roll')
    expect(roll).toBeDefined()
    const resolved = (roll as unknown as { event: { resolved: { result: number; rolls: number[]; source: string } } }).event.resolved
    expect(resolved.result).toBe(expected)
    expect(resolved.rolls).toEqual([expected])
    expect(resolved.source).toBe('engine')
  })

  it('un numero que no es el dado de ese personaje no cuela: el motor tira de nuevo', async () => {
    const base = await openSession003()
    const expected = rollD20(seededRandom(7), {}).result
    const bogus = expected === 20 ? 19 : 20
    const transport = new OneShotTransport(
      () => `{"kind":"event","event":{"type":"roll","actor":"character:zahira","resolved":{"kind":"skill","die":"1d20","result":${bogus},"source":"engine"}}}\n{"kind":"block","block":{"type":"narration","text":"Sigue."}}`,
    )
    const provider = new ModelDMProvider(transport, 'sk-test-0000000000', { random: seededRandom(7) })
    const outputs = await collect(provider.narrate(contextFor(base, turn(2, [response('zahira', 'Empujo la viga.')]))))
    const roll = outputs.find((o) => o.kind === 'event' && o.event.type === 'roll') as unknown as { event: { resolved: { result: number; source: string } } } | undefined
    expect(roll).toBeDefined()
    // Se tiro de verdad (fuente del generador), no se acepto el numero inventado.
    expect(roll!.event.resolved.source).not.toBe('engine')
  })
})
