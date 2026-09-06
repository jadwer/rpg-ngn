import type { CampaignState } from '@rpg-ngn/campaign'
import type { CampaignEvent, Character, LoadedPack, RollEvent, Session } from '@rpg-ngn/content'
import { refId, refKind } from '@rpg-ngn/content'
import { dialogue, narration, system, type RollBlock, type Speaker, type TurnBlock } from './blocks.js'
import { splitNarration } from './narration.js'
import { characterVisibility, everPlayed, sessionVisibility } from './veil.js'

/**
 * Bloques de una sesion offline, construidos desde el pack y el estado
 * reducido. No hay DM: la narrativa es el recap de la sesion, partido para el
 * TTS, y el registro son las tiradas y sucesos del log. Una sesion planeada
 * (003) no tiene recap ni cabos sueltos: muestra briefing, como se juega y la
 * tabla de Fortuna, que es lo unico que un jugador nuevo debe leer.
 */

export interface SessionBlocksInput {
  pack: LoadedPack
  session: Session
  /** Estado reducido con el ruleset del pack; sin el no hay Fortuna en las tiradas. */
  state?: CampaignState | undefined
  /** Eventos del log; se usan los de esta sesion para el registro de tiradas. */
  events?: readonly CampaignEvent[] | undefined
}

export const LABELS = {
  howToPlay: 'Cómo se juega',
  fortune: 'Fortuna',
  notes: 'Notas de la mesa',
  ledger: 'Registro de la sesión',
  openThreads: 'Cabos sueltos',
  worldEvent: 'Sucede en el mundo',
} as const

export function sessionBlocks(input: SessionBlocksInput): TurnBlock[] {
  const { pack, session } = input
  const visibility = sessionVisibility(session)
  const played = everPlayed(pack.sessions.values())
  const blocks: TurnBlock[] = []

  blocks.push(system(`${session.id}:briefing`, { title: session.title, text: session.briefing }))

  for (const member of session.party) {
    const character = pack.characters.get(member.character)
    if (!character) continue
    if (!characterVisibility(session, character, played).fields.quote) continue
    blocks.push(dialogue(`${session.id}:intro:${character.id}`, speakerOf(character), character.quote))
  }

  if (visibility.recap && session.recap) {
    splitNarration(session.recap).forEach((text, index) => {
      blocks.push(narration(`${session.id}:recap:${index + 1}`, text))
    })
  }

  if (visibility.recap) {
    blocks.push(...ledgerBlocks(input))
  }

  if (visibility.openThreads && session.openThreads) {
    blocks.push(system(`${session.id}:threads`, { title: LABELS.openThreads, items: session.openThreads }))
  }

  blocks.push(system(`${session.id}:how-to-play`, { title: LABELS.howToPlay, items: session.howToPlay }))
  blocks.push(system(`${session.id}:fortune`, { title: LABELS.fortune, items: session.fortune.map((tier) => `${tier.range}: ${tier.label}`) }))
  if (session.notes) {
    blocks.push(system(`${session.id}:notes`, { title: LABELS.notes, text: session.notes }))
  }

  return blocks
}

/** Tiradas y sucesos del log que pertenecen a la sesion, en orden de seq, sin la capa dm. */
export function ledgerBlocks(input: SessionBlocksInput): TurnBlock[] {
  const { pack, session, events } = input
  if (!events) return []
  const blocks: TurnBlock[] = []
  for (const event of events) {
    if (event.sessionId !== session.id) continue
    if (event.visibility?.layer === 'dm') continue
    if (event.type === 'roll') {
      blocks.push(rollBlock(event, pack, session))
    } else if (event.type === 'world_event') {
      blocks.push(system(`${session.id}:world:${event.id}`, { title: LABELS.worldEvent, text: event.payload.note }))
    }
  }
  if (blocks.length > 0) {
    blocks.unshift(system(`${session.id}:ledger`, { title: LABELS.ledger }))
  }
  return blocks
}

export function fortuneLabel(session: Pick<Session, 'fortune'>, result: number): string | null {
  for (const tier of session.fortune) {
    const [min, max] = tier.range.split('-').map(Number)
    const hi = max ?? min
    if (min !== undefined && result >= min && result <= (hi as number)) return tier.label
  }
  return null
}

export function speakerOf(character: Pick<Character, 'id' | 'name' | 'portrait'>): Speaker {
  return { ref: `character:${character.id}`, name: character.name, portrait: character.portrait }
}

function speakerFor(ref: string | undefined, pack: LoadedPack): Speaker | null {
  if (!ref) return null
  const id = refId(ref)
  if (refKind(ref) === 'character') {
    const character = pack.characters.get(id)
    return character ? speakerOf(character) : { ref, name: id, portrait: null }
  }
  if (refKind(ref) === 'npc') {
    const npc = pack.npcs.get(id)
    return { ref, name: npc?.name ?? capitalize(id), portrait: npc?.portrait ?? null }
  }
  return { ref, name: id, portrait: null }
}

function nameFor(ref: string, pack: LoadedPack): string {
  return speakerFor(ref, pack)?.name ?? ref
}

function rollBlock(event: RollEvent, pack: LoadedPack, session: Session): RollBlock {
  const resolved = event.resolved
  const actor = speakerFor(event.actor, pack)
  const who = actor?.name ?? 'Alguien'
  const advantage = resolved.advantage ? 'advantage' : resolved.disadvantage ? 'disadvantage' : null
  const suffix = advantage === 'advantage' ? ' con ventaja' : advantage === 'disadvantage' ? ' con desventaja' : ''
  const target = resolved.target ? ` contra ${nameFor(resolved.target, pack)}` : ''

  let label: string
  let text: string
  if (resolved.kind === 'fortune') {
    label = LABELS.fortune
    const tier = fortuneLabel(session, resolved.result)
    text = `${who} tira ${resolved.die} de Fortuna: ${resolved.result}${tier ? ` (${tier})` : ''}.`
  } else {
    const skill = typeof resolved['skill'] === 'string' ? (resolved['skill'] as string) : null
    label = skill ? capitalize(skill.replace(/-/g, ' ')) : capitalize(resolved.kind)
    const what = skill ? ` de ${skill.replace(/-/g, ' ')}` : ` (${resolved.kind})`
    text = `${who} tira ${resolved.die}${what}${suffix}${target}: ${resolved.result}.`
  }

  return { kind: 'roll', id: `${session.id}:roll:${event.id}`, actor, rollKind: resolved.kind, die: resolved.die, result: resolved.result, label, advantage, text }
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
