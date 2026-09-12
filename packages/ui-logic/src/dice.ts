import type { RollBlock } from './blocks.js'

/**
 * Caras de dado para pintar una tirada con la lamina de Gabino (d20, d8 y
 * d6; `tools/dice/crop.py` genera `d<caras>-<valor>.png`). Sin React ni
 * rutas: devuelve que imagenes corresponden y cada app las resuelve.
 */
export const DICE_WITH_FACES = [20, 8, 6] as const
export type DiceSides = (typeof DICE_WITH_FACES)[number]

export interface DiceFace {
  sides: DiceSides
  value: number
  /** `d20-14`: nombre del archivo sin extension. */
  asset: string
}

const SPEC = /^(\d{1,2})d(\d{1,3})(?:([+-])(\d{1,3}))?$/

function isSupported(sides: number): sides is DiceSides {
  return (DICE_WITH_FACES as readonly number[]).includes(sides)
}

/**
 * Caras a mostrar para una tirada. Con `rolls` se pinta cada dado (los dos
 * de una ventaja, los tres de 3d6). Sin `rolls` solo se puede pintar un dado
 * unico sin modificador, porque el total ya no dice que cara salio. Devuelve
 * vacio si el dado no tiene lamina (d4, d10, d12, d100) o el valor no cabe.
 */
export function diceFaces(die: string, result: number, rolls: number[] | null = null): DiceFace[] {
  const match = SPEC.exec(die.trim())
  if (!match) return []
  const count = Number(match[1])
  const sides = Number(match[2])
  const modifier = match[3] ? (match[3] === '-' ? -1 : 1) * Number(match[4]) : 0
  if (!isSupported(sides)) return []

  const values = rolls && rolls.length > 0 ? rolls : count === 1 && modifier === 0 ? [result] : []
  return values.filter((v) => Number.isInteger(v) && v >= 1 && v <= sides).map((value) => ({ sides, value, asset: `d${sides}-${value}` }))
}

/** Atajo sobre un bloque de tirada ya construido. */
export function facesOf(block: Pick<RollBlock, 'die' | 'result' | 'rolls'>): DiceFace[] {
  return diceFaces(block.die, block.result, block.rolls)
}

/** Con ventaja o desventaja, cual de los dos dados cuenta (para resaltarlo). */
export function keptFace(block: Pick<RollBlock, 'die' | 'result' | 'rolls' | 'advantage'>): number | null {
  const faces = facesOf(block)
  if (faces.length !== 2 || !block.advantage) return null
  const values = faces.map((f) => f.value)
  const kept = block.advantage === 'advantage' ? Math.max(...values) : Math.min(...values)
  return values.indexOf(kept)
}
