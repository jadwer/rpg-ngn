import { afterEach, describe, expect, it } from 'vitest'
import { language, onLanguageChange, pickLanguage, setLanguage, t } from './index.js'

afterEach(() => setLanguage('es'))

describe('i18n', () => {
  it('habla español por omision y cambia a ingles', () => {
    expect(t('common.loading')).toBe('Cargando…')
    setLanguage('en')
    expect(language()).toBe('en')
    expect(t('common.loading')).toBe('Loading…')
  })

  it('elige el primer idioma que la interfaz habla', () => {
    expect(pickLanguage([null, 'fr-FR', 'en-US', 'es'])).toBe('en')
    expect(pickLanguage(['de'])).toBe('es')
  })

  it('avisa del cambio de idioma', () => {
    const seen: string[] = []
    const off = onLanguageChange((l) => seen.push(l))
    setLanguage('en')
    off()
    setLanguage('es')
    expect(seen).toEqual(['en'])
  })
})
