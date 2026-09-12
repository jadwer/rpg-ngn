import { describe, expect, it } from 'vitest'
import { pickVoice, voicesFor } from './webSpeech'

const voices = [
  { voiceURI: 'en-1', name: 'Samantha', lang: 'en-US', localService: true },
  { voiceURI: 'es-net', name: 'Google español', lang: 'es-ES', localService: false },
  { voiceURI: 'es-mx', name: 'Paulina', lang: 'es-MX', localService: true },
  { voiceURI: 'es-es', name: 'Mónica', lang: 'es-ES', localService: true },
]

describe('voces en español', () => {
  it('filtra por idioma y pone las locales primero', () => {
    expect(voicesFor(voices).map((v) => v.uri)).toEqual(['es-es', 'es-mx', 'es-net'])
    expect(voicesFor(voices, 'en').map((v) => v.uri)).toEqual(['en-1'])
    expect(voicesFor(voices, 'pt')).toEqual([])
  })

  it('respeta la voz guardada si existe y cae a la primera si no', () => {
    const list = voicesFor(voices)
    expect(pickVoice(list, 'es-mx')?.name).toBe('Paulina')
    expect(pickVoice(list, 'ya-no-existe')?.name).toBe('Mónica')
    expect(pickVoice([], 'es-mx')).toBeNull()
  })
})
