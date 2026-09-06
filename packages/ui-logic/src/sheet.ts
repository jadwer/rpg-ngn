import type { Ability, Attack, Character, StatKey } from '@rpg-ngn/content'
import type { CharacterState } from '@rpg-ngn/core'
import type { CharacterVisibility } from './veil.js'

/**
 * Modelo de vista de una ficha: la ficha del pack (estatica) mas el estado
 * vivo del mundo (HP, Fortuna, inventario, condiciones) ya velados segun la
 * sesion. Los componentes pintan esto sin volver a decidir que se muestra.
 */

export const STAT_LABELS: Record<StatKey, string> = { fue: 'FUE', des: 'DES', con: 'CON', int: 'INT', sab: 'SAB', car: 'CAR' }
export const STAT_ORDER: readonly StatKey[] = ['fue', 'des', 'con', 'int', 'sab', 'car']

export interface StatView {
  key: StatKey
  label: string
  value: number
  modifier: string
}

export interface SheetView {
  id: string
  name: string
  race: string
  class: string
  age: string
  portrait: string | null
  /** null cuando la sesion lo vela. */
  quote: string | null
  bio: string | null
  goal: string | null
  abilities: Ability[] | null
  attacks: Attack[]
  skills: string[]
  roles: string[]
  stats: StatView[]
  hp: { current: number; max: number }
  ac: number
  fortune: { result: number; tier: string } | null
  inventory: Array<{ id: string; note: string | null }>
  conditions: string[]
  memoriesRecovered: number
  veiled: boolean
}

export interface SheetOptions {
  visibility: CharacterVisibility
  /** Estado vivo del personaje tras reducir el log; sin el se usa la ficha tal cual. */
  state?: CharacterState | undefined
  /** Modificador de caracteristica segun el ruleset (docs/02: core no sabe de D20). */
  modifier: (score: number) => number
}

export function formatModifier(value: number): string {
  return value >= 0 ? `+${value}` : String(value)
}

/** `llave-de-hierro-sin-cerradura` se lee como `Llave de hierro sin cerradura`. */
export function humanizeId(id: string): string {
  const words = id.replace(/-/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

export function characterSheet(character: Character, options: SheetOptions): SheetView {
  const { visibility, state, modifier } = options
  const fields = visibility.fields
  return {
    id: character.id,
    name: character.name,
    race: character.race,
    class: character.class,
    age: character.age,
    portrait: character.portrait,
    quote: fields.quote ? character.quote : null,
    bio: fields.bio ? character.bio : null,
    goal: fields.goal ? character.goal : null,
    abilities: fields.abilities ? character.abilities : null,
    attacks: character.attacks,
    skills: character.skills,
    roles: character.roles,
    stats: STAT_ORDER.map((key) => ({ key, label: STAT_LABELS[key], value: character.stats[key], modifier: formatModifier(modifier(character.stats[key])) })),
    hp: state ? { current: state.hp.current, max: state.hp.max } : { current: character.hp, max: character.hp },
    ac: typeof state?.custom['ac'] === 'number' ? (state.custom['ac'] as number) : character.ac,
    fortune: state?.fortune ?? null,
    inventory: (state?.inventory ?? []).map((item) => ({ id: item.id, note: item.note ?? null })),
    conditions: state?.conditions ?? [],
    memoriesRecovered: state?.memoriesRecovered ?? 0,
    veiled: visibility.veiled,
  }
}

/** Texto de uso de una capacidad, como lo pinta apps/sheets. */
export function abilityUsage(ability: Ability): string | null {
  if (ability.uses === null) return 'a voluntad'
  if (ability.uses === undefined) return null
  return `${ability.uses} por ${ability.per ?? 'descanso'}`
}
