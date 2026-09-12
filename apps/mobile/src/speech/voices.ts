import { matchesLanguage, normalizeLanguage } from '@rpg-ngn/ui-logic'

/**
 * Lo que la app sabe de las voces del telefono, sin expo-speech para
 * probarlo con vitest: cuales sirven para el idioma de lectura, cual se
 * elige y como se etiquetan. Los ajustes acotados y el tono por hablante
 * viven en `@rpg-ngn/ui-logic` (los comparte con la web). El sistema no
 * dice si una voz es masculina o femenina, asi que se elige de oido; lo
 * que si sabemos es idioma y calidad.
 */

export interface VoiceInfo {
  /** Identificador que `expo-speech` acepta en `voice`. */
  id: string
  name: string
  /** `es-mx`, `es-es`, `en-us`... ya normalizado. */
  language: string
  /** true si el sistema la marca como mejorada (mas natural, suele pesar mas). */
  enhanced: boolean
}

/**
 * Voces del idioma de lectura (`es`, `en`...), con las mejoradas primero y
 * despues por idioma y nombre. Android y iOS repiten identificadores raras
 * veces; se dejan pasar porque el id es lo que `speak` necesita.
 */
export function voicesFor(all: ReadonlyArray<{ identifier: string; name: string; language: string; quality?: string | undefined }>, lang = 'es'): VoiceInfo[] {
  return all
    .filter((v) => matchesLanguage(v.language, lang))
    .map((v) => ({ id: v.identifier, name: v.name, language: normalizeLanguage(v.language), enhanced: (v.quality ?? '').toLowerCase() === 'enhanced' }))
    .sort((a, b) => Number(b.enhanced) - Number(a.enhanced) || a.language.localeCompare(b.language) || a.name.localeCompare(b.name))
}

/** La guardada si sigue instalada; si no, null (el sistema elige la suya para el idioma). */
export function pickVoice(voices: readonly VoiceInfo[], savedId: string | null): VoiceInfo | null {
  if (!savedId) return null
  return voices.find((v) => v.id === savedId) ?? null
}

/**
 * Nombre corto para la lista. Android nombra las voces como `es-mx-x-mxa-local`
 * y iOS como `Paulina` o `Juan (mejorada)`; se muestra el nombre tal cual con
 * el idioma y la calidad al lado, que es lo unico que el sistema sabe.
 */
export function voiceLabel(voice: VoiceInfo): string {
  const name = voice.name.trim() || voice.id
  return `${name} · ${voice.language}${voice.enhanced ? ' · mejorada' : ''}`
}
