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
  /**
   * Donde esta: el id de un lugar del pack, o null si el GM no lo ha
   * situado o anda de camino. No depende del sistema de juego (un
   * personaje esta en el comedor tanto en la corte como en la mina), asi
   * que vive aqui y no en `custom`. Opcional para que los snapshots
   * anteriores sigan siendo validos.
   */
  location?: string | null
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
  /**
   * Lo que la party debe, en monedas del mundo (la posada, el Gremio, el
   * Recaudador). Lo mueve el effect `debt`; sin el, no existe.
   */
  partyDebt?: number
  /** Calor de la banda, de 0 a 6 (mundos de calle): cuanto la busca la policia. */
  heat?: number
  /** Estado de una partida de deduccion social (ruleset `deduccion-social`). */
  deduction?: DeductionState
}

/**
 * Lo que una partida de deduccion social guarda a nivel de mundo. Lo de cada
 * personaje (rol, tareas, si vive, habilidad usada) va en su `custom`, que
 * la API ya oculta a los demas asientos.
 */
export interface DeductionState {
  /** Turnos de accion jugados (la recarga y el reactor se cuentan en estos). */
  actionTurns: number
  /** Turnos de accion desde la ultima reunion: a los dos, la siguiente es reunion. */
  sinceMeeting: number
  /** El turno siguiente es reunion (cuerpo reportado, boton, o tocaba). */
  meetingNext: boolean
  bodies: Array<{ who: string; room: string; found: boolean }>
  sabotage: { kind: 'luces' | 'reactor'; since: number; fixers: string[] } | null
  /** Votos de la reunion en curso: quien vota a quien (null = saltar). */
  votes: Record<string, string | null>
  /** El ultimo sellado por la esclusa, con su rol si la mesa lo confirma. */
  lastEjected: { who: string | null; role?: 'tripulante' | 'huesped' } | null
  /** Si el reactor saboteado no se arreglo a tiempo. */
  reactorLost: boolean
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
