import { fold, secretsKnownBy, visibleTo } from '@rpg-ngn/campaign'
import { refId, refKind, type CampaignEvent, type LoadedPack, type Secret } from '@rpg-ngn/content'
import type { LintFinding, LintMode } from '@rpg-ngn/engine-contract'
import type { DMTurnContext } from './provider.js'

/**
 * Lint de conocimiento (docs/08, invariante 3): compara lo que el DM va a
 * decir con la proyeccion de conocimiento de quienes lo van a oir. No
 * intenta entender prosa: trabaja sobre marcadores verificables.
 *
 * - `error`: el texto contiene una keyword de un secreto del pack que algun
 *   receptor no conoce (y que nadie dijo ya en la mesa). En modo `enforce`
 *   el bloque se sustituye por un aviso `system` y no entra a la cronica.
 * - `warning`: el texto nombra una entidad del pack (NPC, lugar, mision)
 *   que la mesa no ha presenciado ni leido en los datos publicos de la
 *   sesion. Solo se reporta.
 *
 * Receptores: la party presente en la sesion. Lo que un jugador declaro
 * este turno o lo que ya esta en la cronica publica cuenta como oido por la
 * mesa, asi el DM puede repetir lo que los propios jugadores dijeron.
 */

export type { LintFinding, LintMode }

export interface KnowledgeView {
  party: string[]
  /** secretId -> personajes de la party que lo conocen. */
  secrets: Map<string, Set<string>>
  /** Referencias de entidades que la mesa ya conoce (`npc:tomas`). */
  knownRefs: Set<string>
  /** Texto ya oido por la mesa (declaraciones, cronica, datos publicos), plegado. */
  heard: string
}

export function buildKnowledgeView(ctx: DMTurnContext, party: readonly string[]): KnowledgeView {
  const { pack, state } = ctx
  const heardParts: string[] = []
  const knownRefs = new Set<string>()

  for (const response of ctx.turn.responses) heardParts.push(response.text)
  for (const entry of state.narrative.log) heardParts.push(entry.text)
  for (const id of Object.keys(state.world.npcs)) knownRefs.add(`npc:${id}`)

  // Datos publicos de las sesiones hasta la actual: lo que un jugador puede leer en la ficha de sesion.
  const current = ctx.turn.sessionId
  for (const session of pack.sessions.values()) {
    if (session.id > current) continue
    heardParts.push(session.title, session.briefing, session.recap ?? '', session.notes ?? '', ...(session.openThreads ?? []))
  }

  for (const event of ctx.recentEvents ?? []) {
    if (!visibleTo(event, state).some((id) => party.includes(id))) continue
    for (const ref of refsOf(event)) knownRefs.add(ref)
    heardParts.push(textOf(event))
  }

  return { party: [...party], secrets: secretsKnownBy(state, party), knownRefs, heard: fold(heardParts.join('\n')) }
}

function refsOf(event: CampaignEvent): string[] {
  const refs: string[] = []
  if (event.actor) refs.push(event.actor)
  refs.push(...(event.targets ?? []))
  if (event.location) refs.push(`location:${event.location}`)
  const payload = 'payload' in event && event.payload && typeof event.payload === 'object' ? (event.payload as Record<string, unknown>) : {}
  if (typeof payload['speakerRef'] === 'string') refs.push(payload['speakerRef'])
  for (const effect of event.effects ?? []) {
    if (typeof effect['holder'] === 'string') refs.push(effect['holder'])
  }
  return refs
}

function textOf(event: CampaignEvent): string {
  const parts: string[] = []
  if (event.declared) parts.push(event.declared)
  const payload = 'payload' in event && event.payload && typeof event.payload === 'object' ? (event.payload as Record<string, unknown>) : {}
  for (const key of ['text', 'note', 'method']) if (typeof payload[key] === 'string') parts.push(payload[key] as string)
  return parts.join('\n')
}

/** `name` como palabra completa dentro de `text` (ambos plegados). */
function hasWord(text: string, name: string): boolean {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`).test(text)
}

/** Marca el secreto como revelado a toda la party (un `secret_revealed` de este turno). */
export function markRevealed(view: KnowledgeView, secretId: string): void {
  view.secrets.set(secretId, new Set(view.party))
}

export function lintText(text: string, view: KnowledgeView, pack: LoadedPack): LintFinding[] {
  const findings: LintFinding[] = []
  const folded = fold(text)

  for (const secret of pack.secrets.values()) {
    // Una keyword que la mesa ya dijo no cuenta; basta otra del mismo secreto para que sea filtracion.
    const marker = secret.keywords.find((k) => folded.includes(fold(k)) && !view.heard.includes(fold(k)))
    if (!marker) continue
    const knows = view.secrets.get(secret.id) ?? new Set<string>()
    const receivers = view.party.filter((id) => !knows.has(id))
    if (receivers.length === 0) continue
    findings.push({
      level: 'error',
      secretId: secret.id,
      marker,
      receivers,
      message: `usa "${marker}" del secreto ${secret.id}, que ${receivers.join(', ')} no ${receivers.length === 1 ? 'conoce' : 'conocen'}`,
    })
  }

  const entities: Array<{ ref: string; name: string }> = [
    ...[...pack.npcs.values()].map((n) => ({ ref: `npc:${n.id}`, name: n.name })),
    ...[...pack.locations.values()].map((l) => ({ ref: `location:${l.id}`, name: l.name })),
    ...[...pack.quests.values()].map((q) => ({ ref: `quest:${q.id}`, name: q.title })),
  ]
  for (const entity of entities) {
    if (view.knownRefs.has(entity.ref)) continue
    const name = fold(entity.name)
    if (hasWord(view.heard, name)) continue
    const mentioned = hasWord(folded, name) ? entity.name : folded.includes(entity.ref) ? entity.ref : null
    if (!mentioned) continue
    findings.push({ level: 'warning', entity: entity.ref, marker: mentioned, receivers: [...view.party], message: `nombra a ${entity.name} (${entity.ref}), que la mesa no ha presenciado` })
  }

  return findings
}

/** Un secreto puede apuntar a un personaje: util para saber si el sujeto esta en escena. */
export function secretSubjectPresent(secret: Secret, party: readonly string[]): boolean {
  return refKind(secret.about) === 'character' && party.includes(refId(secret.about))
}
