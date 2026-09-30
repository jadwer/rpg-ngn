import { setLanguage } from '@rpg-ngn/i18n'
import { afterEach, describe, expect, it } from 'vitest'
import { blessingDaysText, blessingDue } from './blessing.js'

afterEach(() => setLanguage('es'))

describe('Bendicion del bardo', () => {
  it('cuenta los dias por recoger y avisa el ultimo', () => {
    expect(blessingDaysText({ daysLeft: 30, claimable: true })).toBe('Te quedan 30 días por recoger')
    expect(blessingDaysText({ daysLeft: 1, claimable: false })).toBe('Te queda 1 día por recoger')
    expect(blessingDaysText({ daysLeft: 1, claimable: true })).toBe('Hoy es el último día de tu Bendición')
    setLanguage('en')
    expect(blessingDaysText({ daysLeft: 12, claimable: false })).toBe('12 days left to collect')
  })

  it('el aviso aparece solo con Bendicion activa y turnos sin recoger', () => {
    expect(blessingDue({ active: true, claimable: true })).toBe(true)
    expect(blessingDue({ active: true, claimable: false })).toBe(false)
    expect(blessingDue({ active: false, claimable: false })).toBe(false)
    expect(blessingDue(null)).toBe(false)
  })
})
