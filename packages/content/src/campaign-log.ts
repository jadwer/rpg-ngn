import { refId, refKind } from './common.js'
import { CampaignEvent, eventIdFor } from './event.js'
import { zodIssues, type Issue } from './issues.js'
import type { LoadedPack } from './loader.js'
import { upcastEvent } from './upcast.js'

/**
 * Lee un log de eventos (una linea JSON por evento, append-only), lleva cada
 * evento a la version vigente del schema y valida forma y referencias.
 *
 * Invariantes que revisa:
 *   - `seq` contiguo desde 1
 *   - `id` unico
 *   - `sessionId` declarado en el pack, con `session_started` antes que
 *     cualquier otro evento de esa sesion y `session_closed` al final
 *   - `character:*` en actor, targets y party existen en el pack
 *   - `npc:*` que no esta en el pack es advertencia (puede vivir en dm/)
 *   - `rollRefs` y `discovery.payload.sourceEvent` apuntan a ids anteriores
 */

export interface ParsedEventLog {
  events: CampaignEvent[]
  issues: Issue[]
}

export interface ParseEventLogOptions {
  pack?: LoadedPack | undefined
  /** Nombre del archivo para los mensajes. */
  path?: string | undefined
}

interface RawLine {
  line: number
  raw: Record<string, unknown>
}

export function parseEventLog(text: string, options: ParseEventLogOptions = {}): ParsedEventLog {
  const path = options.path ?? 'events.jsonl'
  const issues: Issue[] = []
  const rawLines: RawLine[] = []

  text.split(/\r?\n/).forEach((content, index) => {
    if (content.trim() === '') return
    const line = index + 1
    try {
      const parsed: unknown = JSON.parse(content)
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        issues.push({ level: 'error', path: `${path}:${line}`, message: 'cada linea debe ser un objeto JSON' })
        return
      }
      rawLines.push({ line, raw: parsed as Record<string, unknown> })
    } catch (error) {
      issues.push({ level: 'error', path: `${path}:${line}`, message: `JSON invalido (${(error as Error).message})` })
    }
  })

  // Inicio de cada sesion, para completar recordedAt en eventos v0.
  const sessionStartedAt = new Map<string, string>()
  for (const { raw } of rawLines) {
    if (raw['type'] === 'session_started' && typeof raw['sessionId'] === 'string' && typeof raw['recordedAt'] === 'string') {
      sessionStartedAt.set(raw['sessionId'], raw['recordedAt'])
    }
  }

  const events: CampaignEvent[] = []
  for (const { line, raw } of rawLines) {
    const where = `${path}:${line}`
    let upcast: unknown
    try {
      const sessionId = typeof raw['sessionId'] === 'string' ? raw['sessionId'] : ''
      upcast = upcastEvent(raw, { sessionStartedAt: sessionStartedAt.get(sessionId) })
    } catch (error) {
      issues.push({ level: 'error', path: where, message: (error as Error).message })
      continue
    }

    const result = CampaignEvent.safeParse(upcast)
    if (!result.success) {
      issues.push(...zodIssues(result.error, where))
      continue
    }
    events.push(result.data)
  }

  checkSequence(events, path, issues)
  checkSessions(events, options.pack, path, issues)
  checkReferences(events, options.pack, path, issues)

  return { events, issues }
}

function checkSequence(events: CampaignEvent[], path: string, issues: Issue[]): void {
  const ids = new Set<string>()
  events.forEach((event, index) => {
    const expected = index + 1
    if (event.seq !== expected) {
      issues.push({ level: 'error', path: `${path}#${event.id}`, message: `seq ${event.seq} fuera de orden; se esperaba ${expected}` })
    }
    if (ids.has(event.id)) {
      issues.push({ level: 'error', path: `${path}#${event.id}`, message: 'id duplicado' })
    }
    ids.add(event.id)
    if (event.id !== eventIdFor(event.seq)) {
      issues.push({ level: 'warning', path: `${path}#${event.id}`, message: `el id no sigue la forma ${eventIdFor(event.seq)} derivada de seq` })
    }
  })
}

function checkSessions(events: CampaignEvent[], pack: LoadedPack | undefined, path: string, issues: Issue[]): void {
  const open = new Set<string>()
  const closed = new Set<string>()

  for (const event of events) {
    const where = `${path}#${event.id}`
    if (pack && !pack.manifest.sessions.includes(event.sessionId)) {
      issues.push({ level: 'error', path: where, message: `sessionId ${event.sessionId} no esta declarado en pack.json` })
    }

    if (event.type === 'session_started') {
      if (open.has(event.sessionId) || closed.has(event.sessionId)) {
        issues.push({ level: 'error', path: where, message: `la sesion ${event.sessionId} ya habia empezado` })
      }
      open.add(event.sessionId)
      continue
    }

    if (!open.has(event.sessionId)) {
      issues.push({ level: 'error', path: where, message: `evento de la sesion ${event.sessionId} antes de su session_started (o despues de cerrarla)` })
    }

    if (event.type === 'session_closed') {
      open.delete(event.sessionId)
      closed.add(event.sessionId)
    }
  }
}

function checkReferences(events: CampaignEvent[], pack: LoadedPack | undefined, path: string, issues: Issue[]): void {
  const seen = new Set<string>()

  for (const event of events) {
    const where = `${path}#${event.id}`
    const refs: string[] = []
    if (event.actor) refs.push(event.actor)
    if (event.targets) refs.push(...event.targets)
    if (event.visibility?.witnesses) refs.push(...event.visibility.witnesses)
    if (event.knowledgeGranted) refs.push(...event.knowledgeGranted.map((k) => k.to))
    if (event.type === 'session_started') refs.push(...event.payload.party)
    if (event.type === 'roll' && event.resolved.target) refs.push(event.resolved.target)

    if (pack) {
      for (const ref of refs) {
        const kind = refKind(ref)
        const id = refId(ref)
        if (kind === 'character' && !pack.characters.has(id)) {
          issues.push({ level: 'error', path: where, message: `${ref} no existe en el pack` })
        } else if (kind === 'npc' && !pack.npcs.has(id)) {
          issues.push({ level: 'warning', path: where, message: `${ref} no esta en el pack (puede vivir en las notas del DM)` })
        } else if (kind === 'location' && !pack.locations.has(id)) {
          issues.push({ level: 'warning', path: where, message: `${ref} no esta en el pack` })
        }
      }
    }

    for (const rollRef of event.rollRefs ?? []) {
      if (!seen.has(rollRef)) {
        issues.push({ level: 'error', path: where, message: `rollRefs cita ${rollRef}, que no existe antes en el log` })
      }
    }

    if (event.type === 'discovery' && event.payload.sourceEvent && !seen.has(event.payload.sourceEvent)) {
      issues.push({ level: 'error', path: where, message: `sourceEvent ${event.payload.sourceEvent} no existe antes en el log` })
    }

    if (event.type === 'correction' && !seen.has(event.payload.corrects)) {
      issues.push({ level: 'error', path: where, message: `correction apunta a ${event.payload.corrects}, que no existe antes en el log` })
    }

    seen.add(event.id)
  }
}

/** Serializa eventos como jsonl, una linea compacta por evento. */
export function formatEventLog(events: readonly unknown[]): string {
  return events.map((event) => JSON.stringify(event)).join('\n') + '\n'
}
