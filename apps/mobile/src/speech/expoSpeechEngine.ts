import type { SpeechEngine } from '@rpg-ngn/ui-logic'
import * as Speech from 'expo-speech'
import { Platform } from 'react-native'

/**
 * SpeechEngine sobre expo-speech (docs/09, "Narracion por voz"). Es un
 * envoltorio del TTS del sistema: gratis, sin clave, y con las tres
 * limitaciones que la cola por bloques absorbe. pause/resume solo se
 * exponen fuera de Android; en Android el controlador de ui-logic salta al
 * bloque siguiente al reanudar.
 */

export interface ExpoSpeechOptions {
  language?: string
  rate?: number
  pitch?: number
  onError?: (message: string) => void
}

export const DEFAULT_LANGUAGE = 'es-MX'

export function createExpoSpeechEngine(options: ExpoSpeechOptions = {}): SpeechEngine {
  const engine: SpeechEngine = {
    speak(text, onDone) {
      Speech.speak(text, {
        language: options.language ?? DEFAULT_LANGUAGE,
        rate: options.rate ?? 1,
        pitch: options.pitch ?? 1,
        onDone,
        onError: (error) => options.onError?.(error.message || 'el motor de voz fallo'),
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
 * Si el dispositivo tiene alguna voz en español. En Android, sin la voz
 * descargada y sin datos no suena; se avisa una vez (docs/09).
 */
export async function hasSpanishVoice(): Promise<boolean | null> {
  try {
    const voices = await Speech.getAvailableVoicesAsync()
    if (voices.length === 0) return null
    return voices.some((v) => v.language.toLowerCase().startsWith('es'))
  } catch {
    return null
  }
}
