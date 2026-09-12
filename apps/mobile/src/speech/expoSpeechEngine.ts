import { pitchFor, utteranceLanguage, VOICE_SAMPLE, type SpeechEngine, type VoiceSettings } from '@rpg-ngn/ui-logic'
import * as Speech from 'expo-speech'
import { Platform } from 'react-native'
import { voicesFor, type VoiceInfo } from './voices'

/**
 * SpeechEngine sobre expo-speech (docs/09, "Narracion por voz"). Es un
 * envoltorio del TTS del sistema: gratis, sin clave, y con las tres
 * limitaciones que la cola por bloques absorbe. Los ajustes (voz, velocidad,
 * tono del narrador, idioma) se leen en cada `speak`, asi el selector aplica
 * al bloque siguiente sin recrear la cola; el tono de cada bloque lo decide
 * `pitchFor` de ui-logic con el hablante del item. pause/resume solo se
 * exponen fuera de Android; en Android el controlador de ui-logic salta al
 * bloque siguiente al reanudar.
 */

export interface ExpoSpeechOptions {
  settings: () => VoiceSettings
  onError?: ((message: string) => void) | undefined
}

export function createExpoSpeechEngine(options: ExpoSpeechOptions): SpeechEngine {
  const engine: SpeechEngine = {
    speak(text, onDone, item) {
      const settings = options.settings()
      Speech.speak(text, {
        language: utteranceLanguage(settings.lang),
        ...(settings.voiceId ? { voice: settings.voiceId } : {}),
        rate: settings.rate,
        pitch: pitchFor(item, settings),
        onDone,
        onError: (error) => options.onError?.(error.message || 'el motor de voz falló'),
      })
    },
    stop() {
      void Speech.stop()
    },
  }
  if (Platform.OS !== 'android') {
    engine.pause = () => {
      void Speech.pause()
    }
    engine.resume = () => {
      void Speech.resume()
    }
  }
  return engine
}

/**
 * Voces del idioma de lectura instaladas en el telefono. Null si el sistema
 * no contesto (sin motor de TTS, web sin voces cargadas): no se sabe.
 */
export async function listVoices(lang: string): Promise<VoiceInfo[] | null> {
  try {
    const voices = await Speech.getAvailableVoicesAsync()
    if (voices.length === 0) return null
    return voicesFor(voices, lang)
  } catch {
    return null
  }
}

/** Una frase corta con la voz y el tono del narrador, para elegir de oido. */
export function previewVoice(voice: VoiceInfo | null, settings: VoiceSettings): void {
  void Speech.stop()
  Speech.speak(VOICE_SAMPLE, {
    language: voice?.language ?? utteranceLanguage(settings.lang),
    ...(voice ? { voice: voice.id } : {}),
    rate: settings.rate,
    pitch: settings.narratorPitch,
  })
}
