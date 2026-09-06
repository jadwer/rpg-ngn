import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { formatEventLog, parseEventLog } from './campaign-log.js'
import { fsSource, pilotLogPath, pilotPackDir } from './fixtures.test-helpers.js'
import { loadPack } from './loader.js'

async function pilot() {
  const { pack } = await loadPack(fsSource(pilotPackDir))
  const text = await readFile(pilotLogPath, 'utf8')
  return { pack: pack!, text }
}

describe('parseEventLog sobre el log real del piloto', () => {
  it('valida los 21 eventos contra el pack sin errores', async () => {
    const { pack, text } = await pilot()

    const { events, issues } = parseEventLog(text, { pack, path: 'campaigns/pilot/events.jsonl' })

    expect(issues.filter((i) => i.level === 'error')).toEqual([])
    expect(events).toHaveLength(21)
    expect(events[0]?.type).toBe('session_started')
    expect(events.at(-1)?.type).toBe('session_closed')
    expect(events.every((e) => e.v === 1 && e.id.startsWith('evt-'))).toBe(true)
  })

  it('advierte de los NPC que no estan en el pack en vez de fallar', async () => {
    const { pack, text } = await pilot()

    const { issues } = parseEventLog(text, { pack })

    expect(issues.some((i) => i.level === 'warning' && i.message.includes('npc:osric'))).toBe(true)
  })

  it('es idempotente: el log ya migrado se vuelve a parsear igual', async () => {
    const { pack, text } = await pilot()
    const first = parseEventLog(text, { pack })

    const second = parseEventLog(formatEventLog(first.events), { pack })

    expect(second.issues.filter((i) => i.level === 'error')).toEqual([])
    expect(second.events).toEqual(first.events)
  })
})

describe('parseEventLog detecta logs rotos', () => {
  const started = { id: 'evt-00001', v: 1, seq: 1, type: 'session_started', sessionId: '002', recordedAt: '2026-09-05T00:00:00Z', payload: { party: ['character:zahira'] } }
  const roll = { id: 'evt-00002', v: 1, seq: 2, type: 'roll', sessionId: '002', recordedAt: '2026-09-05T00:00:00Z', actor: 'character:zahira', resolved: { kind: 'skill', die: '1d20', result: 12, source: 'csprng:secrets' } }

  it('seq duplicado o con hueco', () => {
    const { issues } = parseEventLog(formatEventLog([started, { ...roll, seq: 5, id: 'evt-00005' }]))

    expect(issues).toContainEqual(expect.objectContaining({ level: 'error', message: expect.stringContaining('fuera de orden') }))
  })

  it('id duplicado', () => {
    const { issues } = parseEventLog(formatEventLog([started, { ...roll, id: 'evt-00001' }]))

    expect(issues).toContainEqual(expect.objectContaining({ level: 'error', message: 'id duplicado' }))
  })

  it('evento antes de session_started', () => {
    const { issues } = parseEventLog(formatEventLog([{ ...roll, seq: 1, id: 'evt-00001' }]))

    expect(issues).toContainEqual(expect.objectContaining({ level: 'error', message: expect.stringContaining('session_started') }))
  })

  it('personaje que no existe en el pack', async () => {
    const { pack } = await pilot()

    const { issues } = parseEventLog(formatEventLog([started, { ...roll, actor: 'character:nadie' }]), { pack })

    expect(issues).toContainEqual(expect.objectContaining({ level: 'error', message: 'character:nadie no existe en el pack' }))
  })

  it('rollRefs y correction hacia ids que no existen', () => {
    const correction = { id: 'evt-00003', v: 1, seq: 3, type: 'correction', sessionId: '002', recordedAt: '2026-09-05T00:00:00Z', payload: { corrects: 'evt-00099', reason: 'error', patch: {} } }

    const { issues } = parseEventLog(formatEventLog([started, { ...roll, rollRefs: ['evt-00042'] }, correction]))

    expect(issues.filter((i) => i.level === 'error')).toHaveLength(2)
  })

  it('una linea que no es JSON no tumba el resto', () => {
    const { events, issues } = parseEventLog(`${JSON.stringify(started)}\n{esto no es json}\n${JSON.stringify(roll)}\n`)

    expect(events).toHaveLength(2)
    expect(issues).toContainEqual(expect.objectContaining({ level: 'error', path: 'events.jsonl:2' }))
  })

  it('rechaza claves desconocidas en un tipo con schema propio', () => {
    const { issues } = parseEventLog(formatEventLog([started, { ...roll, extra: true }]))

    expect(issues.some((i) => i.level === 'error' && i.message.includes('extra'))).toBe(true)
  })
})
