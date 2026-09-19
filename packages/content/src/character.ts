import { z } from 'zod'
import { DiceSpec, KebabId } from './common.js'

/**
 * Schema de personaje jugable (05, "Schema de personaje v0"). Es el primer
 * contrato de datos del motor: apps/sheets y packages/rules lo consumen.
 * El vocabulario de attacks y abilities es neutro; el mapeo a un ruleset es
 * responsabilidad de packages/rules.
 */

export const StatKey = z.enum(['fue', 'des', 'con', 'int', 'sab', 'car'])
export type StatKey = z.infer<typeof StatKey>

const StatValue = z.number().int().min(3).max(20)

export const Stats = z.strictObject({
  fue: StatValue,
  des: StatValue,
  con: StatValue,
  int: StatValue,
  sab: StatValue,
  car: StatValue,
})

export const Attack = z.strictObject({
  id: KebabId,
  name: z.string().min(1),
  use: StatKey,
  damage: DiceSpec,
  damageType: z.string().min(1),
  range: z.string().min(1),
})

export const AbilityType = z.enum(['truco', 'conjuro', 'rasgo', 'pasiva'])

export const Ability = z.strictObject({
  id: KebabId,
  name: z.string().min(1),
  type: AbilityType,
  /** Numero de usos; null o ausente si es a voluntad. */
  uses: z.number().int().positive().nullable().optional(),
  /** Ventana de recarga cuando hay limite: `descanso corto`, `descanso largo`. */
  per: z.string().min(1).nullable().optional(),
  /** Prosa dirigida al jugador, no una formula. */
  effect: z.string().min(1),
  /** Capacidades que hacen daño (trucos y conjuros de ataque) lo declaran como un ataque. */
  damage: DiceSpec.optional(),
  damageType: z.string().min(1).optional(),
  range: z.string().min(1).nullable().optional(),
})

/**
 * Ficha de personaje.
 *
 * El nucleo (id, nombre, bio, stats, habilidades, meta) vale para cualquier
 * genero. Lo que solo tiene sentido peleando (`ac`, `attacks`) es opcional:
 * el pack `pilot` es d20 y los trae, pero un pack de intriga de corte no
 * tiene armadura ni ataques, y exigirselos obligaria a inventar datos falsos.
 *
 * `faction` y `rank` los usan los rulesets que reparten acceso en vez de
 * golpes; el d20 los ignora.
 */
export const Character = z.strictObject({
  id: KebabId,
  name: z.string().min(1),
  race: z.string().min(1),
  class: z.string().min(1),
  age: z.string().min(1),
  quote: z.string().min(1),
  bio: z.string().min(1),
  stats: Stats,
  hp: z.number().int().positive(),
  /** Clase de armadura; solo en rulesets con combate. */
  ac: z.number().int().positive().optional(),
  /** Ataques; solo en rulesets con combate. */
  attacks: z.array(Attack).default([]),
  abilities: z.array(Ability),
  skills: z.array(z.string().min(1)).min(1),
  roles: z.array(z.string().min(1)).min(1),
  goal: z.string().min(1),
  /** A quien le debe lealtad; lo leen los rulesets de intriga. */
  faction: KebabId.optional(),
  /** Posicion en la jerarquia, en palabras del setting. */
  rank: z.string().min(1).optional(),
  /** Ruta relativa al pack, o null. */
  portrait: z.string().min(1).nullable(),
})

export type Character = z.infer<typeof Character>
export type Attack = z.infer<typeof Attack>
export type Ability = z.infer<typeof Ability>
