import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PACK_VERSION, packBinaries, packFiles } from '../generated/pilot-pack'
import { characterName, loadBundledPack, portraitUrl, RULESET_ID, sessionList } from './pack'

const repoRoot = resolve(import.meta.dirname, '../../../..')

describe('pack empaquetado en la web', () => {
  it('coincide byte a byte con content/packs/pilot; si no, correr bundle-pack', () => {
    for (const [path, text] of Object.entries(packFiles)) {
      expect(readFileSync(join(repoRoot, 'content/packs/pilot', path), 'utf8'), path).toBe(text)
    }
    const manifest = JSON.parse(readFileSync(join(repoRoot, 'content/packs/pilot/pack.json'), 'utf8')) as { version: string }
    expect(manifest.version).toBe(PACK_VERSION)
    expect(packBinaries).toHaveLength(9)
    for (const path of packBinaries) {
      expect(() => readFileSync(join(resolve(import.meta.dirname, '../../public/packs/pilot'), path))).not.toThrow()
    }
  })

  it('carga y valida en memoria y resuelve nombres y retratos', async () => {
    const pack = await loadBundledPack()
    expect(pack.characters.size).toBe(9)
    expect(sessionList(pack).map((s) => s.id)).toEqual(['001', '002', '003'])
    expect(characterName(pack, 'zahira')).toBe('Zahira')
    expect(characterName(pack, 'nadie')).toBe('nadie')
    expect(characterName(pack, null)).toBeNull()
    expect(portraitUrl(pack.characters.get('zahira')?.portrait)).toBe('/packs/pilot/portraits/zahira.jpg')
    expect(portraitUrl(null)).toBeNull()
    expect(RULESET_ID).toBe('fantasy-d20-lite@1.0.0')
  })
})
