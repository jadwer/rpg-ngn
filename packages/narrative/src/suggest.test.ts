import { describe, expect, it } from 'vitest'
import { ModelDMProvider } from './model-dm.js'
import { contextFor, FakeTransport, openSession003, response, turn } from './pilot.test-helpers.js'

const KEY = 'sk-proj-SECRETA-1234567890abcdef'

/** "Otras" ideas (E10b): una llamada aparte que solo pide la linea suggest de un personaje. */
describe('ModelDMProvider.suggest', () => {
  it('pide dos ideas nuevas para el personaje, sin las que ya vio, y no narra nada', async () => {
    const base = await openSession003()
    const transport = new FakeTransport(['Claro:', '{"kind":"suggest","characterId":"zahira","options":["Reviso la campana de cerca","Bajo sola al segundo nivel","Una tercera que sobra"]}'].join('\n'))
    const provider = new ModelDMProvider(transport, KEY)
    const result = await provider.suggest(contextFor(base, turn(2, [response('calder', 'Vigilo.')])), 'character:zahira', ['Bajo sola al segundo nivel'])

    expect(result.options).toEqual(['Reviso la campana de cerca', 'Una tercera que sobra'])
    expect(result.usage.inputTokens).toBeGreaterThanOrEqual(0)
    const prompt = transport.prompts[0]!
    expect(prompt.user).toContain('AHORA NO NARRES NADA')
    expect(prompt.user).toContain('"Bajo sola al segundo nivel"')
    expect(prompt.maxOutputTokens).toBe(300)
    // El prefijo de sistema es el mismo que el del turno: el proveedor lo cachea.
    expect(prompt.system).toContain('# Agencia del jugador')
  })

  it('ignora ideas de otro personaje y falla claro si el modelo no da ninguna', async () => {
    const base = await openSession003()
    const other = new ModelDMProvider(new FakeTransport('{"kind":"suggest","characterId":"calder","options":["No es para ti","Tampoco"]}'), KEY)
    await expect(other.suggest(contextFor(base, turn(2, [])), 'zahira', [])).rejects.toThrow(/no devolvió ideas/)

    const absent = new ModelDMProvider(new FakeTransport('{"kind":"suggest","characterId":"nadie","options":["x","y"]}'), KEY)
    await expect(absent.suggest(contextFor(base, turn(2, [])), 'nadie', [])).rejects.toThrow(/no está en la sesión/)
  })
})
