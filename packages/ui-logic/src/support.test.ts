import { setLanguage } from '@rpg-ngn/i18n'
import { afterEach, describe, expect, it } from 'vitest'
import { supportAbout, supportContext, supportDate, supportStatusLabel } from './support.js'

afterEach(() => setLanguage('es'))

describe('estado de un reporte', () => {
  it('nombra cada estado en el idioma de la interfaz', () => {
    expect(supportStatusLabel('open')).toBe('Abierto')
    expect(supportStatusLabel('in_progress')).toBe('En revisión')
    expect(supportStatusLabel('waiting_user')).toBe('Esperando tu respuesta')
    expect(supportStatusLabel('resolved')).toBe('Resuelto')
    setLanguage('en')
    expect(supportStatusLabel('resolved')).toBe('Resolved')
    expect(supportStatusLabel('waiting_user')).toBe('Waiting for your reply')
  })

  it('un estado que no conoce sale tal cual', () => {
    expect(supportStatusLabel('archivado')).toBe('archivado')
  })
})

describe('contexto del reporte', () => {
  it('dice cliente, ruta, idioma y navegador', () => {
    expect(supportContext({ path: '/mesas/12', userAgent: 'Mozilla/5.0 (Linux; Android 14)' })).toEqual({ app: 'web', path: '/mesas/12', language: 'es', userAgent: 'Mozilla/5.0 (Linux; Android 14)' })
    setLanguage('en')
    expect(supportContext({ path: '/perfil' })['language']).toBe('en')
  })

  it('descarta los vacios, suma lo extra y recorta lo largo', () => {
    const context = supportContext({ path: '/perfil', userAgent: '  ', app: 'mobile', table: '7', note: '', build: null, largo: 'x'.repeat(900) })
    expect(context).toEqual({ app: 'mobile', path: '/perfil', language: 'es', table: '7', largo: 'x'.repeat(300) })
  })
})

describe('a que apunta el reporte', () => {
  it('el turno en curso si lo hay, si no la mesa', () => {
    expect(supportAbout({ tableId: 12, turnId: 340 }, true)).toEqual({ type: 'turn', id: '340' })
    expect(supportAbout({ tableId: 12, turnId: null }, true)).toEqual({ type: 'table', id: '12' })
    expect(supportAbout({ tableId: '12' }, true)).toEqual({ type: 'table', id: '12' })
  })

  it('sin mesa o sin adjuntar, nada', () => {
    expect(supportAbout(null, true)).toBeUndefined()
    expect(supportAbout({ tableId: 12, turnId: 340 }, false)).toBeUndefined()
  })
})

describe('fecha de un reporte', () => {
  it('vacia si no hay o no se entiende, y con año si hay', () => {
    expect(supportDate(null)).toBe('')
    expect(supportDate('no es fecha')).toBe('')
    expect(supportDate('2026-09-30T17:05:00Z')).toContain('2026')
  })
})
