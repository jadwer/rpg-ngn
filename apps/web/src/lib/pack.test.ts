import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PACK_VERSION, packBinaries, packFiles } from '../generated/pilot-pack'
import { loadBundledPack, portraitUrl, RULESET_ID } from './pack'

const repoRoot = resolve(import.meta.dirname, '../../../..')

describe('pack empaquetado en la web', () => {
  it('coincide byte a byte con content/packs/pilot, sin la capa dm; si no, correr bundle-pack', () => {
    for (const [path, text] of Object.entries(packFiles)) {
      expect(path.startsWith('secrets/'), path).toBe(false)
      const original = readFileSync(join(repoRoot, 'content/packs/pilot', path), 'utf8')
      // El manifiesto empaquetado declara secrets vacio: los secretos nunca llegan al navegador.
      const expected = path === 'pack.json' ? JSON.stringify({ ...(JSON.parse(original) as object), secrets: [] }, null, 2) + '\n' : original
      expect(expected, path).toBe(text)
    }
    expect(JSON.stringify(packFiles)).not.toContain('secrets/')
    const manifest = JSON.parse(readFileSync(join(repoRoot, 'content/packs/pilot/pack.json'), 'utf8')) as { version: string }
    expect(manifest.version).toBe(PACK_VERSION)
    expect(packBinaries).toHaveLength(9)
    for (const path of packBinaries) {
      expect(() => readFileSync(join(resolve(import.meta.dirname, '../../public/packs/pilot'), path))).not.toThrow()
    }
  })

  it('carga y valida en memoria y resuelve retratos', async () => {
    const pack = await loadBundledPack()
    expect(pack.characters.size).toBe(9)
    expect(portraitUrl(pack.characters.get('zahira')?.portrait)).toBe('/packs/pilot/portraits/zahira.jpg')
    expect(portraitUrl(null)).toBeNull()
    expect(RULESET_ID).toBe('fantasy-d20-lite@1.0.0')
  })
})
