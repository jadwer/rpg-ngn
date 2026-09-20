import { seededRandom } from '@rpg-ngn/core'
import { describe, expect, it } from 'vitest'
import { ModelDMProvider, type ModelPrompt, type ModelReply, type ModelTransport } from './model-dm.js'
import { contextFor, openSession003, response, turn } from './pilot.test-helpers.js'
import type { DMProbe } from './provider.js'

/**
 * Sonnet abrevio `{"kind":"block","block":{"type":"dialogue",...}}` como
 * `{"kind":"dialogue",...}` y el turno entero murio con "el modelo no
 * devolvio ningun bloque", pese a que los dados ya se habian tirado (mesa de
 * prueba en produccion, 20-09). La abreviacion se entiende.
 */
class Once implements ModelTransport {
  readonly kind = 'fake'
  readonly model = 'fake-1'
  constructor(private readonly reply: string) {}
  async *stream(_p: ModelPrompt): AsyncGenerator<string, ModelReply, undefined> {
    yield this.reply
    return { finish: 'stop', inputTokens: 10, outputTokens: 10 }
  }
  async probe(): Promise<DMProbe> {
    return { ok: true, model: this.model, message: 'ok' }
  }
}

async function collect<T>(it: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = []
  for await (const x of it) out.push(x)
  return out
}

describe('bloques abreviados del modelo', () => {
  it('entiende {"kind":"dialogue"} y {"kind":"narration"} sin envoltura', async () => {
    const base = await openSession003()
    const provider = new ModelDMProvider(
      new Once('{"kind":"dialogue","speaker":"Bren","speakerRef":"npc:bren","text":"La campana funciona, sí."}\n{"kind":"narration","text":"El portón chirría al abrirse."}'),
      'sk-test-0000000000',
      { random: seededRandom(7) },
    )
    const outputs = await collect(provider.narrate(contextFor(base, turn(2, [response('zahira', 'Pregunto por la campana.')]))))
    const blocks = outputs.filter((o) => o.kind === 'block') as Array<{ block: { type: string; speaker?: string; text: string } }>
    expect(blocks.map((b) => b.block.type)).toContain('dialogue')
    expect(blocks.map((b) => b.block.type)).toContain('narration')
    expect(blocks.some((b) => b.block.speaker === 'Bren' && b.block.text.includes('La campana'))).toBe(true)
    expect(blocks.some((b) => b.block.type === 'narration' && b.block.text.includes('portón'))).toBe(true)
    // Y no se cuenta como linea ignorada: no hay aviso al anfitrion.
    expect(blocks.some((b) => b.block.text.includes('no se pudo aplicar'))).toBe(false)
  })
})
