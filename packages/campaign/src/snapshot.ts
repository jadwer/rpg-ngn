import { stableStringify } from '@rpg-ngn/core'
import type { CampaignState } from './state.js'

/**
 * Snapshot: el estado canonico congelado al cierre de una sesion (BA2). No
 * es cache: si un replay con otra version del ruleset produce otra cosa,
 * gana el snapshot y el sistema alerta divergencia.
 */
export interface Snapshot {
  sessionId: string
  seq: number
  packId: string
  packVersion: string
  ruleset: string
  state: CampaignState
}

export function takeSnapshot(state: CampaignState, sessionId: string): Snapshot {
  const session = state.meta.sessions[sessionId]
  if (!session || session.status !== 'closed') {
    throw new Error(`no se puede tomar snapshot: la sesion ${sessionId} no esta cerrada`)
  }
  return {
    sessionId,
    seq: state.meta.headSeq,
    packId: state.meta.packId,
    packVersion: state.meta.packVersion,
    ruleset: state.meta.ruleset,
    state,
  }
}

export function serializeSnapshot(snapshot: Snapshot): string {
  return stableStringify(snapshot)
}

export interface Divergence {
  path: string
  expected: unknown
  actual: unknown
}

/**
 * Compara un replay contra el snapshot canonico. Devuelve las rutas que
 * difieren; vacio si coinciden byte a byte.
 */
export function diffSnapshot(canonical: Snapshot, replay: Snapshot): Divergence[] {
  const divergences: Divergence[] = []
  walk(JSON.parse(serializeSnapshot(canonical)), JSON.parse(serializeSnapshot(replay)), '', divergences)
  return divergences
}

function walk(expected: unknown, actual: unknown, path: string, out: Divergence[]): void {
  if (isObject(expected) && isObject(actual)) {
    const keys = new Set([...Object.keys(expected), ...Object.keys(actual)])
    for (const key of keys) {
      walk(expected[key], actual[key], path ? `${path}.${key}` : key, out)
    }
    return
  }
  if (Array.isArray(expected) && Array.isArray(actual) && expected.length === actual.length) {
    expected.forEach((item, index) => walk(item, actual[index], `${path}[${index}]`, out))
    return
  }
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    out.push({ path, expected, actual })
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
