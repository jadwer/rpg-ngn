import { describe, expect, it } from 'vitest'
import { onlineSheetEntries, sheetSourceFrom, sheetSourceOf } from './sheet-source.js'
import { loadPilot } from './pilot.test-helpers.js'

describe('fichas desde el pack o desde la API', () => {
  it('la fuente de la API da las mismas entradas que el pack empaquetado', async () => {
    const { pack } = await loadPilot()
    const bundled = sheetSourceOf(pack)
    const remote = sheetSourceFrom({ characters: bundled.characters, sessions: [...pack.sessions.values()] })
    const members = [{ characterId: 'zahira', userName: 'Jaz' }]
    const input = { sessionCode: '003', members, viewerCharacterId: 'zahira', own: undefined, world: undefined }

    const a = onlineSheetEntries({ source: bundled, ...input })
    const b = onlineSheetEntries({ source: remote, ...input })
    expect(b.map((e) => [e.character.id, e.slot.kind, e.visibility.veiled, e.mine])).toEqual(a.map((e) => [e.character.id, e.slot.kind, e.visibility.veiled, e.mine]))
    expect(a.find((e) => e.character.id === 'zahira')).toMatchObject({ slot: { kind: 'taken', player: 'Jaz' }, mine: true })
  })

  it('sin sesion abierta nadie esta velado y todos los libres quedan ausentes', async () => {
    const source = sheetSourceOf((await loadPilot()).pack)
    const entries = onlineSheetEntries({ source, sessionCode: null, members: [], viewerCharacterId: null, own: undefined, world: undefined })
    expect(entries.every((e) => !e.visibility.veiled && e.slot.kind === 'absent' && e.muted)).toBe(true)
  })
})
