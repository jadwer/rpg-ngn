import { describe, expect, it } from 'vitest'
import { inviteTokenFrom } from './invite.js'

describe('inviteTokenFrom', () => {
  const token = 'vpSqQSyOqpDBga1jYdwvKaWaelZEExcf'

  it('saca el token de la URL entera, con espacios alrededor y con lo que venga detras', () => {
    expect(inviteTokenFrom(`  https://rpg-worlds.gabinoramirez.com/unirse/${token}  `)).toBe(token)
    expect(inviteTokenFrom(`https://rpg-worlds.gabinoramirez.com/unirse/${token}?x=1`)).toBe(token)
  })

  it('acepta el token a secas, por si alguien lo dicto', () => {
    expect(inviteTokenFrom(token)).toBe(token)
  })

  it('con cualquier otra cosa no inventa un token', () => {
    expect(inviteTokenFrom('')).toBeNull()
    expect(inviteTokenFrom('hola')).toBeNull()
    expect(inviteTokenFrom('https://rpg-worlds.gabinoramirez.com/mesas/29')).toBeNull()
    expect(inviteTokenFrom('/unirse/cort')).toBeNull()
  })
})
