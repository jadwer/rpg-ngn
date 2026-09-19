import type { CreditPack } from '@rpg-ngn/api-client'
import { describe, expect, it } from 'vitest'
import { balanceText, buyablePacks, comingSoonPacks, lowBalance, packPrice, packSessions, packValue } from './credits.js'

const pack = (over: Partial<CreditPack>): CreditPack => ({
  id: 'prepago-5',
  name: 'Sesión',
  description: '',
  amount: 500,
  currency: 'usd',
  turns: 110,
  available: true,
  ...over,
})

describe('credits', () => {
  it('enseña el precio desde la unidad menor, sin decimales cuando son redondos', () => {
    expect(packPrice(pack({}))).toBe('$5 USD')
    expect(packPrice(pack({ amount: 250 }))).toBe('$2.50 USD')
  })

  it('traduce turnos a partidas, que es lo que el jugador entiende', () => {
    expect(packSessions(pack({ turns: 110 }))).toBe(5)
    expect(packValue(pack({ turns: 110 }))).toBe('110 turnos, unas 5 partidas')
    // Un paquete que no llega a una partida lo dice en turnos, sin redondear a cero.
    expect(packValue(pack({ turns: 15 }))).toBe('15 turnos')
    expect(packValue(pack({ turns: 0, available: false }))).toBe('Pronto')
  })

  it('separa lo que se vende de lo que solo se anuncia, de barato a caro', () => {
    const packs = [pack({ id: 'b', amount: 1000 }), pack({ id: 'vip', amount: 2500, turns: 0, available: false }), pack({ id: 'a', amount: 200 })]
    expect(buyablePacks(packs).map((p) => p.id)).toEqual(['a', 'b'])
    expect(comingSoonPacks(packs).map((p) => p.id)).toEqual(['vip'])
  })

  it('dice el saldo en partidas y avisa cuando queda poco', () => {
    expect(balanceText({ remainingTurns: 110, usedTurns: 0 })).toContain('unas 5 partidas')
    expect(balanceText({ remainingTurns: 0, usedTurns: 40 })).toContain('sin turnos')
    // Menos de una partida: no se dice "0 partidas", se dice para que da.
    expect(balanceText({ remainingTurns: 8, usedTurns: 32 })).toContain('terminar la partida')

    expect(lowBalance({ remainingTurns: 8, usedTurns: 0 })).toBe(true)
    expect(lowBalance({ remainingTurns: 110, usedTurns: 0 })).toBe(false)
    // Sin saldo no es "poco saldo": es otro aviso.
    expect(lowBalance({ remainingTurns: 0, usedTurns: 0 })).toBe(false)
  })
})
