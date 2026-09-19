import type { OwnKey } from '@rpg-ngn/api-client'
import { describe, expect, it } from 'vitest'
import { hasOwnKey, keyConsole, ownKeyLabel, ownKeyProblem, ownKeyStatus, removeOwnKeyWarning } from './own-key.js'

const sin: OwnKey = { preset: 'anthropic', configured: false, hint: null, model: null, verifiedAt: null }
const con: OwnKey = { preset: 'anthropic', configured: true, hint: '9999', model: null, verifiedAt: '2026-09-19T03:00:00Z' }

describe('own-key', () => {
  it('nombra el proveedor y dice donde se saca la clave', () => {
    expect(ownKeyLabel(con)).toBe('Anthropic (Claude)')
    expect(keyConsole('anthropic')).toBe('console.anthropic.com')
    expect(keyConsole('ollama')).toBeNull()
  })

  it('explica el estado en terminos de lo que le pasa a sus mesas', () => {
    expect(ownKeyStatus(sin)).toContain('DM del servidor')
    expect(ownKeyStatus(con)).toContain('terminada en 9999')
    expect(ownKeyStatus(con)).toContain('no gastan cupo')
    expect(ownKeyStatus({ ...con, model: 'claude-haiku-4-5' })).toContain('modelo claude-haiku-4-5')
  })

  it('sabe si el usuario ya trajo alguna clave', () => {
    expect(hasOwnKey([sin, { ...sin, preset: 'openai' }])).toBe(false)
    expect(hasOwnKey([sin, con])).toBe(true)
  })

  it('rechaza lo que obviamente no es una clave, sin adivinar el formato de cada proveedor', () => {
    expect(ownKeyProblem('')).toBe('Escribe tu clave.')
    expect(ownKeyProblem('  ')).toBe('Escribe tu clave.')
    expect(ownKeyProblem('corta')).toContain('demasiado corta')
    expect(ownKeyProblem('sk-ant con espacio')).toContain('espacios')
    // Un prefijo desconocido pasa: lo comprueba el servidor contra el proveedor.
    expect(ownKeyProblem('lo-que-sea-pero-larga')).toBeNull()
  })

  it('avisa de la consecuencia antes de borrar', () => {
    expect(removeOwnKeyWarning(con)).toContain('gastarán cupo')
  })
})
