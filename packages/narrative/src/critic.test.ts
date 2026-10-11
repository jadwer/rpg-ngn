import { describe, expect, it } from 'vitest'
import { critique, critiquePrompt, parseCritique } from './critic.js'
import { FakeTransport, openSession003 } from './pilot.test-helpers.js'

describe('lector critico', () => {
  it('la referencia lleva canon, desenlace y NPCs ausentes de la sesion, y va en el bloque fijo', async () => {
    const { pack } = await openSession003()
    const [here, ...away] = [...pack.npcs.values()]
    const sessions = new Map(pack.sessions)
    sessions.set('003', { ...sessions.get('003')!, npcs: { [here!.id]: 'herido' }, arc: { turns: { target: 8 }, canon: ['Es de noche.'], fixedOutcome: 'Nadie sale.' } })
    const prompt = critiquePrompt({ pack: { ...pack, sessions }, transcript: '=== Sesión 003, turno 1\n  [GM] Sale el sol.', sessions: ['003'] })
    expect(prompt.user.startsWith(prompt.fixed!)).toBe(true)
    expect(prompt.fixed).toContain('- Es de noche.')
    expect(prompt.fixed).toContain('Desenlace fijo: Nadie sale.')
    expect(prompt.fixed).toContain(`NPCs presentes: ${here!.name} (herido).`)
    expect(prompt.fixed).toContain(away[0]!.name)
    expect(prompt.fixed).not.toContain('## Sesión 001')
    expect(prompt.user).toContain('[GM] Sale el sol.')
  })

  it('lee una linea por hallazgo, ignora {"none":true} y cuenta lo que no entiende', () => {
    const text = [
      '```json',
      '{"turn":"002/4","kind":"personaje","severity":"baja","quote":"No pude abrirla sola","against":"el explorador (masculino)","why":"cambia el genero"}',
      '{"turn":"002/5","kind":"inventado"}',
      'Eso es todo.',
      '```',
    ].join('\n')
    const { findings, unparsed } = parseCritique(text)
    expect(findings).toHaveLength(1)
    expect(findings[0]!.kind).toBe('personaje')
    expect(unparsed).toBe(2)
    expect(parseCritique('{"none":true}')).toEqual({ findings: [], unparsed: 0 })
  })

  it('corre con un transporte y devuelve hallazgos y uso', async () => {
    const { pack } = await openSession003()
    const result = await critique(new FakeTransport('{"turn":"003/2","kind":"canon","severity":"alta","quote":"Sale el sol","against":"Es de noche","why":"rompe la hora"}'), { pack, transcript: '...' })
    expect(result.findings).toHaveLength(1)
    expect(result.reply.finish).toBeDefined()
  })
})
