import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { eventLog, PACK_VERSION, packBinaries, packFiles } from '../generated/pilot-pack'
import { loadOfflineCampaign, sessionList } from './offline'

const repoRoot = resolve(import.meta.dirname, '../../../..')

describe('pack empaquetado', () => {
  it('coincide byte a byte con content/packs/pilot y campaigns/pilot, sin la capa dm; si no, correr bundle-pack', () => {
    for (const [path, text] of Object.entries(packFiles)) {
      expect(path.startsWith('secrets/'), path).toBe(false)
      const original = readFileSync(join(repoRoot, 'content/packs/pilot', path), 'utf8')
      // El manifiesto empaquetado declara secrets vacio: los secretos nunca viajan al telefono.
      const expected = path === 'pack.json' ? JSON.stringify({ ...(JSON.parse(original) as object), secrets: [] }, null, 2) + '\n' : original
      expect(expected, path).toBe(text)
    }
    expect(JSON.stringify(packFiles)).not.toContain('secrets/')
    expect(readFileSync(join(repoRoot, 'campaigns/pilot/events.jsonl'), 'utf8')).toBe(eventLog)
    const manifest = JSON.parse(readFileSync(join(repoRoot, 'content/packs/pilot/pack.json'), 'utf8')) as { version: string }
    expect(manifest.version).toBe(PACK_VERSION)
    expect(packBinaries).toHaveLength(9)
  })

  it('carga, valida y reduce en memoria sin tocar disco', async () => {
    const campaign = await loadOfflineCampaign()
    expect(campaign.pack.characters.size).toBe(9)
    expect(sessionList(campaign.pack).map((s) => s.id)).toEqual(['001', '002', '003'])
    expect(campaign.events).toHaveLength(21)
    expect(campaign.state.world.characters['zahira']?.fortune).toEqual({ result: 6, tier: 'Incómodo' })
    expect(campaign.state.world.characters['calder']?.inventory.map((i) => i.id)).toEqual(['llave-de-hierro-sin-cerradura'])
    expect(campaign.issues.filter((i) => i.level === 'error')).toEqual([])
  })
})
