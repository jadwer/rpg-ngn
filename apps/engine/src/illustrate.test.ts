import { join, resolve } from 'node:path'
import { initialState, type CampaignState } from '@rpg-ngn/campaign'
import type { LoadedPack } from '@rpg-ngn/content'
import { resolveRuleset } from '@rpg-ngn/rules'
import { beforeAll, describe, expect, it } from 'vitest'
import { illustrationFor, partyLocation } from './illustrate.js'
import { PackStore } from './packs.js'

const repoRoot = resolve(import.meta.dirname, '../../..')
let pack: LoadedPack
let base: CampaignState

function at(state: CampaignState, where: Record<string, string>): CampaignState {
  const characters = { ...state.world.characters }
  for (const [id, location] of Object.entries(where)) characters[id] = { ...characters[id]!, location }
  return { ...state, world: { ...state.world, characters } }
}

beforeAll(async () => {
  pack = await new PackStore(join(repoRoot, 'content/packs')).get({ id: 'pilot', version: '0.4.0' })
  base = initialState({ pack, ruleset: resolveRuleset('fantasy-d20-lite@1.0.0') })
})

describe('illustrationFor', () => {
  const party = ['zahira', 'calder']

  it('la apertura ilustra el lugar con quien esta y sus retratos de referencia', () => {
    const after = at(base, { zahira: 'posada', calder: 'posada' })
    const illustration = illustrationFor({ pack, before: base, after, party, opening: true, moment: null })

    expect(illustration).toMatchObject({ reason: 'opening', location: 'posada', withCharacters: true, references: ['portraits/zahira.webp', 'portraits/calder.webp'] })
    expect(illustration?.prompt).toContain('Zahira')
    expect(illustration?.prompt).toContain('Sin texto')
  })

  it('sin moverse ni momento no hay nada que ilustrar; al cambiar de lugar si', () => {
    const inn = at(base, { zahira: 'posada', calder: 'posada' })
    expect(illustrationFor({ pack, before: inn, after: inn, party, opening: false, moment: null })).toBeNull()

    const mine = at(inn, { zahira: 'boca-de-la-mina', calder: 'boca-de-la-mina' })
    expect(illustrationFor({ pack, before: inn, after: mine, party, opening: false, moment: null })).toMatchObject({ reason: 'location', location: 'boca-de-la-mina' })
  })

  it('el momento del DM manda y es el texto alternativo', () => {
    const inn = at(base, { zahira: 'posada', calder: 'posada' })
    const illustration = illustrationFor({ pack, before: inn, after: inn, party, opening: false, moment: 'Una figura de niebla gris se forma junto a la chimenea.' })

    expect(illustration?.reason).toBe('moment')
    expect(illustration?.alt).toBe('Una figura de niebla gris se forma junto a la chimenea.')
    expect(illustration?.prompt.startsWith('Escena: Una figura de niebla gris')).toBe(true)
  })

  it('el lugar de la party es donde esta la mayoria', () => {
    expect(partyLocation(at(base, { zahira: 'posada', calder: 'posada', narivyl: 'boca-de-la-mina' }), ['zahira', 'calder', 'narivyl'])).toBe('posada')
    expect(partyLocation(base, party)).toBeNull()
  })
})
