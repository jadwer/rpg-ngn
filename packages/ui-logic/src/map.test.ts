import type { PackMapView } from '@rpg-ngn/api-client'
import type { CharacterState } from '@rpg-ngn/core'
import { describe, expect, it } from 'vitest'
import { currentMapIndex, mapEdges, mapView, whereEveryoneIs } from './map.js'

/**
 * El mapa que pidio Gabino: saber donde esta cada uno, quien anda junto y
 * quien salio a explorar. Las coordenadas son del pack; aqui solo se cruza
 * con el estado vivo.
 */

const palacio: PackMapView = {
  id: 'palacio',
  name: 'Palacio de Montclair',
  image: 'maps/palacio.webp',
  description: null,
  places: [
    { id: 'salon-grande', name: 'Salón grande', x: 53.5, y: 41, connections: ['comedor', 'biblioteca'] },
    { id: 'comedor', name: 'Comedor', x: 17.5, y: 40, connections: ['salon-grande'] },
    { id: 'biblioteca', name: 'Biblioteca', x: 86, y: 14, connections: ['salon-grande'] },
  ],
}

const quien = (location: string | null): CharacterState =>
  ({ id: 'x', hp: { current: 1, max: 1 }, conditions: [], inventory: [], fortune: null, memoriesRecovered: 0, location, custom: {} }) as CharacterState

const mundo = {
  camille: quien('salon-grande'),
  armand: quien('salon-grande'),
  margot: quien('comedor'),
  sebastien: quien(null),
}

describe('mapView', () => {
  it('agrupa a quien esta en cada lugar y aparta a quien anda de camino', () => {
    const view = mapView(palacio, mundo, ['camille', 'armand', 'margot', 'sebastien'])!
    expect(view.pins.find((p) => p.id === 'salon-grande')?.who).toEqual(['camille', 'armand'])
    expect(view.pins.find((p) => p.id === 'comedor')?.who).toEqual(['margot'])
    expect(view.pins.find((p) => p.id === 'biblioteca')?.who).toEqual([])
    // Quien salio a explorar no tiene punto, pero se sabe que existe.
    expect(view.offMap).toEqual(['sebastien'])
  })

  it('la party acota a quien se pinta: no salen los nueve del pack', () => {
    const view = mapView(palacio, mundo, ['margot'])!
    expect(view.pins.flatMap((p) => p.who)).toEqual(['margot'])
    expect(view.offMap).toEqual([])
  })

  it('sin mapa no hay nada que pintar', () => {
    expect(mapView(null, mundo, ['camille'])).toBeNull()
  })
})

describe('mapEdges', () => {
  it('cada camino una vez, aunque los dos lugares se declaren mutuamente', () => {
    const view = mapView(palacio, mundo, [])!
    const edges = mapEdges(view.pins).map((e) => `${e.from.id}->${e.to.id}`)
    expect(edges).toHaveLength(2)
    expect(edges).toContain('salon-grande->comedor')
    expect(edges).toContain('salon-grande->biblioteca')
  })

  it('un camino a un lugar que no esta en este mapa no se pinta', () => {
    const view = mapView({ ...palacio, places: [{ id: 'comedor', name: 'Comedor', x: 1, y: 1, connections: ['pasillos-de-servicio'] }] }, mundo, [])!
    expect(mapEdges(view.pins)).toEqual([])
  })
})

describe('whereEveryoneIs', () => {
  it('resume en una linea donde esta la party', () => {
    const view = mapView(palacio, mundo, ['camille', 'armand', 'margot', 'sebastien'])
    const texto = whereEveryoneIs(view, (id) => id[0]!.toUpperCase() + id.slice(1))
    expect(texto).toContain('Salón grande: Camille, Armand')
    expect(texto).toContain('Comedor: Margot')
    expect(texto).toContain('De camino: Sebastien')
  })

  it('sin nadie situado lo dice, en vez de quedarse en blanco', () => {
    const view = mapView(palacio, {}, [])
    expect(whereEveryoneIs(view, (id) => id)).toBe('Nadie situado en el mapa todavía')
  })
})

describe('currentMapIndex', () => {
  const pueblo: PackMapView = { id: 'valdoria', name: 'Valdoria', image: 'maps/valdoria.webp', description: null, places: [{ id: 'posada', name: 'La posada', x: 22, y: 62, connections: ['plaza'] }, { id: 'plaza', name: 'La plaza', x: 49, y: 45, connections: ['posada'] }] }
  const mina: PackMapView = { id: 'mina', name: 'La mina', image: 'maps/mina.webp', description: null, places: [{ id: 'primer-nivel', name: 'Primer nivel', x: 45, y: 26, connections: [] }] }
  // Por orden alfabetico la mina va primero: es justo el caso que fallaba.
  const maps = [mina, pueblo]
  const en = (location: string | null): CharacterState => ({ ...mundo['camille']!, location })

  it('enseña el mapa donde esta el personaje de quien mira, no el primero de la lista', () => {
    expect(currentMapIndex(maps, { zahira: en('posada'), calder: en('primer-nivel') }, ['zahira', 'calder'], 'zahira')).toBe(1)
    expect(currentMapIndex(maps, { zahira: en('posada'), calder: en('primer-nivel') }, ['zahira', 'calder'], 'calder')).toBe(0)
  })

  it('sin personaje propio situado, el mapa con mas gente de la party', () => {
    expect(currentMapIndex(maps, { zahira: en('posada'), calder: en('plaza'), brorg: en('primer-nivel') }, ['zahira', 'calder', 'brorg'], null)).toBe(1)
  })

  it('sin nadie situado, el primero; con un solo mapa, siempre ese', () => {
    expect(currentMapIndex(maps, { zahira: en(null) }, ['zahira'], 'zahira')).toBe(0)
    expect(currentMapIndex([pueblo], undefined, [], null)).toBe(0)
  })
})
