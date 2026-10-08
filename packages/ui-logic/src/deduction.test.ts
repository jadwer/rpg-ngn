import type { DeductionView } from '@rpg-ngn/api-client'
import { describe, expect, it } from 'vitest'
import { deductionAlerts, deductionBallot, deductionHeader, deductionPending, deductionProgress, deductionRole, deductionRoomName, deductionTasks } from './deduction.js'

const names: Record<string, string> = { kael: 'Kael', zahira: 'Zahira', brorg: 'Brorg', calder: 'Calder' }
const name = (id: string) => names[id] ?? id
const room = (id: string) => ({ plaza: 'La plaza', medica: 'Médica', reactor: 'Reactor' })[id] ?? id

const view = (patch: Partial<DeductionView> = {}): DeductionView => ({
  phase: 'accion',
  players: ['kael', 'zahira', 'calder', 'brorg'],
  alive: ['kael', 'zahira', 'brorg'],
  tasks: { done: 2, total: 9 },
  bodies: [],
  sabotage: null,
  lastEjected: null,
  voted: [],
  pendingVotes: [],
  me: { role: 'tripulante', alive: true, tasks: [{ id: 'analizar', room: 'medica', done: false }], abilityUsed: false, buttonUsed: false, vote: null },
  ...patch,
})

describe('deduccion social en la mesa', () => {
  it('cabecera, rol propio, tareas y avisos', () => {
    expect(deductionHeader(view())).toBe('Turno de acción · Tareas 2 de 9 · 3 con vida')
    expect(deductionHeader(view({ phase: 'reunion' }))).toBe('Reunión · Tareas 2 de 9 · 3 con vida')
    expect(deductionRole(view())).toMatchObject({ title: 'Eres tripulante', tone: 'crew' })
    expect(deductionRole(view({ me: { ...view().me!, role: 'huesped' } }))).toMatchObject({ title: 'Eres el Huésped', tone: 'host' })
    expect(deductionRole(view({ me: { ...view().me!, alive: false } }))?.tone).toBe('ghost')
    expect(deductionRole(view({ me: null }))).toBeNull()
    expect(deductionTasks(view(), room)).toEqual([{ id: 'analizar', label: 'analizar · Médica', done: false }])
    const named = view({ me: { ...view().me!, tasks: [{ id: 'analizar', room: 'medica', done: true, name: 'Analizar la muestra', roomName: 'Médica' }] } })
    expect(deductionTasks(named, room)).toEqual([{ id: 'analizar', label: 'Analizar la muestra · Médica', done: true }])
    expect(deductionRoomName(named, 'medica')).toBe('Médica')
    expect(deductionRoomName(named, 'sala-comun')).toBe('Sala comun')
    expect(deductionAlerts(view({ sabotage: { kind: 'reactor' }, bodies: [{ who: 'calder', room: 'plaza' }] }), name, room)).toEqual(['Sabotaje: el reactor se sobrecarga', 'Cuerpos encontrados: Calder (La plaza)'])
  })

  it('la papeleta: vivos menos uno mismo, el voto actual, los fantasmas no votan; fuera de reunion no hay', () => {
    expect(deductionBallot(view(), name, 'zahira')).toBeNull()
    const ballot = deductionBallot(view({ phase: 'reunion', pendingVotes: ['kael', 'brorg'], me: { ...view().me!, vote: { target: 'brorg' } } }), name, 'zahira')!
    expect(ballot.options.map((o) => o.id)).toEqual(['kael', 'brorg'])
    expect(ballot.options.find((o) => o.id === 'brorg')?.chosen).toBe(true)
    expect(ballot.current).toBe('Tu voto: Brorg')
    expect(ballot.waiting).toBe('Faltan por votar: Kael, Brorg')
    expect(deductionBallot(view({ phase: 'reunion', me: { ...view().me!, vote: { target: null } } }), name, 'zahira')).toMatchObject({ skipChosen: true, current: 'Tu voto: saltar' })
    expect(deductionBallot(view({ phase: 'reunion', me: { ...view().me!, alive: false } }), name, 'zahira')?.canVote).toBe(false)
  })

  it('en una reunion faltan los que no han votado, no los que no han escrito', () => {
    expect(deductionPending(view({ phase: 'reunion', pendingVotes: ['kael'] }), ['zahira', 'brorg'])).toEqual(['kael'])
    expect(deductionPending(view(), ['zahira'])).toEqual(['zahira'])
    expect(deductionPending(null, ['zahira'])).toEqual(['zahira'])
  })

  it('en una reunion el turno se puede cerrar cuando votaron todos los vivos, aunque nadie escribiera', () => {
    const base = { pending: ['kael', 'zahira'], responded: [], complete: false, narrating: false, canRespond: true, mustRoll: null, hasResponded: false, canClose: false, canForceClose: true }
    expect(deductionProgress(base, view({ phase: 'reunion', pendingVotes: [] }), true, false)).toMatchObject({ pending: [], complete: true, canClose: true, canForceClose: false })
    expect(deductionProgress(base, view({ phase: 'reunion', pendingVotes: ['kael'] }), true, true)).toMatchObject({ pending: ['kael'], complete: false, canClose: false, canForceClose: true })
    expect(deductionProgress(base, view({ phase: 'reunion', me: { ...view().me!, alive: false } }), true, false).canRespond).toBe(false)
    expect(deductionProgress(base, view(), true, false)).toBe(base)
  })
})
