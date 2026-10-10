import type { CampaignEvent } from '@rpg-ngn/content'
import { updateCharacter, updateNpc, type WorldState } from '@rpg-ngn/core'

/**
 * Combate por elementos (Las Siete Coronas, inspirado en Genshin Impact,
 * 10-10). El GM propone quien ataca a quien con que ataque; el interprete
 * tira el daño y este modulo aplica la reaccion con una tabla fija. El
 * resultado queda en el NPC (`custom.lastHit`) para que el motor lo anuncie a
 * la mesa con su nombre: "¡Vaporizar! 14 de daño".
 *
 * Reglas, en version de mesa de las del juego:
 * - Fuego, Agua, Hielo, Rayo y Flora dejan un aura en el enemigo; Viento y
 *   Roca no se pegan, solo reaccionan con el aura que haya.
 * - Un ataque de otro elemento sobre un aura reacciona y la consume.
 * - Los enemigos tienen vida (la del pack); a 0 quedan derrotados.
 */

export const ELEMENTS = ['fuego', 'agua', 'hielo', 'rayo', 'viento', 'roca', 'flora'] as const
export type Element = (typeof ELEMENTS)[number]

/** Los elementos que se quedan pegados como aura. */
const STICKY: ReadonlySet<Element> = new Set(['fuego', 'agua', 'hielo', 'rayo', 'flora'])

export interface Reaction {
  /** Nombre que se grita en la mesa. */
  name: string
  /** Multiplicador del daño del golpe que la dispara. */
  multiplier: number
  /** Daño extra plano. */
  bonus: number
  /** Condicion que deja en el enemigo ("congelado", "en llamas"). */
  condition?: string
  /** Condicion que deja en quien ataca ("escudo de cristal"). */
  shield?: string
}

/**
 * La reaccion de un golpe de `incoming` sobre un aura `aura`, o null si no
 * hay. Orden de la tabla: el disparador primero, como en el juego (Agua
 * sobre Fuego vaporiza al doble; Fuego sobre Agua, a vez y media).
 */
export function reactionOf(aura: Element | null, incoming: Element): Reaction | null {
  if (!aura || aura === incoming) return null
  const pair = new Set([aura, incoming])
  const has = (a: Element, b: Element) => pair.has(a) && pair.has(b)
  if (incoming === 'viento' && STICKY.has(aura) && aura !== 'flora') return { name: 'Torbellino', multiplier: 1, bonus: 4 }
  if (incoming === 'roca' && STICKY.has(aura) && aura !== 'flora') return { name: 'Cristalizar', multiplier: 1, bonus: 0, shield: 'escudo de cristal' }
  if (has('agua', 'fuego')) return { name: 'Vaporizar', multiplier: incoming === 'agua' ? 2 : 1.5, bonus: 0 }
  if (has('fuego', 'hielo')) return { name: 'Derretir', multiplier: incoming === 'fuego' ? 2 : 1.5, bonus: 0 }
  if (has('rayo', 'fuego')) return { name: 'Sobrecarga', multiplier: 1, bonus: 5, condition: 'derribado' }
  if (has('rayo', 'hielo')) return { name: 'Superconducción', multiplier: 1, bonus: 3, condition: 'defensa rota' }
  if (has('agua', 'rayo')) return { name: 'Electrocargado', multiplier: 1, bonus: 4 }
  if (has('agua', 'hielo')) return { name: 'Congelado', multiplier: 1, bonus: 0, condition: 'congelado' }
  if (has('flora', 'agua')) return { name: 'Florecer', multiplier: 1, bonus: 5 }
  if (has('flora', 'fuego')) return { name: 'Quemar', multiplier: 1, bonus: 2, condition: 'en llamas' }
  if (has('flora', 'rayo')) return { name: 'Catalizar', multiplier: 1, bonus: 3 }
  return null
}

export function isElement(value: unknown): value is Element {
  return typeof value === 'string' && (ELEMENTS as readonly string[]).includes(value)
}

/**
 * Aplica un golpe elemental ya tirado: `{op:'elemental', who, target, element,
 * damage, targetMax}`. `damage` lo tiro el interprete con el dado del ataque;
 * `targetMax` es la vida del enemigo segun el pack (la primera vez que lo tocan).
 */
export function applyElemental(world: WorldState, effect: Record<string, unknown>, event: CampaignEvent): WorldState {
  const who = String(effect['who'] ?? '')
  const target = String(effect['target'] ?? '')
  if (!who.startsWith('character:') || !target.startsWith('npc:')) throw new Error(`${event.id}: el effect "elemental" requiere who character:<id> y target npc:<id>`)
  const element = effect['element']
  if (!isElement(element)) throw new Error(`${event.id}: elemento desconocido ${String(element)}`)
  const damage = effect['damage']
  if (typeof damage !== 'number' || !Number.isInteger(damage) || damage < 0) throw new Error(`${event.id}: el effect "elemental" requiere "damage" entero`)
  const npcId = target.slice('npc:'.length)
  const current = world.npcs[npcId]?.custom ?? {}
  const max = typeof current['hpMax'] === 'number' ? current['hpMax'] : typeof effect['targetMax'] === 'number' ? effect['targetMax'] : null
  if (max === null) throw new Error(`${event.id}: ${target} no tiene vida en el pack; no se le puede golpear con elementos`)
  const hp = typeof current['hp'] === 'number' ? current['hp'] : max
  if (hp <= 0) throw new Error(`${event.id}: ${target} ya esta derrotado`)
  const aura = isElement(current['aura']) ? current['aura'] : null
  const reaction = reactionOf(aura, element)
  const dealt = reaction ? Math.round(damage * reaction.multiplier) + reaction.bonus : damage
  const left = Math.max(0, hp - dealt)
  // Con reaccion el aura se consume; sin ella, un elemento pegajoso deja la suya.
  const nextAura = reaction ? null : STICKY.has(element) ? element : aura
  const conditions = Array.isArray(current['conditions']) ? (current['conditions'] as string[]) : []
  const added = [...(reaction?.condition ? [reaction.condition] : []), ...(left === 0 ? ['derrotado'] : [])].filter((c) => !conditions.includes(c))
  let next = updateNpc(world, npcId, (npc) => ({
    ...npc,
    custom: { ...npc.custom, hp: left, hpMax: max, aura: nextAura, conditions: [...conditions, ...added], lastHit: { by: who, element, damage: dealt, reaction: reaction?.name ?? null, hp: left, hpMax: max, event: event.id } },
  }))
  if (reaction?.shield) {
    const id = who.slice('character:'.length)
    next = updateCharacter(next, id, (c) => (c.conditions.includes(reaction.shield!) ? c : { ...c, conditions: [...c.conditions, reaction.shield!] }))
  }
  return next
}
