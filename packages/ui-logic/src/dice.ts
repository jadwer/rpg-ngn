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

/**
 * Todas las caras de un dado ("1d20": las 20), para precargarlas antes de que
 * gire: en la web cada cara es un archivo y la primera vez que salia se
 * pedia a mitad del giro (Gabino, 25-09: "algunas caras tardan en cargar").
 * Vacio si el dado no tiene lamina.
 */
export function allFacesOf(die: string): DiceFace[] {
  const match = SPEC.exec(die.trim())
  if (!match) return []
  const sides = Number(match[2])
  if (!isSupported(sides)) return []
  return Array.from({ length: sides }, (_, i) => ({ sides, value: i + 1, asset: `d${sides}-${i + 1}` }))
}

/** Atajo sobre un bloque de tirada ya construido. */
export function facesOf(block: Pick<RollBlock, 'die' | 'result' | 'rolls'>): DiceFace[] {
  return diceFaces(block.die, block.result, block.rolls)
}

/**
 * Con ventaja o desventaja caen dos d20 y uno sobra: el indice del que NO
 * cuenta, para atenuarlo mientras aterriza. Null si cuentan todos (2d6) o
 * solo hay uno. Un dado de una sola pieza con dos tiradas solo puede ser eso.
 */
export function droppedFace(die: string, result: number, rolls: number[] | null): number | null {
  const match = SPEC.exec(die.trim())
  if (!match || Number(match[1]) !== 1 || !rolls || rolls.length !== 2) return null
  const modifier = match[3] ? (match[3] === '-' ? -1 : 1) * Number(match[4]) : 0
  const kept = rolls.findIndex((r) => r + modifier === result)
  if (kept === -1) return null
  return kept === 0 ? 1 : 0
}

/** Con ventaja o desventaja, cual de los dos dados cuenta (para resaltarlo). */
export function keptFace(block: Pick<RollBlock, 'die' | 'result' | 'rolls' | 'advantage'>): number | null {
  const faces = facesOf(block)
  if (faces.length !== 2 || !block.advantage) return null
  const values = faces.map((f) => f.value)
  const kept = block.advantage === 'advantage' ? Math.max(...values) : Math.min(...values)
  return values.indexOf(kept)
}
