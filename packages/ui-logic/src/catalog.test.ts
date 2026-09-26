import type { WorldCatalog } from '@rpg-ngn/api-client'
import { describe, expect, it } from 'vitest'
import { cardView, durationLabel, playersTag, seasonProgress } from './catalog.js'

const catalog = { genre: 'Intriga', author: 'Nara', players: { min: 2, max: 5 }, duration: 'media' } as WorldCatalog
const w = (over: object) => ({ state: 'gratis', origin: 'oficial', catalog, price: null, path: null, name: 'X', ...over }) as Parameters<typeof cardView>[0]

describe('catalog', () => {
  it('cada estado del tablero dice lo suyo y hace lo suyo', () => {
    expect(cardView(w({}))).toMatchObject({ byline: 'Oficial', price: 'Gratis', action: 'jugar', label: 'Jugar' })
    expect(cardView(w({ state: 'tuyo' }))).toMatchObject({ badge: 'Ya es tuyo', action: 'jugar' })
    expect(cardView(w({ state: 'pase' }))).toMatchObject({ badge: 'Incluido en tu pase', action: 'jugar' })
    expect(cardView(w({ state: 'venta', price: { amount: 300, currency: 'usd' } }))).toMatchObject({ price: '3 USD', action: 'comprar', label: 'Comprar' })
    expect(cardView(w({ state: 'comunidad', origin: 'comunidad' }))).toMatchObject({ byline: 'Comunidad · por Nara', action: 'anadir', label: 'Añadir a mis mundos' })
  })

  it('en el camino de temporada enseña cuanto falta y la barra', () => {
    const v = cardView(w({ state: 'camino', path: { threshold: 20, have: 5 } }))
    expect(v).toMatchObject({ action: 'bloqueado', hint: 'Se desbloquea en 15 capítulos' })
    expect(v.progress).toBeCloseTo(0.25)
    expect(cardView(w({ state: 'camino', path: { threshold: 20, have: 19 } })).hint).toBe('Se desbloquea en 1 capítulo')
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
})
