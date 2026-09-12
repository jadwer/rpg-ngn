import { describe, expect, it } from 'vitest'
import {
  clampPitch,
  clampRate,
  DEFAULT_NARRATOR_PITCH,
  isReadingLanguage,
  isSpanish,
  matchesLanguage,
  normalizeLanguage,
  npcPitch,
  parseVoiceSettings,
  pitchFor,
  readingLanguageLabel,
  utteranceLanguage,
} from './voice.js'

describe('idioma de lectura', () => {
  it('normaliza y compara por prefijo', () => {
    expect(normalizeLanguage('es_MX')).toBe('es-mx')
    expect(matchesLanguage('es-MX', 'es')).toBe(true)
    expect(matchesLanguage('es_419', 'ES')).toBe(true)
    expect(matchesLanguage('en-US', 'es')).toBe(false)
    expect(isSpanish('ES-es')).toBe(true)
    expect(isSpanish('pt-BR')).toBe(false)
  })

  it('conoce los idiomas ofrecidos y cae al español con lo desconocido', () => {
    expect(isReadingLanguage('pt')).toBe(true)
    expect(isReadingLanguage('ru')).toBe(false)
    expect(isReadingLanguage(null)).toBe(false)
    expect(utteranceLanguage('en')).toBe('en-US')
    expect(utteranceLanguage('xx')).toBe('es-MX')
    expect(utteranceLanguage(undefined)).toBe('es-MX')
    expect(readingLanguageLabel('de')).toBe('Deutsch')
    expect(readingLanguageLabel('xx')).toBe('xx')
  })
})

describe('ajustes de voz', () => {
  it('acota velocidad y tono a pasos de 0.05', () => {
    expect(clampRate(0.2)).toBe(0.7)
    expect(clampRate(9)).toBe(1.4)
    expect(clampRate(1.03)).toBe(1.05)
    expect(clampRate(Number.NaN)).toBe(1)
    expect(clampPitch(0.5)).toBe(0.7)
    expect(clampPitch(0.86)).toBe(0.85)
  })

  it('lee lo guardado con tolerancia, incluido el idioma', () => {
    expect(parseVoiceSettings(null)).toEqual({ voiceId: null, rate: 1, narratorPitch: DEFAULT_NARRATOR_PITCH, lang: 'es' })
    expect(parseVoiceSettings({ voiceId: '  ', rate: '2', narratorPitch: 12, lang: 'ru' })).toEqual({ voiceId: null, rate: 1, narratorPitch: 1.1, lang: 'es' })
    expect(parseVoiceSettings({ voiceId: 'es-mx-x-mxa', rate: 1.2, narratorPitch: 0.8, lang: 'en' })).toEqual({ voiceId: 'es-mx-x-mxa', rate: 1.2, narratorPitch: 0.8, lang: 'en' })
  })
})

describe('tono por hablante', () => {
  const settings = { narratorPitch: 0.85 }

  it('narra grave, la party al natural y cada NPC con el suyo, estable', () => {
    expect(pitchFor({ kind: 'narration', speakerRef: null }, settings)).toBe(0.85)
    expect(pitchFor({ kind: 'system', speakerRef: null }, settings)).toBe(0.85)
    expect(pitchFor({ kind: 'dialogue', speakerRef: 'character:zahira' }, settings)).toBe(1)
    const osric = pitchFor({ kind: 'dialogue', speakerRef: 'npc:osric' }, settings)
    expect(osric).toBe(npcPitch('npc:osric'))
    expect(osric).toBeGreaterThanOrEqual(0.9)
    expect(osric).toBeLessThanOrEqual(1.12)
    expect(pitchFor({ kind: 'roll', speakerRef: 'npc:osric' }, settings)).toBe(osric)
    expect(pitchFor({ kind: 'roll', speakerRef: null }, settings)).toBe(0.85)
    expect(pitchFor(undefined, settings)).toBe(0.85)
  })

  it('distingue NPC distintos cuando el hash lo permite', () => {
    const pitches = new Set(['npc:osric', 'npc:mirla', 'npc:tabernero', 'npc:guardia', 'npc:vieja'].map(npcPitch))
    expect(pitches.size).toBeGreaterThan(1)
  })
})
