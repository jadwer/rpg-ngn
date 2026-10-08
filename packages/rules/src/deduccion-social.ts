import type { CampaignEvent, Character } from '@rpg-ngn/content'
import type { CharacterState, DeductionState, Fortune, WorldState } from '@rpg-ngn/core'
import { UnknownEffectError, type Ruleset } from './ruleset.js'

/**
 * Deduccion social: roles ocultos, tareas, reuniones y voto (Turno de noche
 * en la Persefone, 08-10; diseño en rpg-packs/inspirados/persefone.md).
 *
 * El GM narra; este ruleset decide. Quien muere, quien sale por la esclusa y
 * quien gana no lo escribe el modelo: lo calculan estos effects y `verdict`.
 * El GM solo puede proponer lo que un jugador declaro (hacer su tarea, matar
 * si es el Huesped, reportar un cuerpo), y lo que no cuadra se rechaza
 * lanzando, como cualquier effect invalido: el motor lo descarta y lo apunta.
 *
 * Por personaje, en `custom`: `role`, `alive`, `tasks`, `abilityUsed`,
 * `buttonUsed`, `lastKill` (el turno de accion de su ultima muerte), `lucky`
 * (el Novato ya uso su suerte). La API oculta el `custom` ajeno a cada
 * asiento, asi que el rol de otro no viaja hasta el final.
 *
 * Por mundo, en `world.deduction` (ver DeductionState en core).
 */

export type DeductionRole = 'tripulante' | 'huesped'
export interface DeductionTask {
  id: string
  room: string
  done: boolean
}

/** Los dos sabotajes de la v1: donde se arreglan y cuanta gente hace falta. */
export const SABOTAGES = {
  luces: { room: 'electrico', needs: 1, deadline: null },
  reactor: { room: 'reactor', needs: 2, deadline: 2 },
} as const

/** Turnos de accion que tiene que esperar el Huesped entre una muerte y otra. */
export const KILL_COOLDOWN = 2
/** Con dos turnos de accion sin reunion, el siguiente es reunion. */
export const MEETING_EVERY = 2

export function emptyDeduction(): DeductionState {
  return { actionTurns: 0, sinceMeeting: 0, meetingNext: false, bodies: [], sabotage: null, votes: {}, lastEjected: null, reactorLost: false }
}

function deductionOf(world: WorldState): DeductionState {
  return world.deduction ?? emptyDeduction()
}

function custom(world: WorldState, id: string): Record<string, unknown> {
  const character = world.characters[id]
  if (!character) throw new Error(`no hay personaje ${id}`)
  return character.custom
}

export function roleOf(world: WorldState, id: string): DeductionRole | null {
  const role = world.characters[id]?.custom['role']
  return role === 'tripulante' || role === 'huesped' ? role : null
}

export function isAlive(world: WorldState, id: string): boolean {
  return world.characters[id]?.custom['alive'] !== false
}

export function tasksOf(world: WorldState, id: string): DeductionTask[] {
  const tasks = world.characters[id]?.custom['tasks']
  return Array.isArray(tasks) ? (tasks as DeductionTask[]) : []
}

/** Los que juegan la partida: los que tienen rol. */
export function players(world: WorldState): string[] {
  return Object.keys(world.characters).filter((id) => roleOf(world, id) !== null)
}

export function tasksProgress(world: WorldState): { done: number; total: number } {
  let done = 0
  let total = 0
  for (const id of players(world)) {
    if (roleOf(world, id) !== 'tripulante') continue
    for (const task of tasksOf(world, id)) {
      total++
      if (task.done) done++
    }
  }
  return { done, total }
}

/**
 * Quien gana, si alguien ya gano. Orden de la seccion 2 del diseño: sin
 * Huespedes gana la tripulacion; con las tareas completas tambien; con el
 * Huesped en paridad o el reactor perdido, gana el. `lastTurn` dice si era
 * el ultimo turno de la sesion: sin ganador, gana el Huesped (se acabo el aire).
 */
export function verdict(world: WorldState, lastTurn = false): DeductionRole | null {
  const everyone = players(world)
  if (everyone.length === 0) return null
  const alive = everyone.filter((id) => isAlive(world, id))
  const hosts = alive.filter((id) => roleOf(world, id) === 'huesped').length
  const crew = alive.length - hosts
  if (hosts === 0) return 'tripulante'
  const { done, total } = tasksProgress(world)
  if (total > 0 && done === total) return 'tripulante'
  if (hosts >= crew || deductionOf(world).reactorLost) return 'huesped'
  return lastTurn ? 'huesped' : null
}

/** Si el turno que viene es reunion. Lo deja calculado el ruleset en `meetingNext`, para que la API lo lea sin repetir la regla. */
export function meetingNext(world: WorldState): boolean {
  return deductionOf(world).meetingNext
}

/**
 * Reparte roles y tareas al abrir la sesion: un Huesped (4 a 6 jugadores,
 * decision de Gabino del 08-10) y tres tareas por cabeza de las que ofrece
 * la estacion. `random` es el generador del motor (0 a 1). Devuelve los
 * effects `role`, uno por jugador.
 */
export function assignRoles(party: readonly string[], tasks: ReadonlyArray<{ id: string; room: string }>, random: () => number, perPlayer = 3): Array<{ op: 'role'; who: string; role: DeductionRole; tasks: Array<{ id: string; room: string }> }> {
  if (party.length < 4) throw new Error(`deduccion social pide al menos 4 jugadores; hay ${party.length}`)
  const host = party[Math.floor(random() * party.length)]!
  return party.map((id) => {
    const pool = [...tasks]
    const mine: Array<{ id: string; room: string }> = []
    while (mine.length < perPlayer && pool.length > 0) mine.push(pool.splice(Math.floor(random() * pool.length), 1)[0]!)
    return { op: 'role' as const, who: `character:${id}`, role: id === host ? ('huesped' as const) : ('tripulante' as const), tasks: mine }
  })
}

const ref = (value: unknown, field: string, event: CampaignEvent): string => {
  if (typeof value !== 'string' || !value.startsWith('character:')) throw new Error(`${event.id}: "${field}" tiene que ser character:<id>`)
  return value.slice('character:'.length)
}

function setCustom(world: WorldState, id: string, patch: Record<string, unknown>): WorldState {
  const character = world.characters[id]
  if (!character) throw new Error(`no hay personaje ${id}`)
  return { ...world, characters: { ...world.characters, [id]: { ...character, custom: { ...character.custom, ...patch } } } }
}

function setDeduction(world: WorldState, patch: Partial<DeductionState>): WorldState {
  return { ...world, deduction: { ...deductionOf(world), ...patch } }
}

function requireAlive(world: WorldState, id: string, event: CampaignEvent, what: string): void {
  if (!isAlive(world, id)) throw new Error(`${event.id}: ${id} esta muerto y no puede ${what}`)
}

function roomOf(world: WorldState, id: string): string | null {
  return world.characters[id]?.location ?? null
}

export const deduccionSocial: Ruleset = {
  id: 'deduccion-social',
  version: '1.0.0',

  initialCharacterState(character: Character): CharacterState {
    return { id: character.id, hp: { current: 1, max: 1 }, conditions: [], inventory: [], fortune: null, memoriesRecovered: 0, custom: {} }
  },

  abilityModifier(score: number): number {
    return Math.floor((score - 10) / 2)
  },

  fortune(result: number): Fortune {
    return { result, tier: result >= 11 ? 'La estación te ayuda' : 'La estación no ayuda' }
  },

  applyEffect(world: WorldState, effect: Record<string, unknown>, event: CampaignEvent): WorldState {
    const op = String(effect['op'])
    switch (op) {
      case 'role': {
        const who = ref(effect['who'], 'who', event)
        const role = effect['role']
        if (role !== 'tripulante' && role !== 'huesped') throw new Error(`${event.id}: rol desconocido ${String(role)}`)
        const tasks = Array.isArray(effect['tasks']) ? (effect['tasks'] as Array<{ id: string; room: string }>).map((t) => ({ id: t.id, room: t.room, done: false })) : []
        const next = setCustom(world, who, { role, alive: true, tasks, abilityUsed: false, buttonUsed: false, lastKill: null, lucky: false })
        return next.deduction ? next : setDeduction(next, {})
      }
      case 'task_done': {
        const who = ref(effect['who'], 'who', event)
        const taskId = String(effect['task'])
        const tasks = tasksOf(world, who)
        const task = tasks.find((t) => t.id === taskId)
        if (!task) throw new Error(`${event.id}: ${who} no tiene la tarea ${taskId}`)
        if (roomOf(world, who) !== task.room) throw new Error(`${event.id}: ${who} no esta en ${task.room} para hacer ${taskId}`)
        // El Huesped finge: su tarea no cuenta ni falla.
        if (roleOf(world, who) === 'huesped') return world
        return setCustom(world, who, { tasks: tasks.map((t) => (t.id === taskId ? { ...t, done: true } : t)) })
      }
      case 'kill': {
        const who = ref(effect['who'], 'who', event)
        const target = ref(effect['target'], 'target', event)
        if (roleOf(world, who) !== 'huesped') throw new Error(`${event.id}: solo el Huesped mata`)
        requireAlive(world, who, event, 'matar')
        if (!isAlive(world, target) || roleOf(world, target) !== 'tripulante') throw new Error(`${event.id}: ${target} no es un tripulante vivo`)
        const room = roomOf(world, who)
        if (!room || room !== roomOf(world, target)) throw new Error(`${event.id}: ${who} y ${target} no estan en la misma sala`)
        const deduction = deductionOf(world)
        const lastKill = custom(world, who)['lastKill']
        if (typeof lastKill === 'number' && deduction.actionTurns - lastKill < KILL_COOLDOWN) throw new Error(`${event.id}: el Huesped aun no puede volver a matar`)
        let next = setCustom(world, target, { alive: false })
        next = setCustom(next, who, { lastKill: deduction.actionTurns })
        return setDeduction(next, { bodies: [...deduction.bodies, { who: target, room, found: false }] })
      }
      case 'vent': {
        const who = ref(effect['who'], 'who', event)
        if (roleOf(world, who) !== 'huesped') throw new Error(`${event.id}: solo el Huesped cabe en los ductos`)
        requireAlive(world, who, event, 'usar un ducto')
        const to = String(effect['to'])
        const character = world.characters[who]!
        return { ...world, characters: { ...world.characters, [who]: { ...character, location: to } } }
      }
      case 'sabotage': {
        const who = ref(effect['who'], 'who', event)
        if (roleOf(world, who) !== 'huesped') throw new Error(`${event.id}: solo el Huesped sabotea`)
        requireAlive(world, who, event, 'sabotear')
        const kind = effect['kind']
        if (kind !== 'luces' && kind !== 'reactor') throw new Error(`${event.id}: sabotaje desconocido ${String(kind)}`)
        const deduction = deductionOf(world)
        if (deduction.sabotage) throw new Error(`${event.id}: ya hay un sabotaje activo`)
        return setDeduction(world, { sabotage: { kind, since: deduction.actionTurns, fixers: [] } })
      }
      case 'fix': {
        const who = ref(effect['who'], 'who', event)
        requireAlive(world, who, event, 'arreglar')
        const deduction = deductionOf(world)
        const sabotage = deduction.sabotage
        if (!sabotage) throw new Error(`${event.id}: no hay sabotaje que arreglar`)
        const rule = SABOTAGES[sabotage.kind]
        if (roomOf(world, who) !== rule.room) throw new Error(`${event.id}: ${who} no esta en ${rule.room}`)
        const fixers = sabotage.fixers.includes(who) ? sabotage.fixers : [...sabotage.fixers, who]
        return setDeduction(world, { sabotage: fixers.length >= rule.needs ? null : { ...sabotage, fixers } })
      }
      case 'report': {
        const who = ref(effect['who'], 'who', event)
        requireAlive(world, who, event, 'reportar')
        const deduction = deductionOf(world)
        const room = roomOf(world, who)
        const body = deduction.bodies.find((b) => !b.found && b.room === room)
        if (!body) throw new Error(`${event.id}: no hay cuerpo sin reportar en la sala de ${who}`)
        return setDeduction(world, { bodies: deduction.bodies.map((b) => (b === body ? { ...b, found: true } : b)), meetingNext: true })
      }
      case 'button': {
        const who = ref(effect['who'], 'who', event)
        requireAlive(world, who, event, 'pulsar el botón')
        if (custom(world, who)['buttonUsed'] === true) throw new Error(`${event.id}: ${who} ya uso su botón`)
        return setDeduction(setCustom(world, who, { buttonUsed: true }), { meetingNext: true })
      }
      case 'ability': {
        const who = ref(effect['who'], 'who', event)
        requireAlive(world, who, event, 'usar su habilidad')
        if (custom(world, who)['abilityUsed'] === true) throw new Error(`${event.id}: ${who} ya uso su habilidad`)
        return setCustom(world, who, { abilityUsed: true })
      }
      case 'tick': {
        // Fin de un turno de accion: cuenta para la recarga, la reunion y el reactor.
        const deduction = deductionOf(world)
        const actionTurns = deduction.actionTurns + 1
        const sabotage = deduction.sabotage
        const deadline = sabotage ? SABOTAGES[sabotage.kind].deadline : null
        const reactorLost = deduction.reactorLost || (sabotage !== null && deadline !== null && actionTurns - sabotage.since >= deadline)
        const sinceMeeting = deduction.sinceMeeting + 1
        return setDeduction(world, { actionTurns, sinceMeeting, reactorLost, meetingNext: deduction.meetingNext || sinceMeeting >= MEETING_EVERY })
      }
      case 'vote': {
        const who = ref(effect['who'], 'who', event)
        requireAlive(world, who, event, 'votar')
        const target = effect['target'] === null || effect['target'] === undefined ? null : ref(effect['target'], 'target', event)
        if (target !== null && !isAlive(world, target)) throw new Error(`${event.id}: ${target} ya no esta para votarlo`)
        const deduction = deductionOf(world)
        return setDeduction(world, { votes: { ...deduction.votes, [who]: target } })
      }
      case 'tally': {
        // Cierra la reunion: mayoria simple sella; empate o mas saltos que votos, nadie.
        const deduction = deductionOf(world)
        const counts = new Map<string | null, number>()
        for (const [voter, target] of Object.entries(deduction.votes)) {
          if (!isAlive(world, voter)) continue
          counts.set(target, (counts.get(target) ?? 0) + 1)
        }
        const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1])
        const top = ranked[0]
        const tied = ranked.length > 1 && ranked[1]![1] === top?.[1]
        let ejected = !top || tied || top[0] === null ? null : top[0]
        let next = world
        // Suerte de novato: la primera vez que lo iban a sellar, se salva.
        if (ejected && next.characters[ejected]?.id === 'novato' && custom(next, ejected)['lucky'] !== true) {
          next = setCustom(next, ejected, { lucky: true })
          ejected = null
        }
        if (ejected) next = setCustom(next, ejected, { alive: false })
        const confirm = effect['confirm'] !== false
        const role = ejected ? roleOf(next, ejected) : null
        return setDeduction(next, {
          votes: {},
          meetingNext: false,
          sinceMeeting: 0,
          lastEjected: { who: ejected, ...(confirm && role ? { role } : {}) },
        })
      }
      default:
        throw new UnknownEffectError(op, 'deduccion-social')
    }
  },
}
