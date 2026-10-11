import { describe, expect, it } from 'vitest'
import { buildTurnContext } from './context.js'
import { contextFor, openSession003, response, turn } from './pilot.test-helpers.js'

/**
 * NPCs por sesion (docs/27, abierto): con `npcs` en la sesion el GM recibe
 * solo los que existen en ella, con lo que son ahora, y los demas por nombre
 * como ausentes. En la mesa 44 los recibia todos con la ficha de los 18 años.
 */
describe('NPCs por sesion', () => {
  it('sin npcs en la sesion entran todos los del pack, como siempre', async () => {
    const base = await openSession003()
    const fixed = buildTurnContext(contextFor(base, turn(2, [response('zahira', 'Miro.')]))).fixed
    for (const npc of base.pack.npcs.values()) expect(fixed).toContain(`(npc:${npc.id})`)
    expect(fixed).not.toContain('No están en esta sesión')
  })

  it('con npcs entran los presentes con su nota de la sesion; los demas, solo por nombre y como ausentes', async () => {
    const base = await openSession003()
    const [here, quiet, ...away] = [...base.pack.npcs.values()]
    expect(here && quiet && away.length).toBeTruthy()
    const sessions = new Map(base.pack.sessions)
    const session = { ...sessions.get('003')!, npcs: { [here!.id]: 'Diez años mayor y con una cicatriz nueva.', [quiet!.id]: null } }
    sessions.set('003', session)
    const ctx = contextFor({ ...base, pack: { ...base.pack, sessions } }, turn(2, [response('zahira', 'Miro.')]), { session })
    const fixed = buildTurnContext(ctx).fixed
    expect(fixed).toContain('NPCs de esta sesión')
    expect(fixed).toContain(`(npc:${here!.id})`)
    expect(fixed).toContain('En esta sesión: Diez años mayor y con una cicatriz nueva.')
    expect(fixed).toContain(`(npc:${quiet!.id})`)
    for (const npc of away) {
      expect(fixed).not.toContain(`(npc:${npc.id})`)
      expect(fixed.split('No están en esta sesión:')[1]).toContain(npc.name)
    }
  })
})
