import { setLanguage } from '@rpg-ngn/i18n'
import { beforeEach, describe, expect, it } from 'vitest'
import { latestEnding, type TurnBlock } from './blocks.js'
import { endingCloseLabel, endingTitle, pacingLine, sessionLengthOf, withSessionLength } from './pacing.js'
import { blockFromApi } from './turn.js'

const resolve = () => ({ ref: 'x', name: 'x', portrait: null })

describe('reloj de la historia en los clientes', () => {
  beforeEach(() => setLanguage('es'))

  it('las mesas sin la clave juegan libre; elegir largo la guarda sin tocar lo demas', () => {
    expect(sessionLengthOf({})).toBe('libre')
    expect(sessionLengthOf({ pacing: { length: 'corta' } })).toBe('corta')
    expect(sessionLengthOf({ pacing: { length: 'eterna' } })).toBe('libre')
    expect(withSessionLength({ images: false }, 'media')).toEqual({ images: false, pacing: { length: 'media' } })
  })

  it('"Turno 5 de 8", y el ultimo se anuncia', () => {
    expect(pacingLine(null)).toBeNull()
    expect(pacingLine({ length: 'corta', turn: 5, total: 8, wrap: false })).toBe('Turno 5 de 8')
    expect(pacingLine({ length: 'corta', turn: 8, total: 8, wrap: false })).toBe('Último turno')
    expect(pacingLine({ length: 'corta', turn: 3, total: 8, wrap: true })).toBe('Último turno')
  })

  it('el titulo del fin depende de lo que termina', () => {
    expect(endingTitle({ scope: 'session', session: '002', title: null })).toBe('Fin de la sesión 2')
    expect(endingTitle({ scope: 'chapter', session: '001', title: null })).toBe('Fin del capítulo 1')
    expect(endingTitle({ scope: 'story', session: '003', title: null })).toBe('FIN')
    expect(endingTitle({ scope: 'chapter', session: '001', title: 'Capítulo 1: El drama' })).toBe('Capítulo 1: El drama')
  })

  it('logros y fin llegan de la API, y el fin solo cuenta si es lo ultimo que paso', () => {
    const milestone = blockFromApi({ id: 7, block: { type: 'milestone', title: 'Encontraron a Osric' } }, resolve)
    expect(milestone).toEqual({ kind: 'milestone', id: 'api:7', title: 'Encontraron a Osric' })
    const ending = blockFromApi({ id: 8, block: { type: 'ending', scope: 'session', session: '003', achievements: ['Encontraron a Osric'], closedBy: 'director' } }, resolve)
    expect(ending?.kind).toBe('ending')

    const blocks = [milestone, ending].filter((b): b is TurnBlock => b !== null)
    expect(latestEnding(blocks)?.id).toBe('api:8')
    expect(latestEnding([...blocks, { kind: 'narration', id: '9', text: 'Otra sesión empieza.' }])).toBeNull()
  })
})

describe('endingCloseLabel', () => {
  it('nombra el boton que abre la pantalla de fin segun lo que termino', () => {
    expect(endingCloseLabel({ scope: 'chapter', session: '002' })).toBe('Cerrar el capítulo 2')
    expect(endingCloseLabel({ scope: 'session', session: '001' })).toBe('Cerrar la sesión 1')
    expect(endingCloseLabel({ scope: 'story', session: '003' })).toBe('Ver el final')
  })
})
