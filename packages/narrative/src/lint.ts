import { fold, secretsKnownBy, visibleTo } from '@rpg-ngn/campaign'
import { isManualReveal, refId, refKind, type CampaignEvent, type LoadedPack, type Secret } from '@rpg-ngn/content'
import type { LintFinding, LintMode } from '@rpg-ngn/engine-contract'
import type { GMTurnContext } from './provider.js'

/**
 * Lint de conocimiento (docs/08, invariante 3): compara lo que el GM va a
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
 * mesa, asi el GM puede repetir lo que los propios jugadores dijeron.
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

export function buildKnowledgeView(ctx: GMTurnContext, party: readonly string[]): KnowledgeView {
  const { pack, state } = ctx
  const heardParts: string[] = []
  const knownRefs = new Set<string>()

  // Con acciones privadas lo que escribio un jugador no lo oyo la mesa: no
  // cuenta como dicho y el GM no puede repetirlo en publico sin que el lint lo vea.
  if (!(ctx.notes?.privateActions ?? ctx.pack.manifest.privateActions ?? false)) for (const response of ctx.turn.responses) heardParts.push(response.text)
  // Un susurro (H7) no lo oyo la mesa: no cuenta como dicho.
  for (const entry of state.narrative.log) if (!entry.to) heardParts.push(entry.text)
  // Un NPC con estado guardado no es por eso un NPC que la mesa conozca: la
  // actitud o la condicion las puede registrar el GM sin que nadie lo haya
  // visto. Lo que la mesa presencio esta en lo que oyo (cronica, declaraciones)
  // y en los eventos recientes que pudo ver.

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

/** Marca el secreto como revelado (un `secret_revealed` de este turno): a toda la party, o solo a quien se le susurro. */
export function markRevealed(view: KnowledgeView, secretId: string, to?: readonly string[]): void {
  if (!to) {
    view.secrets.set(secretId, new Set(view.party))
    return
  }
  view.secrets.set(secretId, new Set([...(view.secrets.get(secretId) ?? []), ...to]))
}

/**
 * Hallazgos de un texto que va a leer `audience` (toda la party si no se
 * dice). Un susurro (H7) solo se revisa contra quien lo recibe: puede
 * contarle a un personaje lo que solo el sabe.
 */
export function lintText(text: string, view: KnowledgeView, pack: LoadedPack, audience?: readonly string[]): LintFinding[] {
  const readers = audience ? view.party.filter((id) => audience.includes(id)) : view.party
  const findings: LintFinding[] = []
  const folded = fold(text)

  for (const secret of pack.secrets.values()) {
    // Una keyword que la mesa ya dijo no cuenta; basta otra del mismo secreto para que sea filtracion.
    const marker = secret.keywords.find((k) => folded.includes(fold(k)) && !view.heard.includes(fold(k)))
    if (!marker) continue
    const knows = view.secrets.get(secret.id) ?? new Set<string>()
    const receivers = readers.filter((id) => !knows.has(id))
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
    findings.push({ level: 'warning', entity: entity.ref, marker: mentioned, receivers: [...readers], message: `nombra a ${entity.name} (${entity.ref}), que la mesa no ha presenciado` })
  }

  return findings
}

/** Un secreto puede apuntar a un personaje: util para saber si el sujeto esta en escena. */
export function secretSubjectPresent(secret: Secret, party: readonly string[]): boolean {
  return refKind(secret.about) === 'character' && party.includes(refId(secret.about))
}

/**
 * Si la escena roza el secreto (docs/04, regla 2: la capa del GM lleva solo
 * los secretos que la escena puede tocar, no todos los del pack). Hasta hoy
 * se volcaban todos en cada turno, que es la superficie que un modelo puede
 * parafrasear sin tropezar con el lint (VAM del 19-09, motor A4).
 *
 * Criterio, con lo que hay (las sesiones no declaran reparto):
 * - `manual`: siempre. Es la verdad de la trama que el GM decide cuando
 *   soltar; sin ella narraria un culpable distinto al del pack.
 * - El sujeto es un personaje de la party presente: si.
 * - El sujeto o quien lo puede soltar aparece en lo que la escena ya dijo:
 *   respuestas de este turno, eventos recientes de la sesion, premisa y
 *   nota de sesion. Por nombre o por ref.
 * - Si no, fuera: no se le cuenta al modelo lo que la escena no toca.
 */
export function secretTouchesScene(secret: Secret, ctx: GMTurnContext, party: readonly string[]): boolean {
  if (isManualReveal(secret.revealWhen)) return true
  if (secretSubjectPresent(secret, party)) return true
  const refs = [secret.about, secret.revealedBy].filter((r): r is string => typeof r === 'string')
  if (refs.length === 0) return false
  const scene = fold(
    [
      ...ctx.turn.responses.map((r) => r.text),
      ...(ctx.recentEvents ?? []).map((e) => JSON.stringify(e)),
      ctx.notes?.premise ?? '',
      ctx.notes?.sessionNote ?? '',
    ].join('\n'),
  )
  return refs.some((ref) => {
    if (scene.includes(fold(ref))) return true
    const id = refId(ref)
    const name = refKind(ref) === 'npc' ? ctx.pack.npcs.get(id)?.name : ctx.pack.characters.get(id)?.name
    return hasWord(scene, id) || (name !== undefined && hasWord(scene, fold(name)))
  })
}
