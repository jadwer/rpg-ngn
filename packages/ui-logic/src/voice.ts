import type { TtsItem } from './tts.js'

/**
 * Decisiones puras de la voz (docs/09, "Narracion por voz"), las mismas en
 * la app y en la web: idiomas de lectura, ajustes acotados, lectura tolerante
 * de lo guardado y el tono de cada bloque segun quien habla. Que voces tiene
 * el dispositivo y como se llaman lo sabe cada plataforma; aqui solo se
 * decide si una voz sirve para el idioma elegido.
 */

/** Idiomas de lectura que se ofrecen; el codigo filtra las voces por prefijo y `utterance` es el que se pide al motor. */
export const READING_LANGUAGES = [
  { code: 'es', label: 'Español', utterance: 'es-MX' },
  { code: 'en', label: 'English', utterance: 'en-US' },
  { code: 'pt', label: 'Português', utterance: 'pt-BR' },
  { code: 'fr', label: 'Français', utterance: 'fr-FR' },
  { code: 'it', label: 'Italiano', utterance: 'it-IT' },
  { code: 'de', label: 'Deutsch', utterance: 'de-DE' },
] as const

export type ReadingLanguage = (typeof READING_LANGUAGES)[number]['code']

export const DEFAULT_READING_LANGUAGE: ReadingLanguage = 'es'

export function isReadingLanguage(value: unknown): value is ReadingLanguage {
  return typeof value === 'string' && READING_LANGUAGES.some((l) => l.code === value)
}

/** `es` se lee como `es-MX`; un codigo desconocido cae al español. */
export function utteranceLanguage(code: string | null | undefined): string {
  return READING_LANGUAGES.find((l) => l.code === code)?.utterance ?? 'es-MX'
}

export function readingLanguageLabel(code: string): string {
  return READING_LANGUAGES.find((l) => l.code === code)?.label ?? code
}

/** `es_MX` y `ES-mx` se comparan como `es-mx`. */
export function normalizeLanguage(language: string): string {
  return language.toLowerCase().replace('_', '-')
}

/** true si la voz habla el idioma de lectura (`es-MX` sirve para `es`). */
export function matchesLanguage(voiceLanguage: string, code: string): boolean {
  return normalizeLanguage(voiceLanguage).startsWith(code.toLowerCase())
}

export function isSpanish(language: string): boolean {
  return matchesLanguage(language, 'es')
}

export interface VoiceSettings {
  /** Voz elegida (identificador que entiende el motor de la plataforma); null deja al sistema con la suya. */
  voiceId: string | null
  /** Velocidad de lectura; 1 es la normal. */
  rate: number
  /** Tono del narrador; por debajo de 1 suena mas grave. */
  narratorPitch: number
  /** Idioma de lectura: filtra las voces y fija el de la locucion. */
  lang: ReadingLanguage
}

export const RATE_MIN = 0.7
export const RATE_MAX = 1.4
export const RATE_STEP = 0.05
export const PITCH_MIN = 0.7
export const PITCH_MAX = 1.1
export const PITCH_STEP = 0.05
export const DEFAULT_NARRATOR_PITCH = 0.85

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = { voiceId: null, rate: 1, narratorPitch: DEFAULT_NARRATOR_PITCH, lang: DEFAULT_READING_LANGUAGE }

export function clampRate(value: number): number {
  return snap(value, RATE_MIN, RATE_MAX, RATE_STEP)
}

export function clampPitch(value: number): number {
  return snap(value, PITCH_MIN, PITCH_MAX, PITCH_STEP)
}

function snap(value: number, min: number, max: number, step: number): number {
  if (!Number.isFinite(value)) return 1
  const bounded = Math.min(max, Math.max(min, value))
  return Math.round(Math.round(bounded / step) * step * 100) / 100
}

/** Lee los ajustes guardados con tolerancia: cualquier cosa rara vuelve al valor por defecto. */
export function parseVoiceSettings(raw: { voiceId?: unknown; rate?: unknown; narratorPitch?: unknown; lang?: unknown } | null | undefined): VoiceSettings {
  const voiceId = typeof raw?.voiceId === 'string' && raw.voiceId.trim() ? raw.voiceId : null
  const rate = typeof raw?.rate === 'number' ? clampRate(raw.rate) : DEFAULT_VOICE_SETTINGS.rate
  const narratorPitch = typeof raw?.narratorPitch === 'number' ? clampPitch(raw.narratorPitch) : DEFAULT_VOICE_SETTINGS.narratorPitch
  const lang = isReadingLanguage(raw?.lang) ? raw.lang : DEFAULT_READING_LANGUAGE
  return { voiceId, rate, narratorPitch, lang }
}

/**
 * Tonos para los NPC, alrededor del normal y sin exagerar: cada NPC cae
 * siempre en el mismo por el hash de su `speakerRef`, asi la mesa reconoce
 * al posadero de un turno a otro. La party habla con el tono normal.
 */
const NPC_PITCHES = [1.06, 0.94, 1.12, 0.9, 1.0] as const

export function hashRef(ref: string): number {
  let hash = 0
  for (let i = 0; i < ref.length; i++) hash = (hash * 31 + ref.charCodeAt(i)) >>> 0
  return hash
}

export function npcPitch(speakerRef: string): number {
  return NPC_PITCHES[hashRef(speakerRef) % NPC_PITCHES.length] ?? 1
}

export function isPartyRef(speakerRef: string | null): boolean {
  return !!speakerRef && speakerRef.startsWith('character:')
}

/**
 * Tono de un item de la cola: el narrador (narracion y sistema) mas grave,
 * la party al natural, cada NPC con el suyo. Las tiradas van con el tono de
 * quien tira, o el del narrador si no hay actor.
 */
export function pitchFor(item: Pick<TtsItem, 'kind' | 'speakerRef'> | undefined, settings: Pick<VoiceSettings, 'narratorPitch'>): number {
  if (!item) return settings.narratorPitch
  switch (item.kind) {
    case 'narration':
    case 'system':
      return settings.narratorPitch
    case 'dialogue':
    case 'roll':
      if (!item.speakerRef) return settings.narratorPitch
      return isPartyRef(item.speakerRef) ? 1 : npcPitch(item.speakerRef)
  }
}

/** Frase corta con la que se prueba una voz. */
export const VOICE_SAMPLE = 'La posada huele a pan y a lluvia. Alguien os mira desde la sombra.'
