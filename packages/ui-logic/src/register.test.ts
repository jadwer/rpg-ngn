import { describe, expect, it } from 'vitest'
import { registerBlocker, registerBlockerText } from './register.js'

const ok = { name: 'David', email: 'd@x.com', password: 'secreto123', confirmation: 'secreto123', adult: true }

describe('registerBlocker', () => {
  it('dice lo primero que falta, en el orden del formulario', () => {
    expect(registerBlocker({ ...ok, name: '  ' })).toBe('name')
    expect(registerBlocker({ ...ok, email: '' })).toBe('email')
    expect(registerBlocker({ ...ok, password: '', confirmation: '' })).toBe('password')
    expect(registerBlocker({ ...ok, password: 'corta', confirmation: 'corta' })).toBe('tooShort')
    expect(registerBlocker({ ...ok, confirmation: '' })).toBe('confirmation')
    expect(registerBlocker({ ...ok, confirmation: 'secreto124' })).toBe('mismatch')
    expect(registerBlocker({ ...ok, adult: false })).toBe('adult')
    expect(registerBlocker(ok)).toBeNull()
  })

  it('cada motivo tiene su texto', () => {
    for (const b of ['name', 'email', 'password', 'tooShort', 'confirmation', 'mismatch', 'adult'] as const) {
      const text = registerBlockerText(b)
      expect(text).not.toContain('auth.blocker')
      expect(text.length).toBeGreaterThan(5)
    }
  })
})
