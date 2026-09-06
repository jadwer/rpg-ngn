import type { RandomSource } from './random.js'

/**
 * Dados. La tirada es la unica fuente de azar del motor (regla 1): el DM
 * nunca inventa un numero, y cada resultado queda registrado con su fuente.
 */

export interface DiceExpression {
  count: number
  sides: number
  modifier: number
}

export interface DiceRoll {
  spec: string
  rolls: number[]
  modifier: number
  total: number
  source: string
}

const DICE_PATTERN = /^(\d{1,2})d(\d{1,3})(?:([+-])(\d{1,3}))?$/

export function parseDice(spec: string): DiceExpression {
  const match = DICE_PATTERN.exec(spec.trim())
  if (!match) {
    throw new SyntaxError(`parseDice: "${spec}" no tiene la forma NdM, NdM+K o NdM-K`)
  }
  const count = Number(match[1])
  const sides = Number(match[2])
  if (count < 1 || sides < 2) {
    throw new RangeError(`parseDice: "${spec}" necesita al menos 1 dado de 2 caras`)
  }
  const modifier = match[3] === undefined ? 0 : (match[3] === '-' ? -1 : 1) * Number(match[4])
  return { count, sides, modifier }
}

export function rollDice(spec: string, rng: RandomSource): DiceRoll {
  const { count, sides, modifier } = parseDice(spec)
  const rolls: number[] = []
  for (let i = 0; i < count; i += 1) {
    rolls.push(rng.nextInt(sides) + 1)
  }
  const total = rolls.reduce((sum, value) => sum + value, 0) + modifier
  return { spec, rolls, modifier, total, source: rng.describe() }
}

export interface D20Options {
  advantage?: boolean | undefined
  disadvantage?: boolean | undefined
}

export interface D20Roll {
  rolls: number[]
  result: number
  source: string
}

/**
 * Tirada de d20 con ventaja (se queda el mayor de dos) o desventaja (el
 * menor). Ventaja y desventaja juntas se anulan: un solo dado.
 */
export function rollD20(rng: RandomSource, options: D20Options = {}): D20Roll {
  const advantage = Boolean(options.advantage)
  const disadvantage = Boolean(options.disadvantage)
  const double = advantage !== disadvantage
  const rolls = [rng.nextInt(20) + 1]
  if (double) rolls.push(rng.nextInt(20) + 1)
  const result = double ? (advantage ? Math.max(...rolls) : Math.min(...rolls)) : rolls[0]!
  return { rolls, result, source: rng.describe() }
}
