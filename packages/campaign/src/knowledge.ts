import { isManualReveal, refId, refKind, type CampaignEvent, type Secret } from '@rpg-ngn/content'
import type { CampaignState, RevealedSecret } from './state.js'

/**
 * Proyeccion de conocimiento de secretos (docs/08, invariante 3). Un secreto
 * del pack queda revelado a un personaje cuando un evento visible para el
 * cumple `revealWhen`, o cuando un `secret_revealed` lo tiene de testigo.
 * Todo es funcion pura del log y del pack; el lint del DM lee el resultado.
 */

/**
 * Personajes para los que un evento es visible: los testigos declarados,
 * los destinatarios de un discovery y de knowledgeGranted. Un evento sin
 * testigos y sin capa `dm` se considera oido por la party de su sesion
 * (los logs del piloto anteriores a los testigos se escribieron asi).
 */
export function visibleTo(event: CampaignEvent, state: CampaignState): string[] {
  if (event.visibility?.layer === 'dm') return []
  const ids = new Set<string>()
  for (const ref of event.visibility?.witnesses ?? []) {
    if (refKind(ref) === 'character') ids.add(refId(ref))
  }
  if (event.type === 'discovery') {
    for (const ref of event.targets) if (refKind(ref) === 'character') ids.add(refId(ref))
  }
  for (const grant of event.knowledgeGranted ?? []) {
    if (refKind(grant.to) === 'character') ids.add(refId(grant.to))
  }
  if (ids.size === 0 && !event.visibility?.witnesses?.length && event.type !== 'discovery' && event.type !== 'secret_revealed') {
    for (const id of state.meta.sessions[event.sessionId]?.party ?? []) ids.add(id)
  }
  return [...ids]
}

/** Texto del evento sobre el que aplica `match` (declared, payload.text, payload.note, payload.method). */
function eventText(event: CampaignEvent): string {
  const parts: string[] = []
  if (event.declared) parts.push(event.declared)
  const payload = 'payload' in event && event.payload && typeof event.payload === 'object' ? (event.payload as Record<string, unknown>) : {}
  for (const key of ['text', 'note', 'method', 'summary', 'cliffhanger']) {
    const value = payload[key]
    if (typeof value === 'string') parts.push(value)
  }
  return parts.join('\n')
}

/** Minusculas y sin acentos, para comparar prosa sin depender de la ortografia del modelo. */
export function fold(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function matchesRevealWhen(secret: Secret, event: CampaignEvent): boolean {
  const when = secret.revealWhen
  if (isManualReveal(when)) return false
  if (event.type !== when.event) return false
  if (when.fact && !(event.type === 'discovery' && event.payload.fact === when.fact)) return false
  if (when.actor && event.actor !== when.actor) return false
  if (when.target && !(event.targets ?? []).includes(when.target)) return false
  if (when.match && !fold(eventText(event)).includes(fold(when.match))) return false
  return true
}

/**
 * Secretos que este evento revela y a quien. Un `secret_revealed` revela el
 * secreto que cita a sus testigos; cualquier otro evento revela los
 * secretos cuya condicion cumple, a quienes lo presenciaron.
 */
export function revealsOf(event: CampaignEvent, secrets: Iterable<Secret>, state: CampaignState): Array<{ secretId: string; to: string[]; how: RevealedSecret['how'] }> {
  const out: Array<{ secretId: string; to: string[]; how: RevealedSecret['how'] }> = []
  if (event.type === 'secret_revealed') {
    out.push({ secretId: event.payload.secretId, to: visibleTo(event, state), how: 'secret_revealed' })
    return out
  }
  let recipients: string[] | null = null
  for (const secret of secrets) {
    if (!matchesRevealWhen(secret, event)) continue
    recipients ??= visibleTo(event, state)
    if (recipients.length) out.push({ secretId: secret.id, to: recipients, how: 'revealWhen' })
  }
  return out
}

/** Ids de secretos revelados a un personaje. */
export function revealedSecrets(state: CampaignState, characterId: string): string[] {
  return Object.keys(state.knowledge[characterId]?.secrets ?? {})
}

/** Para cada secreto, quienes de la party lo conocen. */
export function secretsKnownBy(state: CampaignState, party: readonly string[]): Map<string, Set<string>> {
  const known = new Map<string, Set<string>>()
  for (const id of party) {
    for (const secretId of revealedSecrets(state, id)) {
      let set = known.get(secretId)
      if (!set) known.set(secretId, (set = new Set()))
      set.add(id)
    }
  }
  return known
}
