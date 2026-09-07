import type { LoadedPack } from '@rpg-ngn/content'
import type { TurnBlock as ApiBlock } from '@rpg-ngn/engine-contract'
import type { Speaker, TurnBlock } from './blocks.js'
import { packSpeaker } from './session-blocks.js'

/**
 * Turno online (docs/09, "Respuesta y cierre de turno"; docs/11, D5). Dos
 * cosas sin React: convertir los bloques que la API guarda del engine en
 * bloques de ui-logic, y decidir que muestra el cuadro de respuesta segun
 * el estado del turno y quien mira.
 */

/** Un bloque tal como lo devuelve `GET /tables/{id}/state`: id creciente y el bloque del contrato. */
export interface ApiBlockEnvelope {
  id: number
  block: ApiBlock
}

/** Resuelve un `speakerRef` (`character:zahira`) a nombre y retrato; `name` es lo que el engine escribio. */
export type SpeakerResolver = (ref: string | null, name: string | null) => Speaker

export function apiBlockId(id: number): string {
  return `api:${id}`
}

/** Resolver sobre el pack empaquetado: retratos y nombres del pack, o el nombre del engine si no esta. */
export function packSpeakerResolver(pack: LoadedPack | null): SpeakerResolver {
  return (ref, name) => {
    const fromPack = ref && pack ? packSpeaker(ref, pack) : null
    if (fromPack && (fromPack.portrait || !name)) return fromPack
    return { ref: ref ?? `unknown:${name ?? '?'}`, name: name ?? fromPack?.name ?? '?', portrait: fromPack?.portrait ?? null }
  }
}

export function blockFromApi(envelope: ApiBlockEnvelope, resolve: SpeakerResolver): TurnBlock {
  const id = apiBlockId(envelope.id)
  const block = envelope.block
  switch (block.type) {
    case 'narration':
      return { kind: 'narration', id, text: block.text }
    case 'dialogue':
      return { kind: 'dialogue', id, speaker: resolve(block.speakerRef, block.speaker), text: block.text }
    case 'roll': {
      const actor = block.actor ? (block.actor.includes(':') ? resolve(block.actor, null) : resolve(null, block.actor)) : null
      return { kind: 'roll', id, actor, rollKind: 'roll', die: block.die, result: block.result, label: block.die ? `Tirada ${block.die}` : 'Tirada', advantage: null, text: block.text }
    }
    case 'system':
      return { kind: 'system', id, title: null, text: block.text, items: [] }
  }
}

export function blocksFromApi(envelopes: readonly ApiBlockEnvelope[], resolve: SpeakerResolver): TurnBlock[] {
  return envelopes.map((envelope) => blockFromApi(envelope, resolve))
}

/** Lo que el cuadro de respuesta necesita saber del turno; coincide con `TurnView` de api-client. */
export interface TurnSummary {
  status: 'open' | 'closing' | 'resolving' | 'resolved'
  required: readonly string[]
  responded: readonly string[]
  error: string | null
}

export interface Viewer {
  role: 'dm' | 'player'
  characterId: string | null
}

export interface TurnProgress {
  /** Interpelados que faltan (`required` menos `responded`). */
  pending: string[]
  /** Quien ya respondio, en el orden de la API. */
  responded: string[]
  /** No falta nadie de los obligatorios. */
  complete: boolean
  /** `closing` o `resolving`: el DM esta narrando. */
  narrating: boolean
  /** El que mira puede escribir: turno abierto, tiene personaje y no ha respondido. */
  canRespond: boolean
  /** Ya respondio en este turno. */
  hasResponded: boolean
  /** Cualquiera cierra cuando estan todas las obligatorias (docs/09). */
  canClose: boolean
  /** Solo el DM fuerza el cierre con faltantes. */
  canForceClose: boolean
}

export function turnProgress(turn: TurnSummary | null, viewer: Viewer): TurnProgress {
  if (!turn) {
    return { pending: [], responded: [], complete: false, narrating: false, canRespond: false, hasResponded: false, canClose: false, canForceClose: false }
  }
  const responded = new Set(turn.responded)
  const pending = turn.required.filter((id) => !responded.has(id))
  const open = turn.status === 'open'
  const complete = pending.length === 0
  const hasResponded = viewer.characterId !== null && responded.has(viewer.characterId)
  return {
    pending,
    responded: [...turn.responded],
    complete,
    narrating: turn.status === 'closing' || turn.status === 'resolving',
    canRespond: open && viewer.characterId !== null && !hasResponded,
    hasResponded,
    canClose: open && complete,
    canForceClose: open && !complete && viewer.role === 'dm',
  }
}

/** Frase corta de estado para la barra del turno. */
export function turnStatusLine(turn: TurnSummary | null, progress: TurnProgress, nameOf: (id: string) => string): string {
  if (!turn) return 'No hay turno abierto.'
  if (progress.narrating) return 'El DM esta narrando...'
  if (turn.status === 'resolved') return 'Turno resuelto.'
  if (progress.complete) return turn.required.length === 0 ? 'Nadie tiene pregunta directa; cualquiera puede cerrar.' : 'Todos respondieron; cualquiera puede cerrar el turno.'
  return `Faltan: ${progress.pending.map(nameOf).join(', ')}.`
}
