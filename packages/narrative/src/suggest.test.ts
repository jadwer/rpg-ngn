import { describe, expect, it } from 'vitest'
import { ModelGMProvider } from './model-gm.js'
import { contextFor, FakeTransport, openSession003, response, turn } from './pilot.test-helpers.js'

const KEY = 'sk-proj-SECRETA-1234567890abcdef'

/**
 * "Otras" ideas (E10b): una llamada aparte que solo pide la linea suggest de
 * un personaje. Desde docs/27 esa llamada ve solo lo que el jugador sabe.
 */
describe('ModelGMProvider.suggest', () => {
  it('pide dos ideas nuevas para el personaje, sin las que ya vio, y no narra nada', async () => {
    const base = await openSession003()
    const transport = new FakeTransport(['Claro:', '{"kind":"suggest","characterId":"zahira","options":["Reviso la campana de cerca","Bajo sola al segundo nivel","Una tercera que sobra"]}'].join('\n'))
    const provider = new ModelGMProvider(transport, KEY)
    const result = await provider.suggest(contextFor(base, turn(2, [response('calder', 'Vigilo.')])), 'character:zahira', ['Bajo sola al segundo nivel'])

    expect(result.options).toEqual(['Reviso la campana de cerca', 'Una tercera que sobra'])
    expect(result.usage.inputTokens).toBeGreaterThanOrEqual(0)
    const prompt = transport.prompts[0]!
    expect(prompt.user).toContain('Dos ideas para Zahira')
    expect(prompt.user).toContain('"Bajo sola al segundo nivel"')
    expect(prompt.maxOutputTokens).toBe(1200)
    // No es el prompt del director: ni reglas del GM, ni capa de secretos, ni puntos de trama.
    expect(prompt.system).not.toContain('Capa del GM')
    expect(prompt.user).not.toContain('# Capa del GM')
    expect(prompt.user).not.toContain('NO REVELADO')
  })

  it('ignora ideas de otro personaje y falla claro si el modelo no da ninguna', async () => {
    const base = await openSession003()
    const other = new ModelGMProvider(new FakeTransport('{"kind":"suggest","characterId":"calder","options":["No es para ti","Tampoco"]}'), KEY)
    await expect(other.suggest(contextFor(base, turn(2, [])), 'zahira', [])).rejects.toThrow(/no devolvió ideas/)

    const absent = new ModelGMProvider(new FakeTransport('{"kind":"suggest","characterId":"nadie","options":["x","y"]}'), KEY)
    await expect(absent.suggest(contextFor(base, turn(2, [])), 'nadie', [])).rejects.toThrow(/no está en la sesión/)
  })
})
