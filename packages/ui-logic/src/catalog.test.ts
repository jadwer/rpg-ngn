import type { WorldCatalog } from '@rpg-ngn/api-client'
import { describe, expect, it } from 'vitest'
import { cardView, catalogBlessing, durationLabel, passView, playersTag, seasonPathLine, seasonProgress, stopLabel } from './catalog.js'

const catalog = { genre: 'Intriga', author: 'Nara', players: { min: 2, max: 5 }, duration: 'media' } as WorldCatalog
const w = (over: object) => ({ state: 'gratis', origin: 'oficial', catalog, price: null, path: null, name: 'X', ...over }) as Parameters<typeof cardView>[0]

describe('catalog', () => {
  it('cada estado del tablero dice lo suyo y hace lo suyo', () => {
    expect(cardView(w({}))).toMatchObject({ byline: 'Oficial', price: 'Gratis', action: 'jugar', label: 'Jugar' })
    expect(cardView(w({ state: 'tuyo' }))).toMatchObject({ badge: 'Ya es tuyo', action: 'jugar' })
    expect(cardView(w({ state: 'pase' }))).toMatchObject({ badge: 'Incluido en tu pase', action: 'jugar' })
    expect(cardView(w({ state: 'venta', price: { amount: 300, currency: 'usd' } }))).toMatchObject({ price: '$3 USD', action: 'comprar', label: 'Comprar' })
    expect(cardView(w({ state: 'venta', price: { amount: 300, currency: 'usd', charge: { amount: 5500, currency: 'mxn' } } })).price).toBe('$3 USD ($55 MXN)')
    expect(cardView(w({ state: 'tuyo', source: 'pase' })).badge).toBe('Incluido en tu pase')
    expect(cardView(w({ state: 'comunidad', origin: 'comunidad' }))).toMatchObject({ byline: 'Comunidad · por Nara', action: 'anadir', label: 'Añadir a mis mundos' })
  })

  it('en el camino de temporada enseña cuanto falta y la barra', () => {
    const v = cardView(w({ state: 'camino', path: { threshold: 20, have: 5 } }))
    expect(v).toMatchObject({ action: 'bloqueado', hint: 'Se desbloquea en 15 capítulos o con el pase' })
    expect(v.progress).toBeCloseTo(0.25)
    expect(cardView(w({ state: 'camino', path: { threshold: 20, have: 19 } })).hint).toBe('Se desbloquea en 1 capítulo o con el pase')
  })

  it('etiquetas cortas', () => {
    expect(playersTag({ min: 3, max: 5 })).toBe('3-5')
    expect(playersTag({ min: 1, max: 1 })).toBe('1')
    expect(durationLabel('larga')).toBe('Larga')
  })
})

describe('seasonProgress', () => {
  it('coloca cada mundo en la linea contra el ultimo umbral', () => {
    const r = seasonProgress({ chapters: 30, worlds: [{ packId: 'a', threshold: 0, unlocked: true }, { packId: 'b', threshold: 20, unlocked: true }, { packId: 'c', threshold: 120, unlocked: false }] })
    expect(r.progress).toBeCloseTo(0.25)
    expect(r.stops.map((s) => s.at)).toEqual([0, 20 / 120, 1])
  })

  it('el pase dice su precio en las dos monedas y si ya es tuyo', () => {
    expect(passView(null)).toBeNull()
    const v = passView({ season: 't1', amount: 500, currency: 'usd', charge: { amount: 9200, currency: 'mxn' }, owned: false })
    expect(v).toMatchObject({ price: '$5 USD ($92 MXN)', owned: false, label: 'Comprar el pase' })
    expect(passView({ season: 't1', amount: 500, currency: 'usd', charge: null, owned: true })?.label).toBe('Tu pase está activo')
    expect(catalogBlessing('mundo', 'El Faro').text).toContain('El Faro')
  })

  it('el camino y el precio del pase dicen lo mismo en web y app', () => {
    expect(stopLabel({ threshold: 0, unlocked: true })).toBe('Gratis')
    expect(stopLabel({ threshold: 20, unlocked: true })).toBe('Abierto')
    expect(stopLabel({ threshold: 20, unlocked: false })).toBe('20 capítulos')
    expect(stopLabel({ threshold: 1, unlocked: false })).toBe('1 capítulo')
    expect(seasonPathLine([{ packId: 'pilot', threshold: 0, unlocked: true }, { packId: 'mascarada', threshold: 20, unlocked: false }], { pilot: 'Los Nueve Viajeros' })).toBe('Los Nueve Viajeros: gratis  ·  mascarada: 20 capítulos')
    expect(passView({ season: 't1', amount: 500, currency: 'usd', charge: { amount: 9200, currency: 'mxn' }, owned: false })?.priceLine).toBe('$5 USD ($92 MXN), pago único')
    expect(passView({ season: 't1', amount: 500, currency: 'usd', charge: null, owned: true })?.priceLine).toBe('Ya es tuyo esta temporada')
  })
})
