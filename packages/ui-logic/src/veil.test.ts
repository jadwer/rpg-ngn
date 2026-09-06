import { beforeAll, describe, expect, it } from 'vitest'
import { characterSlot, characterVisibility, everPlayed, sessionVeils, sessionVisibility } from './veil.js'
import { loadPilot, sessionOf, type Pilot } from './pilot.test-helpers.js'

let pilot: Pilot
beforeAll(async () => {
  pilot = await loadPilot()
})

describe('velado de fichas con el pack piloto', () => {
  it('la sesion 003 (planeada, con personajes a elegir) vela; 001 y 002 no', () => {
    expect(sessionVeils(sessionOf(pilot.pack, '003'))).toBe(true)
    expect(sessionVeils(sessionOf(pilot.pack, '002'))).toBe(false)
    expect(sessionVeils(sessionOf(pilot.pack, '001'))).toBe(false)
  })

  it('en la 003 los seis viajeros sin dueño ocultan bio, goal, quote y abilities', () => {
    const played = everPlayed(pilot.pack.sessions.values())
    const session = sessionOf(pilot.pack, '003')
    for (const id of session.availableCharacters ?? []) {
      const visibility = characterVisibility(session, { id }, played)
      expect(visibility.veiled, id).toBe(true)
      expect(visibility.fields).toEqual({ bio: false, goal: false, quote: false, abilities: false })
    }
  })

  it('a quien ya se jugo (Calder, Narivyl, Zahira) lo conoce la mesa y no se vela', () => {
    const played = everPlayed(pilot.pack.sessions.values())
    const session = sessionOf(pilot.pack, '003')
    for (const id of ['calder', 'narivyl', 'zahira']) {
      const visibility = characterVisibility(session, { id }, played)
      expect(visibility.veiled, id).toBe(false)
      expect(visibility.fields).toEqual({ bio: true, goal: true, quote: true, abilities: true })
    }
  })

  it('en una sesion jugada nadie se vela, tampoco quien no estuvo', () => {
    const played = everPlayed(pilot.pack.sessions.values())
    const visibility = characterVisibility(sessionOf(pilot.pack, '002'), { id: 'brorg' }, played)
    expect(visibility.veiled).toBe(false)
  })

  it('la sesion puede velar solo algunos campos', () => {
    const visibility = characterVisibility(sessionOf(pilot.pack, '003'), { id: 'brorg' }, new Set(), { veiledFields: ['bio'] })
    expect(visibility.veiled).toBe(true)
    expect(visibility.fields).toEqual({ bio: false, goal: true, quote: true, abilities: true })
  })

  it('recap y cabos sueltos solo en sesiones jugadas', () => {
    expect(sessionVisibility(sessionOf(pilot.pack, '002'))).toEqual({ recap: true, openThreads: true, choosing: false })
    expect(sessionVisibility(sessionOf(pilot.pack, '003'))).toEqual({ recap: false, openThreads: false, choosing: true })
  })

  it('una sesion planeada con recap escrito por error sigue sin mostrarlo', () => {
    const planned = { ...sessionOf(pilot.pack, '003'), recap: 'spoiler', openThreads: ['spoiler'] }
    expect(sessionVisibility(planned)).toEqual({ recap: false, openThreads: false, choosing: true })
  })

  it('characterSlot distingue jugado, libre y ausente', () => {
    const s002 = sessionOf(pilot.pack, '002')
    const s003 = sessionOf(pilot.pack, '003')
    expect(characterSlot(s002, 'zahira')).toEqual({ kind: 'taken', player: 'Jaz' })
    expect(characterSlot(s002, 'brorg')).toEqual({ kind: 'absent' })
    expect(characterSlot(s003, 'brorg')).toEqual({ kind: 'free' })
    expect(characterSlot(s003, 'zahira')).toEqual({ kind: 'absent' })
  })
})
