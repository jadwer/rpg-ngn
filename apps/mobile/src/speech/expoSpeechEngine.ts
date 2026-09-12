import type { SpeechEngine } from '@rpg-ngn/ui-logic'
import * as Speech from 'expo-speech'
import { Platform } from 'react-native'
import { DEFAULT_LANGUAGE, pitchFor, spanishVoices, type VoiceInfo, type VoiceSettings } from './voices'

/**
 * SpeechEngine sobre expo-speech (docs/09, "Narracion por voz"). Es un
 * envoltorio del TTS del sistema: gratis, sin clave, y con las tres
 * limitaciones que la cola por bloques absorbe. Los ajustes (voz, velocidad,
 * tono del narrador) se leen en cada `speak`, asi el selector aplica al
 * bloque siguiente sin recrear la cola; el tono de cada bloque lo decide
 * `pitchFor` con el hablante del item. pause/resume solo se exponen fuera
 * de Android; en Android el controlador de ui-logic salta al bloque
 * siguiente al reanudar.
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
        language: DEFAULT_LANGUAGE,
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
 * Voces en español instaladas en el telefono. Null si el sistema no
 * contesto (sin motor de TTS, web sin voces cargadas): no se sabe.
 */
export async function listSpanishVoices(): Promise<VoiceInfo[] | null> {
  try {
    const voices = await Speech.getAvailableVoicesAsync()
    if (voices.length === 0) return null
    return spanishVoices(voices)
  } catch {
    return null
  }
}

/** Una frase corta con la voz y el tono del narrador, para elegir de oido. */
export function previewVoice(voice: VoiceInfo | null, settings: VoiceSettings): void {
  void Speech.stop()
  Speech.speak('La posada huele a pan y a lluvia. Alguien os mira desde la sombra.', {
    language: voice?.language ?? DEFAULT_LANGUAGE,
    ...(voice ? { voice: voice.id } : {}),
    rate: settings.rate,
    pitch: settings.narratorPitch,
  })
}
