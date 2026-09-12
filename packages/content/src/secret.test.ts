import { describe, expect, it } from 'vitest'
import { formatEventLog, parseEventLog } from './campaign-log.js'
import { CampaignEvent } from './event.js'
import { fsSource, pilotPackDir } from './fixtures.test-helpers.js'
import { loadPack } from './loader.js'
import { isManualReveal, Secret } from './secret.js'
import { memorySource } from './source.js'

const manifest = {
  id: 'mini',
  type: 'campaign',
  version: '0.1.0',
  name: 'Mini',
  system: 'fantasy-d20-lite',
  provenance: { class: 'original', authors: ['test'], sources: [], license: 'propietario', createdAt: '2026-09-05', updatedAt: '2026-09-05' },
  characters: ['ana'],
  sessions: ['001'],
  secrets: ['pozo'],
}
const ana = {
  id: 'ana', name: 'Ana', race: 'Humana', class: 'Exploradora', age: '30 anios', quote: 'Vamos.', bio: 'Camina.',
  stats: { fue: 10, des: 14, con: 12, int: 10, sab: 12, car: 10 }, hp: 10, ac: 12,
  attacks: [{ id: 'daga', name: 'Daga', use: 'des', damage: '1d4', damageType: 'perforante', range: 'cuerpo a cuerpo' }],
  abilities: [], skills: ['Sigilo'], roles: ['Exploracion'], goal: 'Llegar.', portrait: null,
}
const session = { id: '001', title: 'Uno', date: '2026-09-05', status: 'planned', briefing: 'Empieza.', howToPlay: ['Di que haces.'], fortune: [{ range: '1-20', label: 'Normal' }], party: [{ player: 'P', character: 'ana' }] }
const pozo = { id: 'pozo', about: 'location:pozo', text: 'El pozo no tiene fondo.', keywords: ['sin fondo'], revealWhen: { manual: true } }

function mini(extra: Record<string, string> = {}, secret: Record<string, unknown> = pozo) {
  return memorySource({
    'pack.json': JSON.stringify(manifest),
    'characters/ana.json': JSON.stringify(ana),
    'sessions/001.json': JSON.stringify(session),
    'secrets/pozo.json': JSON.stringify(secret),
    ...extra,
  })
}

describe('Secret', () => {
  it('acepta condicion por evento y condicion manual, y rechaza claves desconocidas', () => {
    expect(Secret.safeParse(pozo).success).toBe(true)
    expect(Secret.safeParse({ ...pozo, revealWhen: { event: 'discovery', fact: 'fact:pozo' } }).success).toBe(true)
    expect(Secret.safeParse({ ...pozo, revealWhen: { event: 'nada' } }).success).toBe(false)
    expect(Secret.safeParse({ ...pozo, about: 'player:ana' }).success).toBe(false)
    expect(Secret.safeParse({ ...pozo, keywords: [] }).success).toBe(false)
    expect(Secret.safeParse({ ...pozo, spoiler: true }).success).toBe(false)
    expect(isManualReveal({ manual: true })).toBe(true)
    expect(isManualReveal({ event: 'discovery' })).toBe(false)
  })
})

describe('loadPack con secretos', () => {
  it('el pack piloto carga sus dos secretos y avisa de los NPC que solo viven en la cronica', async () => {
    const { pack, issues } = await loadPack(fsSource(pilotPackDir))

    expect(issues.filter((i) => i.level === 'error')).toEqual([])
    expect([...pack!.secrets.keys()].sort()).toEqual(['brorg-pago-por-zahira', 'osric-esta-abajo'])
    expect(pack!.secrets.get('osric-esta-abajo')?.revealWhen).toEqual({ manual: true })
    expect(pack!.secrets.get('brorg-pago-por-zahira')?.revealWhen).toEqual({ event: 'discovery', fact: 'fact:brorg-pago-por-zahira' })
    expect(issues).toContainEqual(expect.objectContaining({ level: 'warning', path: 'secrets/osric-esta-abajo.json', message: expect.stringContaining('npc:osric') }))
  })

  it('carga la coleccion secrets/ de un pack en memoria', async () => {
    const { pack, issues } = await loadPack(mini())

    expect(issues.filter((i) => i.level === 'error')).toEqual([])
    expect(pack?.secrets.get('pozo')?.text).toBe('El pozo no tiene fondo.')
  })

  it('un secreto sobre un personaje que no existe es error', async () => {
    const { pack, issues } = await loadPack(mini({}, { ...pozo, about: 'character:nadie' }))

    expect(pack).toBeNull()
    expect(issues).toContainEqual(expect.objectContaining({ level: 'error', path: 'secrets/pozo.json', message: 'character:nadie no existe en el pack' }))
  })
})

describe('secret_revealed', () => {
  const started = { id: 'evt-00001', v: 1, seq: 1, type: 'session_started', sessionId: '001', recordedAt: '2026-09-05T00:00:00Z', payload: { party: ['character:ana'] } }
  const revealed = {
    id: 'evt-00002', v: 1, seq: 2, type: 'secret_revealed', sessionId: '001', recordedAt: '2026-09-05T00:00:00Z',
    visibility: { layer: 'campaign', witnesses: ['character:ana'] },
    payload: { secretId: 'pozo', how: 'lo leyo en la piedra' },
  }

  it('exige testigos', () => {
    expect(CampaignEvent.safeParse(revealed).success).toBe(true)
    expect(CampaignEvent.safeParse({ ...revealed, visibility: { layer: 'campaign' } }).success).toBe(false)
    expect(CampaignEvent.safeParse({ ...revealed, visibility: undefined }).success).toBe(false)
  })

  it('el log valida que el secreto exista en el pack', async () => {
    const { pack } = await loadPack(mini())

    const ok = parseEventLog(formatEventLog([started, revealed]), { pack: pack! })
    expect(ok.issues.filter((i) => i.level === 'error')).toEqual([])

    const missing = parseEventLog(formatEventLog([started, { ...revealed, payload: { secretId: 'inventado' } }]), { pack: pack! })
    expect(missing.issues).toContainEqual(expect.objectContaining({ level: 'error', message: expect.stringContaining('inventado') }))
  })
})
