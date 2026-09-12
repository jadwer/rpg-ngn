import { splitNarration, type SpeechEngine } from '@rpg-ngn/ui-logic'

/**
 * SpeechEngine de ui-logic sobre la Web Speech API (docs/09, "Narracion por
 * voz"). Cada bloque se parte en trozos de pocas oraciones porque Chrome
 * corta las locuciones largas (unos 15 s) y Safari en iOS se queda mudo con
 * textos muy grandes; el bloque termina cuando termina su ultimo trozo. La
 * voz y la velocidad se leen en cada `speak`, asi el selector aplica al
 * bloque siguiente sin recrear la cola.
 */

export interface VoiceChoice {
  uri: string
  name: string
  lang: string
  local: boolean
}

export interface SpeechSettings {
  voiceUri: string | null
  rate: number
  /** Idioma de la locucion si la voz elegida no existe (`es-MX`, `en-US`...). */
  lang?: string
}

const CHUNK_CHARS = 220

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function'
}

/** Voces del navegador en un idioma (prefijo `es`, `en`...), con las locales primero. Puede venir vacia hasta `voiceschanged`. */
export function voicesFor(all: ReadonlyArray<Pick<SpeechSynthesisVoice, 'voiceURI' | 'name' | 'lang' | 'localService'>>, lang = 'es'): VoiceChoice[] {
  const prefix = lang.toLowerCase()
  return all
    .filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith(prefix))
    .map((v) => ({ uri: v.voiceURI, name: v.name, lang: v.lang, local: v.localService }))
    .sort((a, b) => Number(b.local) - Number(a.local) || a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name))
}

/** La voz guardada si sigue existiendo; si no, la primera en español; si no hay, null (el navegador elige). */
export function pickVoice(voices: readonly VoiceChoice[], savedUri: string | null): VoiceChoice | null {
  if (voices.length === 0) return null
  return voices.find((v) => v.uri === savedUri) ?? voices[0] ?? null
}

export function listVoices(lang = 'es'): VoiceChoice[] {
  if (!speechSupported()) return []
  return voicesFor(window.speechSynthesis.getVoices(), lang)
}

/** Llama a `listener` con las voces del idioma ahora y cada vez que el navegador las cargue. */
export function watchVoices(listener: (voices: VoiceChoice[]) => void, lang = 'es'): () => void {
  if (!speechSupported()) {
    listener([])
    return () => undefined
  }
  const synth = window.speechSynthesis
  const notify = () => listener(voicesFor(synth.getVoices(), lang))
  notify()
  synth.addEventListener('voiceschanged', notify)
  // Safari no dispara voiceschanged de forma fiable: reintento corto.
  const timer = window.setTimeout(notify, 800)
  return () => {
    synth.removeEventListener('voiceschanged', notify)
    window.clearTimeout(timer)
  }
}

export interface WebSpeechOptions {
  settings: () => SpeechSettings
  onError?: ((message: string) => void) | undefined
}

export function createWebSpeechEngine(options: WebSpeechOptions): SpeechEngine {
  let token = 0

  const stop = () => {
    token += 1
    if (speechSupported()) window.speechSynthesis.cancel()
  }

  const engine: SpeechEngine = {
    speak(text, onDone) {
      if (!speechSupported()) {
        options.onError?.('este navegador no tiene síntesis de voz')
        onDone()
        return
      }
      const synth = window.speechSynthesis
      const mine = ++token
      const chunks = splitNarration(text, { maxChars: CHUNK_CHARS })
      if (chunks.length === 0) {
        onDone()
        return
      }
      const { voiceUri, rate, lang } = options.settings()
      const voice = voiceUri ? (synth.getVoices().find((v) => v.voiceURI === voiceUri) ?? null) : null

      const speakChunk = (index: number) => {
        if (mine !== token) return
        const chunk = chunks[index]
        if (chunk === undefined) {
          onDone()
          return
        }
        const utterance = new SpeechSynthesisUtterance(chunk)
        utterance.lang = voice?.lang ?? lang ?? 'es-MX'
        if (voice) utterance.voice = voice
        utterance.rate = rate
        utterance.onend = () => speakChunk(index + 1)
        utterance.onerror = (event) => {
          if (mine !== token) return
          if (event.error === 'canceled' || event.error === 'interrupted') return
          options.onError?.(describeSpeechError(event.error))
          token += 1
        }
        synth.speak(utterance)
      }

      // Chrome ignora un speak() inmediato tras cancel(); un respiro lo evita.
      synth.cancel()
      window.setTimeout(() => speakChunk(0), 60)
    },
    stop,
    pause() {
      if (speechSupported()) window.speechSynthesis.pause()
    },
    resume() {
      if (speechSupported()) window.speechSynthesis.resume()
    },
  }
  return engine
}

function describeSpeechError(code: string): string {
  switch (code) {
    case 'not-allowed':
      return 'el navegador pide un toque tuyo antes de hablar; pulsa Leer'
    case 'synthesis-unavailable':
    case 'synthesis-failed':
      return 'la voz del sistema falló; prueba otra voz'
    case 'language-unavailable':
    case 'voice-unavailable':
      return 'esa voz no está disponible; elige otra'
    case 'audio-busy':
      return 'el audio está ocupado; vuelve a intentar'
    default:
      return `el motor de voz falló (${code})`
  }
}
