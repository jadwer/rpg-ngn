import type { Resource } from './resource.js'

/**
 * World State (docs/04): lo objetivamente cierto en el mundo, proyeccion de
 * los `effects` del log. core define la forma; que significa cada campo y
 * como cambia lo arbitra el ruleset.
 */

export interface InventoryItem {
  id: string
  /** Evento que lo puso ahi. */
  since: string
  note?: string
}

export interface Fortune {
  result: number
  tier: string
}

export interface CharacterState {
  id: string
  hp: Resource
  conditions: string[]
  inventory: InventoryItem[]
  fortune: Fortune | null
  memoriesRecovered: number
  /** Campos que un ruleset concreto necesite y core no modela. */
  custom: Record<string, unknown>
}

export interface NpcState {
  id: string
  inventory: InventoryItem[]
  custom: Record<string, unknown>
}

export interface WorldState {
  worldTime: string | null
  characters: Record<string, CharacterState>
  npcs: Record<string, NpcState>
}

export function emptyWorld(): WorldState {
  return { worldTime: null, characters: {}, npcs: {} }
}

export function characterState(id: string, hp: Resource): CharacterState {
  return { id, hp, conditions: [], inventory: [], fortune: null, memoriesRecovered: 0, custom: {} }
}

export function npcState(id: string): NpcState {
  return { id, inventory: [], custom: {} }
}

export function requireCharacter(world: WorldState, id: string): CharacterState {
  const character = world.characters[id]
  if (!character) {
    throw new Error(`el personaje ${id} no existe en el estado del mundo`)
  }
  return character
}

/** Devuelve el NPC, creandolo si es la primera vez que el mundo lo toca. */
export function ensureNpc(world: WorldState, id: string): [WorldState, NpcState] {
  const existing = world.npcs[id]
  if (existing) return [world, existing]
  const created = npcState(id)
  return [{ ...world, npcs: { ...world.npcs, [id]: created } }, created]
}

export function updateCharacter(world: WorldState, id: string, patch: (c: CharacterState) => CharacterState): WorldState {
  const current = requireCharacter(world, id)
  return { ...world, characters: { ...world.characters, [id]: patch(current) } }
}

export function updateNpc(world: WorldState, id: string, patch: (n: NpcState) => NpcState): WorldState {
  const [withNpc, current] = ensureNpc(world, id)
  return { ...withNpc, npcs: { ...withNpc.npcs, [id]: patch(current) } }
}
