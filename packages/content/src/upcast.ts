import { EVENT_SCHEMA_VERSION, eventIdFor } from './event.js'

/**
 * Upcasting de eventos (BA1). El log es inmutable (regla 16), asi que un
 * evento escrito con un schema viejo se convierte al leerlo, con una cadena
 * de funciones puras por version. Cada paso tiene su fixture real en
 * upcast.test.ts.
 *
 * v0 -> v1 (eventos del piloto, sin `v` ni `id`):
 *   - `v: 1`
 *   - `id` derivado de `seq` (evt-00001)
 *   - `recordedAt` obligatorio; si falta se toma el inicio de la sesion y se
 *     marca `recordedAtPrecision: "session"`
 */

export interface UpcastContext {
  /** `recordedAt` del `session_started` de la sesion del evento, si se conoce. */
  sessionStartedAt?: string | undefined
}

type Raw = Record<string, unknown>

function isRecord(value: unknown): value is Raw {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function versionOf(raw: Raw): number {
  const v = raw['v']
  return typeof v === 'number' && Number.isInteger(v) && v >= 1 ? v : 0
}

const steps: Record<number, (raw: Raw, ctx: UpcastContext) => Raw> = {
  0: (raw, ctx) => {
    const seq = raw['seq']
    const next: Raw = { ...raw, v: 1 }

    if (typeof next['id'] !== 'string' && typeof seq === 'number') {
      next['id'] = eventIdFor(seq)
    }

    if (typeof next['recordedAt'] !== 'string') {
      if (!ctx.sessionStartedAt) {
        throw new Error(`upcast v0->v1: el evento seq ${String(seq)} no tiene recordedAt y no se conoce el inicio de su sesion`)
      }
      next['recordedAt'] = ctx.sessionStartedAt
      next['recordedAtPrecision'] = 'session'
    }

    return orderKeys(next)
  },
}

/** Pone id, v y seq al frente para que el jsonl se lea con la vista. */
function orderKeys(raw: Raw): Raw {
  const { id, v, seq, type, sessionId, recordedAt, recordedAtPrecision, ...rest } = raw
  const ordered: Raw = { id, v, seq, type, sessionId, recordedAt }
  if (recordedAtPrecision !== undefined) ordered['recordedAtPrecision'] = recordedAtPrecision
  return { ...ordered, ...rest }
}

/**
 * Lleva un evento crudo a la version vigente del schema. No valida: eso lo
 * hace CampaignEvent.parse despues. Devuelve el mismo objeto si ya esta al
 * dia.
 */
export function upcastEvent(raw: unknown, ctx: UpcastContext = {}): unknown {
  if (!isRecord(raw)) return raw

  let current = raw
  let version = versionOf(current)

  while (version < EVENT_SCHEMA_VERSION) {
    const step = steps[version]
    if (!step) {
      throw new Error(`upcast: no hay paso definido de v${version} a v${version + 1}`)
    }
    current = step(current, ctx)
    version = versionOf(current)
  }

  return current
}

export function eventVersion(raw: unknown): number {
  return isRecord(raw) ? versionOf(raw) : 0
}
