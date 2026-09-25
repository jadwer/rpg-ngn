import { describe, expect, it } from 'vitest'
import { DEFAULT_DICE_MODE, DICE_MODES, diceModeHint, diceModeLabel, diceModeOf, isDiceMode, withDiceMode } from './dice-mode.js'

describe('dice-mode', () => {
  it('sin elegir, el dado en pantalla: el numero lo pone el servidor y el jugador lo suelta', () => {
    expect(DEFAULT_DICE_MODE).toBe('dice')
    expect(diceModeOf(null)).toBe('dice')
    expect(diceModeOf({})).toBe('dice')
    expect(diceModeOf({ dice: 'lo-que-sea' })).toBe('dice')
    expect(diceModeOf({ dice: 'table' })).toBe('table')
    expect(diceModeOf({ dice: 'engine' })).toBe('engine')
    // Se ofrece primero el de por omision.
    expect(DICE_MODES[0]).toBe('dice')
    expect(DICE_MODES).toHaveLength(3)
  })

  it('reconoce los tres modos', () => {
    expect(isDiceMode('engine')).toBe(true)
    expect(isDiceMode('dice')).toBe(true)
    expect(isDiceMode('table')).toBe(true)
    expect(isDiceMode('dm')).toBe(false)
  })

  it('explica cada modo por lo que le pasa a quien juega', () => {
    expect(diceModeLabel('engine')).toBe('Los tira el servidor')
    expect(diceModeLabel('dice')).toContain('pantalla')
    expect(diceModeHint('engine')).toContain('no cuenta')
    expect(diceModeHint('dice')).toContain('te pide tirar')
    expect(diceModeHint('table')).toContain('dados de verdad')
  })

  it('guardar el modo no pisa el resto de ajustes y se guarda siempre explicito, tambien el de por defecto', () => {
    const settings = { premise: 'Llueve.', provider: { preset: 'anthropic' } }
    expect(withDiceMode(settings, 'engine')).toEqual({ ...settings, dice: 'engine' })
    expect(withDiceMode({ ...settings, dice: 'engine' }, 'table')).toEqual({ ...settings, dice: 'table' })
    // Lo que "no hace falta guardar porque es el de por defecto" es lo que se rompe cuando el defecto cambia.
    expect(withDiceMode(null, 'dice')).toEqual({ dice: 'dice' })
  })
})
