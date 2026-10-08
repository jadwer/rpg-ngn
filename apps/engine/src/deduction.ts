import type { CampaignState } from '@rpg-ngn/campaign'
import type { LoadedPack } from '@rpg-ngn/content'
import type { RandomSource } from '@rpg-ngn/core'
import type { TurnBlock as EngineTurnBlock, TurnInput } from '@rpg-ngn/engine-contract'
import { assignRoles, isAlive, meetingNext, roleOf, tasksOf, verdict } from '@rpg-ngn/rules'

/**
 * Lo que el motor hace solo en una partida de deduccion social (Turno de
 * noche en la Persefone, 08-10; diseño en rpg-packs/inspirados/persefone.md,
 * seccion 8.3). El GM narra; aqui se sortean los roles, se cuentan los votos,
 * se guarda lo privado y se decide quien gana.
 */

export const DEDUCTION = 'deduccion-social'

/** Las tareas que ofrece la estacion, de los lugares del pack. */
export function stationTasks(pack: LoadedPack): Array<{ id: string; room: string; name: string; roomName: string }> {
  return [...pack.locations.values()].flatMap((location) => (location.tasks ?? []).map((task) => ({ id: task.id, room: location.id, name: task.name, roomName: location.name })))
}

/** Reparto al abrir: los effects `role` y el susurro de cada jugador con su rol y sus tareas. */
export function openGame(pack: LoadedPack, party: readonly string[], random: RandomSource): { effects: Array<Record<string, unknown>>; whispers: Array<{ id: string; text: string }> } {
  const tasks = stationTasks(pack)
  const names = new Map(tasks.map((t) => [t.id, t]))
  const roles = assignRoles(party, tasks, () => random.nextInt(1_000_000) / 1_000_000)
  const whispers = roles.map((r) => {
    const id = r.who.slice('character:'.length)
    const list = r.tasks.map((t) => `${names.get(t.id)?.name ?? t.id} (${pack.locations.get(t.room)?.name ?? t.room})`).join('; ')
    const text =
      r.role === 'huesped'
        ? `Eres el Huésped. Nadie lo sabe. Mata sin testigos (no dos turnos seguidos), sabotea, muévete por los ductos y finge estas tareas, que no cuentan: ${list}.`
        : `Eres tripulante. Tus tareas: ${list}. Hazlas, mira quién entra y sale, y si encuentras un cuerpo, repórtalo.`
    return { id, text }
  })
  return { effects: roles, whispers }
}

/** Si el turno que se resuelve es una reunion (lo decide el estado de antes del turno). */
export function isMeeting(state: CampaignState): boolean {
  return state.world.deduction !== undefined && meetingNext(state.world)
}

/** Los votos que trajo la API para la reunion, como effects `vote`, solo de vivos y a vivos. */
export function voteEffects(state: CampaignState, turn: TurnInput): Array<Record<string, unknown>> {
  return Object.entries(turn.votes ?? {})
    .filter(([voter, target]) => isAlive(state.world, voter) && state.world.characters[voter] && (target === null || isAlive(state.world, target)))
    .map(([voter, target]) => ({ op: 'vote', who: `character:${voter}`, target: target ? `character:${target}` : null }))
}

/** El anuncio publico tras contar los votos. */
export function ejectionText(state: CampaignState, pack: LoadedPack): string {
  const last = state.world.deduction?.lastEjected
  if (!last?.who) return 'La votación no alcanza: nadie sale por la esclusa.'
  const name = pack.characters.get(last.who)?.name ?? last.who
  if (!last.role) return `La tripulación sella a ${name} por la esclusa.`
  return last.role === 'huesped' ? `La tripulación sella a ${name} por la esclusa. Era el Huésped.` : `La tripulación sella a ${name} por la esclusa. No era el Huésped.`
}

/** Quien gana, en id de final del pack (`tripulacion` o `huesped`), o null si sigue la partida. */
export function winner(state: CampaignState, lastTurn: boolean): 'tripulacion' | 'huesped' | null {
  const result = verdict(state.world, lastTurn)
  return result === 'tripulante' ? 'tripulacion' : result
}

/** La revelacion de roles al terminar, publica. */
export function rolesReveal(state: CampaignState, pack: LoadedPack): string {
  const lines = Object.keys(state.world.characters)
    .filter((id) => roleOf(state.world, id) !== null)
    .map((id) => {
      const name = pack.characters.get(id)?.name ?? id
      const role = roleOf(state.world, id) === 'huesped' ? 'el Huésped' : 'tripulante'
      const done = tasksOf(state.world, id).filter((t) => t.done).length
      return `${name}: ${role}${roleOf(state.world, id) === 'tripulante' ? ` (${done} de ${tasksOf(state.world, id).length} tareas)` : ''}${isAlive(state.world, id) ? '' : ', no sobrevivió'}`
    })
  return lines.join('. ') + '.'
}

/**
 * Guardia de privacidad (seccion 2 del diseño): en el turno de una muerte,
 * toda narracion o dialogo publico que nombre a la victima o al asesino
 * pasa a susurro para ellos dos, salvo que alguien encontrara el cuerpo ese
 * mismo turno (entonces la victima se puede nombrar; el asesino nunca). Es
 * mecanica, no confianza en el prompt: lo que el GM escriba de mas no llega
 * a la mesa.
 */
export function guardBlocks(blocks: EngineTurnBlock[], kills: Array<{ killer: string; victim: string }>, found: boolean, pack: LoadedPack): EngineTurnBlock[] {
  if (kills.length === 0) return blocks
  // Por nombre completo o por la primera palabra del nombre, como palabra entera.
  const names = (id: string): RegExp[] => {
    const full = pack.characters.get(id)?.name ?? id
    const first = full.split(/\s+/)[0]!
    return [...new Set([full, first])].map((n) => new RegExp(`(?<![\\p{L}])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}])`, 'iu'))
  }
  return blocks.map((block) => {
    if ((block.type !== 'narration' && block.type !== 'dialogue') || block.to?.length) return block
    const text = block.type === 'dialogue' ? `${block.speaker}: ${block.text}` : block.text
    for (const { killer, victim } of kills) {
      const namesKiller = names(killer).some((re) => re.test(text))
      const namesVictim = names(victim).some((re) => re.test(text))
      if (namesKiller || (namesVictim && !found)) return { ...block, to: [killer, victim] }
    }
    return block
  })
}

/**
 * Lo que un jugador sabe de la partida, para sus ideas: su rol, sus tareas y
 * que toca este turno. Sin esto las ideas no sabian el rol: casi nadie hizo
 * tareas y el Huesped nunca mato (mesa 50).
 */
export function playerView(state: CampaignState, pack: LoadedPack, id: string, meeting: boolean): string | null {
  const world = state.world
  const role = roleOf(world, id)
  if (!role) return null
  const name = (who: string) => pack.characters.get(who)?.name ?? who
  const room = (where: string | null | undefined) => (where ? (pack.locations.get(where)?.name ?? where) : 'sin sala')
  const alive = isAlive(world, id)
  const lines = ['# Tu partida', '']
  if (!alive) {
    lines.push('Estás muerto: eres un fantasma. Nadie te ve ni te oye. Solo puedes seguir haciendo tus tareas.')
  } else if (role === 'huesped') {
    lines.push('Eres el Huésped. Nadie lo sabe y nadie debe saberlo. Tus tareas son falsas: fíngelas para que te vean en esas salas.')
  } else {
    lines.push('Eres tripulante. Tu trabajo es hacer tus tareas en su sala y fijarte en quién entra y sale.')
  }
  lines.push(`Estás en ${room(world.characters[id]?.location)}. Siguen con vida: ${Object.keys(world.characters).filter((c) => roleOf(world, c) && isAlive(world, c)).map(name).join(', ')}.`)
  const tasks = tasksOf(world, id)
  if (tasks.length) lines.push(`Tus tareas: ${tasks.map((t) => `${t.name ?? t.id} en ${t.roomName ?? room(t.room)}${t.done ? ' (hecha)' : ''}`).join('; ')}.`)
  if (meeting) {
    lines.push(alive ? 'Ahora es una REUNIÓN: las ideas son lo que dices en voz alta (dónde estuviste, qué viste, a quién acusas y por qué), no moverte ni hacer tareas. El voto va aparte.' : 'Es una reunión y los fantasmas no hablan.')
  } else if (alive && role === 'huesped') {
    const lastKill = world.characters[id]?.custom['lastKill']
    const ready = typeof lastKill !== 'number' || (world.deduction?.actionTurns ?? 0) - lastKill >= 2
    lines.push(`Este turno puedes: ir a una sala y fingir una tarea, seguir a alguien, ${ready ? 'matar a alguien que esté a solas contigo en tu sala, ' : ''}sabotear las luces o el reactor, o moverte por los ductos (Reactor, Médica, Carga). Una idea puede ser matar a alguien concreto si está solo.`)
  } else if (alive) {
    lines.push('Este turno: ve a la sala de una tarea pendiente y hazla, sigue a alguien, o revisa algo. Si encuentras un cuerpo, repórtalo.')
  }
  return lines.join('\n')
}

/**
 * Lo que el GM tiene que saber de la partida este turno: la fase, lo publico
 * y lo que solo el sabe (quien es el Huesped, cuerpos sin encontrar, tareas).
 * Sustituye al reloj de historia en el contexto: aqui no hay gancho ni climax.
 */
export function gmView(state: CampaignState, pack: LoadedPack, meeting: boolean): string {
  const world = state.world
  const deduction = world.deduction
  const name = (id: string) => pack.characters.get(id)?.name ?? id
  const room = (id: string | null | undefined) => (id ? (pack.locations.get(id)?.name ?? id) : 'sin sala')
  const everyone = Object.keys(world.characters).filter((id) => roleOf(world, id) !== null)
  const alive = everyone.filter((id) => isAlive(world, id))
  const lines = ['# La partida (deducción social)', '']
  if (meeting) {
    lines.push(
      'Este turno es una REUNIÓN. Los votos ya se contaron y el resultado ya se anunció a la mesa: ' + ejectionText(state, pack),
      'Resume en público lo que se sabe (quién encontró qué, dónde estaba cada uno según lo que se vio), recoge lo que dijo cada jugador y narra cómo sale o no sale alguien por la esclusa. No opines ni insinúes quién es el Huésped. No propongas efectos de la partida en este turno.',
    )
  } else {
    lines.push(
      `Turno de acción ${(deduction?.actionTurns ?? 0) + 1}. Cada jugador declaró en privado qué hace y a dónde va. Narra por sala solo lo que se ve; susurra lo que solo uno vio.`,
      'Registra lo que cada uno hizo con estos efectos, en nombre de quien lo declaró (el motor rechaza lo que no cuadra; si alguien intenta algo que no puede, narra que no pudo):',
      '{"kind":"state_change","effects":[{"op":"move","who":"character:<id>","to":"<sala>"}]} cada vez que alguien cambia de sala, antes que lo demás.',
      '{"kind":"state_change","effects":[{"op":"task_done","who":"character:<id>","task":"<tarea>"}]} si hizo una de sus tareas estando en su sala.',
      '{"kind":"state_change","effects":[{"op":"kill","who":"character:<huesped>","target":"character:<id>"}]} solo si el Huésped declaró matar a alguien que está en su misma sala.',
      '{"kind":"state_change","effects":[{"op":"vent","who":"character:<huesped>","to":"<sala>"}]}, {"op":"sabotage","who":...,"kind":"luces|reactor"}: solo el Huésped.',
      '{"op":"fix","who":"character:<id>"} en Eléctrico (luces) o Reactor (hacen falta dos el mismo turno); {"op":"report","who":...} si encontró un cuerpo en su sala; {"op":"button","who":...} si pulsó el botón; {"op":"ability","who":...} si usó la habilidad de su oficio.',
    )
  }
  lines.push('', 'Lo público:', `- Vivos: ${alive.map(name).join(', ') || 'nadie'}.`)
  const found = (deduction?.bodies ?? []).filter((b) => b.found)
  if (found.length) lines.push(`- Cuerpos encontrados: ${found.map((b) => `${name(b.who)} en ${room(b.room)}`).join('; ')}.`)
  if (deduction?.sabotage) lines.push(`- Sabotaje activo: ${deduction.sabotage.kind}${deduction.sabotage.kind === 'reactor' ? ' (si no lo arreglan dos personas en Reactor este turno o el siguiente, la estación se pierde)' : ''}.`)
  const ejected = deduction?.lastEjected
  if (ejected?.who) lines.push(`- Último sellado: ${name(ejected.who)}${ejected.role ? (ejected.role === 'huesped' ? ' (era el Huésped)' : ' (no era el Huésped)') : ''}.`)
  lines.push('', 'Solo para ti (nunca lo narres en público):')
  for (const id of everyone) {
    const tasks = tasksOf(world, id)
    lines.push(`- ${name(id)}: ${roleOf(world, id) === 'huesped' ? 'EL HUÉSPED' : 'tripulante'}, ${isAlive(world, id) ? `en ${room(world.characters[id]?.location)}` : 'muerto (fantasma)'}; tareas: ${tasks.map((t) => `${t.id} en ${room(t.room)}${t.done ? ' (hecha)' : ''}`).join(', ') || 'ninguna'}.`)
  }
  const hidden = (deduction?.bodies ?? []).filter((b) => !b.found)
  if (hidden.length) lines.push(`- Cuerpos sin encontrar: ${hidden.map((b) => `${name(b.who)} en ${room(b.room)}`).join('; ')}. Quien entre en esa sala lo ve.`)
  return lines.join('\n')
}
