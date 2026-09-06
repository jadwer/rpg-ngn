import { describe, expect, it } from 'vitest'
import { CampaignEvent } from './event.js'
import { eventVersion, upcastEvent } from './upcast.js'

/** seq 8 del piloto tal como se escribio el 2026-09-05, sin v, id ni recordedAt. */
const v0RollWithoutTimestamp = {
  seq: 8,
  type: 'roll',
  sessionId: '002',
  actor: 'character:zahira',
  resolved: { kind: 'skill', skill: 'orientarse', die: '1d20', advantage: true, rolls: [6, 12], result: 12, source: 'csprng:secrets' },
}

/** seq 1 del piloto: si trae recordedAt. */
const v0SessionStarted = {
  seq: 1,
  type: 'session_started',
  sessionId: '002',
  recordedAt: '2026-09-05T00:00:00Z',
  worldTime: 'Valdoria, mañana siguiente',
  payload: { party: ['character:calder', 'character:narivyl', 'character:zahira'] },
}

describe('upcastEvent v0 -> v1', () => {
  it('agrega v, id y conserva recordedAt cuando existe', () => {
    const result = upcastEvent(v0SessionStarted) as Record<string, unknown>

    expect(result['v']).toBe(1)
    expect(result['id']).toBe('evt-00001')
    expect(result['recordedAt']).toBe('2026-09-05T00:00:00Z')
    expect(result['recordedAtPrecision']).toBeUndefined()
    expect(Object.keys(result).slice(0, 3)).toEqual(['id', 'v', 'seq'])
    expect(CampaignEvent.safeParse(result).success).toBe(true)
  })

  it('completa recordedAt con el inicio de la sesion y lo marca como precision de sesion', () => {
    const result = upcastEvent(v0RollWithoutTimestamp, { sessionStartedAt: '2026-09-05T00:00:00Z' }) as Record<string, unknown>

    expect(result['id']).toBe('evt-00008')
    expect(result['recordedAt']).toBe('2026-09-05T00:00:00Z')
    expect(result['recordedAtPrecision']).toBe('session')
    expect(CampaignEvent.safeParse(result).success).toBe(true)
  })

  it('falla si no hay recordedAt ni contexto de sesion', () => {
    expect(() => upcastEvent(v0RollWithoutTimestamp)).toThrow(/recordedAt/)
  })

  it('deja intacto un evento que ya esta en la version vigente', () => {
    const v1 = upcastEvent(v0SessionStarted)

    expect(upcastEvent(v1)).toBe(v1)
    expect(eventVersion(v1)).toBe(1)
    expect(eventVersion(v0SessionStarted)).toBe(0)
  })
})
