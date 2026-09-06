import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { Character } from './character.js'
import { fsSource, pilotPackDir } from './fixtures.test-helpers.js'
import { loadPack } from './loader.js'
import { memorySource } from './source.js'

describe('loadPack sobre el pack piloto real', () => {
  it('carga las nueve fichas y las tres sesiones sin errores', async () => {
    const { pack, issues } = await loadPack(fsSource(pilotPackDir))

    expect(issues.filter((i) => i.level === 'error')).toEqual([])
    expect(pack).not.toBeNull()
    expect(pack!.characters.size).toBe(9)
    expect(pack!.sessions.size).toBe(3)
    expect(pack!.manifest.system).toBe('fantasy-d20-lite')
    expect(pack!.sessions.get('003')!.availableCharacters).toHaveLength(6)
  })

  it('rechaza una ficha con una clave que el schema no conoce', async () => {
    const raw = JSON.parse(await readFile(join(pilotPackDir, 'characters/zahira.json'), 'utf8')) as Record<string, unknown>
    raw['level'] = 3

    const result = Character.safeParse(raw)

    expect(result.success).toBe(false)
  })
})

describe('loadPack sobre packs en memoria', () => {
  const manifest = {
    id: 'mini',
    type: 'campaign',
    version: '0.1.0',
    name: 'Mini',
    system: 'fantasy-d20-lite',
    provenance: { class: 'original', authors: ['test'], sources: [], license: 'propietario', createdAt: '2026-09-05', updatedAt: '2026-09-05' },
    characters: ['ana'],
    sessions: ['001'],
  }
  const ana = {
    id: 'ana',
    name: 'Ana',
    race: 'Humana',
    class: 'Exploradora',
    age: '30 anios',
    quote: 'Vamos.',
    bio: 'Camina.',
    stats: { fue: 10, des: 14, con: 12, int: 10, sab: 12, car: 10 },
    hp: 10,
    ac: 12,
    attacks: [{ id: 'daga', name: 'Daga', use: 'des', damage: '1d4', damageType: 'perforante', range: 'cuerpo a cuerpo' }],
    abilities: [],
    skills: ['Sigilo'],
    roles: ['Exploracion'],
    goal: 'Llegar.',
    portrait: null,
  }
  const session = {
    id: '001',
    title: 'Uno',
    date: '2026-09-05',
    status: 'planned',
    briefing: 'Empieza.',
    howToPlay: ['Di que haces.'],
    fortune: [{ range: '1-20', label: 'Normal' }],
    party: [{ player: 'P', character: 'ana' }],
  }

  it('acepta un pack minimo coherente', async () => {
    const source = memorySource({
      'pack.json': JSON.stringify(manifest),
      'characters/ana.json': JSON.stringify(ana),
      'sessions/001.json': JSON.stringify(session),
    })

    const { pack, issues } = await loadPack(source)

    expect(issues).toEqual([])
    expect(pack?.characters.get('ana')?.name).toBe('Ana')
  })

  it('marca error cuando la party cita un personaje que no existe', async () => {
    const source = memorySource({
      'pack.json': JSON.stringify(manifest),
      'characters/ana.json': JSON.stringify(ana),
      'sessions/001.json': JSON.stringify({ ...session, party: [{ player: 'P', character: 'nadie' }] }),
    })

    const { pack, issues } = await loadPack(source)

    expect(pack).toBeNull()
    expect(issues).toContainEqual(expect.objectContaining({ level: 'error', path: 'sessions/001.json' }))
  })

  it('marca error cuando el retrato no existe y advierte de archivos no declarados', async () => {
    const source = memorySource({
      'pack.json': JSON.stringify(manifest),
      'characters/ana.json': JSON.stringify({ ...ana, portrait: 'portraits/ana.jpg' }),
      'characters/extra.json': JSON.stringify({ ...ana, id: 'extra' }),
      'sessions/001.json': JSON.stringify(session),
    })

    const { issues } = await loadPack(source)

    expect(issues).toContainEqual(expect.objectContaining({ level: 'error', message: expect.stringContaining('portraits/ana.jpg') }))
    expect(issues).toContainEqual(expect.objectContaining({ level: 'warning', path: 'characters/extra.json' }))
  })

  it('marca error cuando el id interno no coincide con el archivo', async () => {
    const source = memorySource({
      'pack.json': JSON.stringify(manifest),
      'characters/ana.json': JSON.stringify({ ...ana, id: 'otra' }),
      'sessions/001.json': JSON.stringify(session),
    })

    const { pack, issues } = await loadPack(source)

    expect(pack).toBeNull()
    expect(issues[0]?.message).toContain('no coincide')
  })
})
