import { describe, expect, it } from 'vitest'
import { POLL_ACTIVE_MS, POLL_IDLE_MS, pollDelay } from './polling.js'

describe('cada cuanto preguntar por la mesa', () => {
  it('con la pantalla oculta no pregunta', () => {
    expect(pollDelay({ visible: false, session: { status: 'open' }, turn: { status: 'resolving' } })).toBeNull()
  })

  it('oculta pero escuchando la narracion, sigue despacio', () => {
    expect(pollDelay({ visible: false, listening: true, session: { status: 'open' }, turn: { status: 'open' } })).toBe(POLL_IDLE_MS)
  })

  it('con la sesion abierta o un turno narrandose, rapido', () => {
    expect(pollDelay({ visible: true, session: { status: 'open' }, turn: { status: 'open' } })).toBe(POLL_ACTIVE_MS)
    expect(pollDelay({ visible: true, session: null, turn: { status: 'resolving' } })).toBe(POLL_ACTIVE_MS)
  })

  it('sin sesion, despacio', () => {
    expect(pollDelay({ visible: true, session: null, turn: null })).toBe(POLL_IDLE_MS)
    expect(pollDelay({ visible: true, session: { status: 'closed' }, turn: { status: 'resolved' } })).toBe(POLL_IDLE_MS)
  })
})
