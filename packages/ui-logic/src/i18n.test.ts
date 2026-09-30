import { setLanguage } from '@rpg-ngn/i18n'
import { afterEach, describe, expect, it } from 'vitest'
import { countdownLine, seatsSummary } from './table-presence.js'
import { relativeTime } from './table-list.js'
import { streakText } from './discoverer-pass.js'
import { STAT_LABELS } from './sheet.js'
import { tableLanguageOf } from './table-language.js'

afterEach(() => setLanguage('es'))

describe('i18n de ui-logic', () => {
  it('los mismos textos salen en ingles al cambiar el idioma', () => {
    const now = new Date('2026-10-01T12:00:00Z')
    expect(relativeTime('2026-10-01T10:00:00Z', now)).toBe('hace 2 horas')
    expect(seatsSummary([])).toBe('Nadie sentado todavía')
    setLanguage('en')
    expect(relativeTime('2026-10-01T10:00:00Z', now)).toBe('2 hours ago')
    expect(seatsSummary([])).toBe('Nobody seated yet')
    expect(countdownLine({ active: true, held: false, heldByName: null, remaining: 7, total: 10 } as never)).toBe('The game master narrates in 7 s')
    expect(streakText({ streak: 3, playedToday: false })).toBe('Streak of 3 days in a row. Play today or you lose it.')
    expect(STAT_LABELS.sab).toBe('WIS')
  })
})

describe('tableLanguageOf', () => {
  it('lee el idioma de la mesa y cae al español si no hay o no se conoce', () => {
    expect(tableLanguageOf({ language: 'en' })).toBe('en')
    expect(tableLanguageOf({ language: 'fr' })).toBe('es')
    expect(tableLanguageOf({})).toBe('es')
    expect(tableLanguageOf(null)).toBe('es')
  })
})
