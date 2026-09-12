import { describe, expect, it } from 'vitest'
import { pickVoice, voiceLabel, voicesFor } from './voices'

const system = [
  { identifier: 'en-us-x-sfg', name: 'en-us-x-sfg-local', language: 'en-US', quality: 'Default' },
  { identifier: 'es-mx-x-mxa', name: 'es-mx-x-mxa-local', language: 'es_MX', quality: 'Default' },
  { identifier: 'com.apple.voice.enhanced.es-MX.Paulina', name: 'Paulina', language: 'es-MX', quality: 'Enhanced' },
  { identifier: 'es-es-x-eea', name: 'es-es-x-eea-local', language: 'es-ES', quality: 'Default' },
  { identifier: 'es-419', name: 'Latina', language: 'es-419' },
]

describe('voces del telefono', () => {
  it('filtra por idioma de lectura, normaliza el idioma y pone las mejoradas primero', () => {
    const voices = voicesFor(system)
    expect(voices.map((v) => v.id)).toEqual(['com.apple.voice.enhanced.es-MX.Paulina', 'es-419', 'es-es-x-eea', 'es-mx-x-mxa'])
    expect(voices[0]).toEqual({ id: 'com.apple.voice.enhanced.es-MX.Paulina', name: 'Paulina', language: 'es-mx', enhanced: true })
    expect(voices.find((v) => v.id === 'es-mx-x-mxa')?.language).toBe('es-mx')
    expect(voicesFor(system, 'en').map((v) => v.id)).toEqual(['en-us-x-sfg'])
    expect(voicesFor(system, 'pt')).toEqual([])
  })

  it('recuerda la voz guardada solo si sigue instalada', () => {
    const voices = voicesFor(system)
    expect(pickVoice(voices, 'es-es-x-eea')?.name).toBe('es-es-x-eea-local')
    expect(pickVoice(voices, 'desinstalada')).toBeNull()
    expect(pickVoice(voices, null)).toBeNull()
  })

  it('etiqueta con nombre, idioma y calidad, sin inventar el sexo', () => {
    const voices = voicesFor(system)
    expect(voiceLabel(voices[0]!)).toBe('Paulina · es-mx · mejorada')
    expect(voiceLabel(voices[3]!)).toBe('es-mx-x-mxa-local · es-mx')
  })
})
