import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { fsSource, pilotPackDir } from './fixtures.test-helpers.js'
import type { Issue } from './issues.js'
import { loadPack } from './loader.js'
import { applyOverlay } from './overlay.js'
import { memorySource } from './source.js'

const base = {
  id: 'zahira',
  name: 'Zahira',
  race: 'Enana',
  portrait: 'portraits/zahira.webp',
  hp: 13,
  skills: ['Atletismo', 'Historia'],
  attacks: [
    { id: 'hacha', name: 'Hacha de guerra', damage: '1d8' },
    { id: 'martillo', name: 'Martillo arrojadizo', damage: '1d6' },
  ],
}

describe('applyOverlay (i18n de packs)', () => {
  it('traduce textos, casa listas por id y sustituye las listas de textos', () => {
    const issues: Issue[] = []
    const merged = applyOverlay(base, { race: 'Dwarf', skills: ['Athletics', 'History'], attacks: [{ id: 'martillo', name: 'Throwing hammer' }] }, 'i18n/en/x.json', issues)

    expect(merged).toEqual({
      ...base,
      race: 'Dwarf',
      skills: ['Athletics', 'History'],
      attacks: [base.attacks[0], { id: 'martillo', name: 'Throwing hammer', damage: '1d6' }],
    })
    expect(issues).toEqual([])
  })

  it('no deja traducir ids, archivos, numeros ni claves que el original no tiene', () => {
    const issues: Issue[] = []
    const merged = applyOverlay(base, { id: 'otra', portrait: 'portraits/otra.webp', hp: 99, level: 3, attacks: [{ id: 'arco', name: 'Bow' }] }, 'i18n/en/x.json', issues)

    expect(merged).toEqual(base)
    expect(issues.map((i) => i.message)).toEqual([
      'portrait: portraits/zahira.webp es una referencia o un archivo y no se traduce',
      'hp: solo se traducen textos; se ignora',
      'level: el original no tiene esa clave; se ignora',
      'attacks: arco no esta en el original; se ignora',
    ])
  })
})

describe('loadPack con idioma', async () => {
  const manifest = JSON.parse(await readFile(join(pilotPackDir, 'pack.json'), 'utf8')) as Record<string, unknown>
  const files = (overlay: string | null): Record<string, string> => ({
    'pack.json': JSON.stringify({ ...manifest, name: 'Mini', characters: [], npcs: [], locations: [], maps: [], quests: [], sessions: [], secrets: [], catalog: undefined, translations: overlay ? ['en'] : [] }),
    ...(overlay ? { 'i18n/en/pack.json': overlay } : {}),
  })

  it('sin traduccion, o con una traduccion rota, carga el original', async () => {
    const plain = await loadPack(memorySource(files(null)), { language: 'en' })
    expect(plain.pack?.manifest.name).toBe('Mini')

    const broken = await loadPack(memorySource(files('{ no es json')), { language: 'en' })
    expect(broken.pack?.manifest.name).toBe('Mini')
    expect(broken.issues.some((i) => i.level === 'warning' && i.path === 'i18n/en/pack.json')).toBe(true)
  })

  it('con idioma, el manifiesto sale traducido; sin idioma, el original', async () => {
    const source = memorySource(files(JSON.stringify({ name: 'Tiny' })))
    expect((await loadPack(source, { language: 'en' })).pack?.manifest.name).toBe('Tiny')
    expect((await loadPack(source)).pack?.manifest.name).toBe('Mini')
  })

  it('una traduccion que el pack no declara no se aplica, y una declarada que falta es error', async () => {
    const undeclared = memorySource({ ...files(null), 'i18n/en/pack.json': JSON.stringify({ name: 'Tiny' }) })
    const loaded = await loadPack(undeclared, { language: 'en' })
    expect(loaded.pack?.manifest.name).toBe('Mini')
    expect(loaded.pack?.language).toBe('es')

    const missing = memorySource({ 'pack.json': JSON.stringify({ ...manifest, characters: [], npcs: [], locations: [], maps: [], quests: [], sessions: [], secrets: [], catalog: undefined, translations: ['en'] }) })
    const result = await loadPack(missing)
    expect(result.pack).toBeNull()
    expect(result.issues.map((i) => i.message)).toContain('translations declara en y falta i18n/en/pack.json')
  })

  it('el pack piloto carga en ingles sin errores ni avisos de la traduccion', async () => {
    const { pack, issues } = await loadPack(fsSource(pilotPackDir), { language: 'en' })

    expect(issues.filter((i) => i.level === 'error' || i.path.startsWith('i18n/'))).toEqual([])
    expect(pack!.characters.get('zahira')!.race).toBe('Dwarf')
    expect(pack!.characters.size).toBe(9)
    expect(pack!.language).toBe('en')
    expect(pack!.manifest.translations).toEqual(['en'])
  })
})
