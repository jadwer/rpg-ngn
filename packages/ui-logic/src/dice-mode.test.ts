import { describe, expect, it } from 'vitest'
import { DEFAULT_DICE_MODE, DICE_MODES, diceModeHint, diceModeLabel, diceModeOf, isDiceMode, withDiceMode } from './dice-mode.js'

describe('dice-mode', () => {
  it('sin elegir, tira el servidor: aceptar numeros escritos es una eleccion, no lo que pasa por omision', () => {
    expect(DEFAULT_DICE_MODE).toBe('engine')
    expect(diceModeOf(null)).toBe('engine')
    expect(diceModeOf({})).toBe('engine')
    expect(diceModeOf({ dice: 'lo-que-sea' })).toBe('engine')
    expect(diceModeOf({ dice: 'table' })).toBe('table')
    // Se ofrece primero el seguro.
    expect(DICE_MODES[0]).toBe('engine')
  })

  it('reconoce los modos validos', () => {
    expect(isDiceMode('engine')).toBe(true)
    expect(isDiceMode('table')).toBe(true)
    expect(isDiceMode('dm')).toBe(false)
  })

  it('explica cada modo por lo que le pasa a quien juega', () => {
    expect(diceModeLabel('engine')).toBe('Los tira el servidor')
    expect(diceModeHint('engine')).toContain('no cuenta')
    expect(diceModeHint('table')).toContain('dados de verdad')
  })

  it('guardar el modo no pisa el resto de ajustes y se guarda siempre explicito, tambien el de por defecto', () => {
    const settings = { premise: 'Llueve.', provider: { preset: 'anthropic' } }
    expect(withDiceMode(settings, 'engine')).toEqual({ ...settings, dice: 'engine' })
    expect(withDiceMode({ ...settings, dice: 'engine' }, 'table')).toEqual({ ...settings, dice: 'table' })
    // Lo que "no hace falta guardar porque es el de por defecto" es lo que se rompe cuando el defecto cambia.
    expect(withDiceMode(null, 'engine')).toEqual({ dice: 'engine' })
  })
})
