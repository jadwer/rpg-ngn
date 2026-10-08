import type { CampaignEvent } from '@rpg-ngn/content'
import type { WorldState } from '@rpg-ngn/core'
import { describe, expect, it } from 'vitest'
import { assignRoles, deduccionSocial, isAlive, meetingNext, roleOf, tasksProgress, verdict } from './deduccion-social.js'
import { resolveRuleset } from './index.js'

const event = { id: 'evt-00010' } as CampaignEvent
const apply = (world: WorldState, effect: Record<string, unknown>) => deduccionSocial.applyEffect(world, effect, event)
const at = (world: WorldState, id: string, room: string): WorldState => ({ ...world, characters: { ...world.characters, [id]: { ...world.characters[id]!, location: room } } })

/** Cinco tripulantes: el Huesped es `seguridad`; todos empiezan en el pasillo. */
function table(): WorldState {
  const ids = ['reactor', 'medica', 'seguridad', 'cocina', 'novato']
  let world: WorldState = { worldTime: null, characters: {}, npcs: {} }
  for (const id of ids) world.characters[id] = { ...deduccionSocial.initialCharacterState({ id } as never), location: 'pasillo' }
  for (const id of ids) {
    world = apply(world, { op: 'role', who: `character:${id}`, role: id === 'seguridad' ? 'huesped' : 'tripulante', tasks: [{ id: `${id}-1`, room: 'electrico' }] })
  }
  return world
}

describe('deduccion-social', () => {
  it('se registra y reparte un Huesped y tres tareas por cabeza; con menos de cuatro no hay partida', () => {
    expect(resolveRuleset('deduccion-social@1.0.0').id).toBe('deduccion-social')
    const pool = Array.from({ length: 16 }, (_, i) => ({ id: `t${i}`, room: `sala-${i % 5}` }))
    let seed = 0.42
    const random = () => (seed = (seed * 9301 + 49297) % 233280 / 233280)
    const roles = assignRoles(['a', 'b', 'c', 'd', 'e'], pool, random)
    expect(roles.filter((r) => r.role === 'huesped')).toHaveLength(1)
    for (const r of roles) expect(new Set(r.tasks.map((t) => t.id)).size).toBe(3)
    expect(() => assignRoles(['a', 'b', 'c'], pool, random)).toThrow(/al menos 4/)
  })

  it('una tarea cuenta si es tuya y estas en su sala; la del Huesped no cuenta ni falla', () => {
    let world = table()
    expect(() => apply(world, { op: 'task_done', who: 'character:medica', task: 'medica-1' })).toThrow(/no esta en electrico/)
    world = at(world, 'medica', 'electrico')
    world = apply(world, { op: 'task_done', who: 'character:medica', task: 'medica-1' })
    expect(tasksProgress(world)).toEqual({ done: 1, total: 4 })
    world = at(world, 'seguridad', 'electrico')
    expect(apply(world, { op: 'task_done', who: 'character:seguridad', task: 'seguridad-1' })).toBe(world)
    expect(() => apply(world, { op: 'task_done', who: 'character:medica', task: 'cocina-1' })).toThrow(/no tiene la tarea/)
  })

  it('el Huesped mata en su sala, deja un cuerpo y tiene recarga; nadie mas mata', () => {
    let world = table()
    expect(() => apply(world, { op: 'kill', who: 'character:medica', target: 'character:cocina' })).toThrow(/solo el Huesped/)
    world = apply(world, { op: 'kill', who: 'character:seguridad', target: 'character:cocina' })
    expect(isAlive(world, 'cocina')).toBe(false)
    expect(world.deduction?.bodies).toEqual([{ who: 'cocina', room: 'pasillo', found: false }])
    // Recarga: en el mismo turno y en el siguiente no puede.
    expect(() => apply(world, { op: 'kill', who: 'character:seguridad', target: 'character:medica' })).toThrow(/aun no puede/)
    world = apply(world, { op: 'tick' })
    expect(() => apply(world, { op: 'kill', who: 'character:seguridad', target: 'character:medica' })).toThrow(/aun no puede/)
    world = apply(world, { op: 'tick' })
    world = apply(world, { op: 'kill', who: 'character:seguridad', target: 'character:medica' })
    expect(isAlive(world, 'medica')).toBe(false)
    // Otra sala: no.
    world = apply(apply(world, { op: 'tick' }), { op: 'tick' })
    world = at(world, 'reactor', 'reactor')
    expect(() => apply(world, { op: 'kill', who: 'character:seguridad', target: 'character:reactor' })).toThrow(/misma sala/)
  })

  it('reportar un cuerpo de tu sala o pulsar el boton abren reunion; cada dos turnos de accion toca sola', () => {
    let world = table()
    world = apply(world, { op: 'kill', who: 'character:seguridad', target: 'character:cocina' })
    expect(() => apply(at(world, 'medica', 'medica'), { op: 'report', who: 'character:medica' })).toThrow(/no hay cuerpo/)
    world = apply(world, { op: 'report', who: 'character:medica' })
    expect(meetingNext(world)).toBe(true)
    world = apply(world, { op: 'tally' })
    expect(meetingNext(world)).toBe(false)
    world = apply(world, { op: 'button', who: 'character:reactor' })
    expect(meetingNext(world)).toBe(true)
    expect(() => apply(world, { op: 'button', who: 'character:reactor' })).toThrow(/ya uso su botón/)
    world = apply(world, { op: 'tally' })
    world = apply(apply(world, { op: 'tick' }), { op: 'tick' })
    expect(meetingNext(world)).toBe(true)
  })

  it('la mayoria sella y se confirma el rol; empate o saltos no sellan; el Novato se salva una vez', () => {
    let world = table()
    for (const voter of ['reactor', 'medica', 'cocina']) world = apply(world, { op: 'vote', who: `character:${voter}`, target: 'character:seguridad' })
    world = apply(world, { op: 'vote', who: 'character:seguridad', target: 'character:reactor' })
    world = apply(world, { op: 'tally' })
    expect(isAlive(world, 'seguridad')).toBe(false)
    expect(world.deduction?.lastEjected).toEqual({ who: 'seguridad', role: 'huesped' })
    expect(verdict(world)).toBe('tripulante')

    let tie = table()
    tie = apply(tie, { op: 'vote', who: 'character:reactor', target: 'character:medica' })
    tie = apply(tie, { op: 'vote', who: 'character:cocina', target: 'character:seguridad' })
    tie = apply(tie, { op: 'tally', confirm: false })
    expect(tie.deduction?.lastEjected).toEqual({ who: null })

    let skips = table()
    skips = apply(skips, { op: 'vote', who: 'character:reactor', target: null })
    skips = apply(skips, { op: 'vote', who: 'character:cocina', target: null })
    skips = apply(skips, { op: 'vote', who: 'character:medica', target: 'character:seguridad' })
    expect(apply(skips, { op: 'tally' }).deduction?.lastEjected).toEqual({ who: null })

    let lucky = table()
    for (const voter of ['reactor', 'medica', 'cocina']) lucky = apply(lucky, { op: 'vote', who: `character:${voter}`, target: 'character:novato' })
    lucky = apply(lucky, { op: 'tally' })
    expect(isAlive(lucky, 'novato')).toBe(true)
    for (const voter of ['reactor', 'medica', 'cocina']) lucky = apply(lucky, { op: 'vote', who: `character:${voter}`, target: 'character:novato' })
    lucky = apply(lucky, { op: 'tally' })
    expect(isAlive(lucky, 'novato')).toBe(false)
    // Un muerto no vota.
    expect(() => apply(lucky, { op: 'vote', who: 'character:novato', target: null })).toThrow(/muerto/)
  })

  it('el Huesped gana en paridad, con el reactor perdido o al acabarse el aire', () => {
    let parity = table()
    parity = apply(parity, { op: 'kill', who: 'character:seguridad', target: 'character:cocina' })
    parity = apply(apply(parity, { op: 'tick' }), { op: 'tick' })
    parity = apply(parity, { op: 'kill', who: 'character:seguridad', target: 'character:medica' })
    expect(verdict(parity)).toBeNull()
    parity = apply(apply(parity, { op: 'tick' }), { op: 'tick' })
    parity = apply(parity, { op: 'kill', who: 'character:seguridad', target: 'character:reactor' })
    expect(verdict(parity)).toBe('huesped')

    let reactor = table()
    reactor = apply(reactor, { op: 'sabotage', who: 'character:seguridad', kind: 'reactor' })
    expect(() => apply(reactor, { op: 'sabotage', who: 'character:seguridad', kind: 'luces' })).toThrow(/ya hay un sabotaje/)
    reactor = apply(reactor, { op: 'tick' })
    // Uno solo en Reactor no basta.
    const fixing = apply(at(reactor, 'medica', 'reactor'), { op: 'fix', who: 'character:medica' })
    expect(fixing.deduction?.sabotage?.fixers).toEqual(['medica'])
    const fixed = apply(at(fixing, 'cocina', 'reactor'), { op: 'fix', who: 'character:cocina' })
    expect(fixed.deduction?.sabotage).toBeNull()
    reactor = apply(reactor, { op: 'tick' })
    expect(verdict(reactor)).toBe('huesped')

    expect(verdict(table(), true)).toBe('huesped')
    expect(verdict(table())).toBeNull()
    expect(roleOf(table(), 'seguridad')).toBe('huesped')
  })

  it('las tareas completas dan la victoria a la tripulacion aunque el Huesped siga vivo', () => {
    let world = table()
    for (const id of ['reactor', 'medica', 'cocina', 'novato']) {
      world = at(world, id, 'electrico')
      world = apply(world, { op: 'task_done', who: `character:${id}`, task: `${id}-1` })
    }
    expect(verdict(world)).toBe('tripulante')
  })
})
