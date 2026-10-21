import { describe, expect, it } from 'vitest'
import { ModelGMProvider } from './model-gm.js'
import { systemPromptFor } from './prompt.js'
import { collect, contextFor, FakeTransport, openSession003, response, turn } from './pilot.test-helpers.js'

/** Lo que salio de la mesa 45 (tester en ingles, 21-10). */
describe('mesa en ingles', () => {
  it('la instruccion de idioma cubre los logros y el cliffhanger, y pide ingles claro', () => {
    const prompt = systemPromptFor('fantasy-d20-lite@1.0.0', false, 'engine', 'en')
    expect(prompt).toContain('"milestone"')
    expect(prompt).toContain('cliffhanger del cierre')
    expect(prompt).toContain('lets this go clean')
  })

  it('una idea larga se corta en palabra entera, no a media palabra', async () => {
    const base = await openSession003()
    const long = 'I hurry to the tea storage room before the junior guards arrive, examining the lock and recording everything in my log with the exact hour, the names of everyone present and the state of the door'
    const lines = ['{"kind":"narration","text":"The door creaks."}', JSON.stringify({ kind: 'suggest', characterId: 'zahira', options: [long, 'I wait.'] }), '{"kind":"addressed","characterIds":["zahira"]}'].join('\n')
    const outputs = await collect(new ModelGMProvider(new FakeTransport(lines), 'sk-test-english-0000').narrate(contextFor(base, turn(2, [response('zahira', 'Look.')]))))
    const ideas = outputs.flatMap((o) => (o.kind === 'suggestions' ? (o.byCharacter['zahira'] ?? []) : []))
    expect(ideas[0]!.length).toBeLessThanOrEqual(180)
    expect(ideas[0]!.endsWith('…')).toBe(true)
    // Lo que queda antes del corte son palabras completas del original.
    expect(long.startsWith(ideas[0]!.slice(0, -1))).toBe(true)
    expect(long.charAt(ideas[0]!.length - 1)).toBe(' ')
    expect(ideas[1]).toBe('I wait.')
  })
})
