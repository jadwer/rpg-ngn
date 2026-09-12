import { describe, expect, it, vi } from 'vitest'
import { createWebSpeechEngine, pickVoice, voicesFor } from './webSpeech'

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

describe('tono por hablante en Web Speech', () => {
  /** Un `speechSynthesis` de mentira que guarda las locuciones y las termina al instante. */
  function fakeSynth() {
    const spoken: Array<{ text: string; pitch: number; rate: number; lang: string }> = []
    class Utterance {
      text: string
      pitch = 1
      rate = 1
      lang = ''
      voice: unknown = null
      onend: (() => void) | null = null
      onerror: ((e: { error: string }) => void) | null = null
      constructor(text: string) {
        this.text = text
      }
    }
    const synth = {
      cancel: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      getVoices: () => [],
      speak: (u: Utterance) => {
        spoken.push({ text: u.text, pitch: u.pitch, rate: u.rate, lang: u.lang })
        u.onend?.()
      },
    }
    vi.stubGlobal('window', { speechSynthesis: synth, SpeechSynthesisUtterance: Utterance, setTimeout: (fn: () => void) => fn(), clearTimeout: () => undefined })
    vi.stubGlobal('SpeechSynthesisUtterance', Utterance)
    return spoken
  }

  it('narra grave, la party al natural y los NPC con su tono, a la velocidad elegida', () => {
    const spoken = fakeSynth()
    try {
      const engine = createWebSpeechEngine({ settings: () => ({ voiceUri: null, rate: 1.2, narratorPitch: 0.85, lang: 'es-MX' }) })
      const done = vi.fn()
      engine.speak('Llueve sobre Valdoria.', done, { blockId: 'a', text: 'Llueve sobre Valdoria.', kind: 'narration', speakerRef: null })
      engine.speak('Zahira: Sigo.', done, { blockId: 'b', text: 'Zahira: Sigo.', kind: 'dialogue', speakerRef: 'character:zahira' })
      engine.speak('Osric: Vete.', done, { blockId: 'c', text: 'Osric: Vete.', kind: 'dialogue', speakerRef: 'npc:osric' })
      expect(spoken.map((s) => s.pitch)).toEqual([0.85, 1, expect.any(Number)])
      expect(spoken[2]!.pitch).not.toBe(1)
      expect(spoken.every((s) => s.rate === 1.2 && s.lang === 'es-MX')).toBe(true)
      expect(done).toHaveBeenCalledTimes(3)
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
