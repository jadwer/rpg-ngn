import { describe, expect, it } from 'vitest'
import { diceModeHint, diceModeLabel, diceModeOf, isDiceMode, withDiceMode } from './dice-mode.js'

describe('dice-mode', () => {
  it('sin elegir, la mesa tira sus dados, que es como se jugaba antes', () => {
    expect(diceModeOf(null)).toBe('table')
    expect(diceModeOf({})).toBe('table')
    expect(diceModeOf({ dice: 'lo-que-sea' })).toBe('table')
    expect(diceModeOf({ dice: 'engine' })).toBe('engine')
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

  it('guardar el modo no pisa el resto de ajustes, y `table` no se guarda por ser el de por defecto', () => {
    const settings = { premise: 'Llueve.', provider: { preset: 'anthropic' } }
    expect(withDiceMode(settings, 'engine')).toEqual({ ...settings, dice: 'engine' })
    expect(withDiceMode({ ...settings, dice: 'engine' }, 'table')).toEqual(settings)
  })
})
