import type { TtsItem } from '@rpg-ngn/ui-logic'

/**
 * Decisiones puras de la voz (docs/09, "Narracion por voz"), sin expo-speech
 * para probarlas con vitest: que voces del sistema sirven, cual se elige,
 * como se etiquetan y que tono lleva cada bloque. El sistema no dice si una
 * voz es masculina o femenina, asi que se elige de oido; lo que si sabemos
 * es idioma y calidad.
 */

export interface VoiceInfo {
  /** Identificador que `expo-speech` acepta en `voice`. */
  id: string
  name: string
  /** `es-MX`, `es-ES`, `es_419`... */
  language: string
  /** true si el sistema la marca como mejorada (mas natural, suele pesar mas). */
  enhanced: boolean
}

export interface VoiceSettings {
  /** Voz elegida; null deja al sistema con su voz por defecto para `es-MX`. */
  voiceId: string | null
  /** Velocidad de lectura; 1 es la normal. */
  rate: number
  /** Tono del narrador; por debajo de 1 suena mas grave. */
  narratorPitch: number
}

export const DEFAULT_LANGUAGE = 'es-MX'
export const RATE_MIN = 0.7
export const RATE_MAX = 1.4
export const RATE_STEP = 0.05
export const PITCH_MIN = 0.7
export const PITCH_MAX = 1.1
export const PITCH_STEP = 0.05
export const DEFAULT_NARRATOR_PITCH = 0.85

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = { voiceId: null, rate: 1, narratorPitch: DEFAULT_NARRATOR_PITCH }

function normalizeLanguage(language: string): string {
  return language.toLowerCase().replace('_', '-')
}

export function isSpanish(language: string): boolean {
  return normalizeLanguage(language).startsWith('es')
}

/**
 * Voces en español, con las mejoradas primero y despues por idioma y nombre.
 * Android y iOS repiten identificadores raras veces; se dejan pasar porque el
 * id es lo que `speak` necesita.
 */
export function spanishVoices(all: ReadonlyArray<{ identifier: string; name: string; language: string; quality?: string | undefined }>): VoiceInfo[] {
  return all
    .filter((v) => isSpanish(v.language))
    .map((v) => ({ id: v.identifier, name: v.name, language: normalizeLanguage(v.language), enhanced: (v.quality ?? '').toLowerCase() === 'enhanced' }))
    .sort((a, b) => Number(b.enhanced) - Number(a.enhanced) || a.language.localeCompare(b.language) || a.name.localeCompare(b.name))
}

/** La guardada si sigue instalada; si no, null (el sistema elige la suya para es-MX). */
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
export function parseVoiceSettings(raw: { voiceId?: unknown; rate?: unknown; narratorPitch?: unknown } | null | undefined): VoiceSettings {
  const voiceId = typeof raw?.voiceId === 'string' && raw.voiceId.trim() ? raw.voiceId : null
  const rate = typeof raw?.rate === 'number' ? clampRate(raw.rate) : DEFAULT_VOICE_SETTINGS.rate
  const narratorPitch = typeof raw?.narratorPitch === 'number' ? clampPitch(raw.narratorPitch) : DEFAULT_VOICE_SETTINGS.narratorPitch
  return { voiceId, rate, narratorPitch }
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
