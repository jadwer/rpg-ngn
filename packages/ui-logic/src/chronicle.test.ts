import { describe, expect, it } from 'vitest'
import { chronicleStatus, chronicleUrl } from './chronicle.js'

const members = [
  { memberId: '1', name: 'Gabino', consented: true },
  { memberId: '2', name: 'Jaz', consented: false },
  { memberId: '3', name: null, consented: false },
]

describe('estado de la cronica compartida', () => {
  it('sin enlace no hay nada que aceptar', () => {
    expect(chronicleStatus(null)).toMatchObject({ state: 'none', canConsent: false })
  })

  it('pendiente dice quien falta y deja aceptar a quien no lo hizo', () => {
    const status = chronicleStatus({ token: 't', anonymize: false, public: false, mine: false, members })
    expect(status.state).toBe('pending')
    expect(status.text).toContain('Jaz, alguien')
    expect(status.canConsent).toBe(true)
    expect(chronicleStatus({ token: 't', anonymize: false, public: false, mine: true, members }).canConsent).toBe(false)
  })

  it('publica cuando todos aceptaron', () => {
    expect(chronicleStatus({ token: 't', anonymize: false, public: true, mine: true, members }).state).toBe('public')
  })

  it('arma la URL publica sin barras dobles', () => {
    expect(chronicleUrl('https://rpg-worlds.gabinoramirez.com/', 'abc')).toBe('https://rpg-worlds.gabinoramirez.com/cronica/abc')
  })
})
