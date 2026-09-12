import { describe, expect, it } from 'vitest'
import { clampPitch, clampRate, DEFAULT_NARRATOR_PITCH, npcPitch, parseVoiceSettings, pickVoice, pitchFor, spanishVoices, voiceLabel } from './voices'

const system = [
  { identifier: 'en-us-x-sfg', name: 'en-us-x-sfg-local', language: 'en-US', quality: 'Default' },
  { identifier: 'es-mx-x-mxa', name: 'es-mx-x-mxa-local', language: 'es_MX', quality: 'Default' },
  { identifier: 'com.apple.voice.enhanced.es-MX.Paulina', name: 'Paulina', language: 'es-MX', quality: 'Enhanced' },
  { identifier: 'es-es-x-eea', name: 'es-es-x-eea-local', language: 'es-ES', quality: 'Default' },
  { identifier: 'es-419', name: 'Latina', language: 'es-419' },
]

describe('voces en español', () => {
  it('filtra a es*, normaliza el idioma y pone las mejoradas primero', () => {
    const voices = spanishVoices(system)
    expect(voices.map((v) => v.id)).toEqual(['com.apple.voice.enhanced.es-MX.Paulina', 'es-419', 'es-es-x-eea', 'es-mx-x-mxa'])
    expect(voices[0]).toEqual({ id: 'com.apple.voice.enhanced.es-MX.Paulina', name: 'Paulina', language: 'es-mx', enhanced: true })
    expect(voices.find((v) => v.id === 'es-mx-x-mxa')?.language).toBe('es-mx')
  })

  it('recuerda la voz guardada solo si sigue instalada', () => {
    const voices = spanishVoices(system)
    expect(pickVoice(voices, 'es-es-x-eea')?.name).toBe('es-es-x-eea-local')
    expect(pickVoice(voices, 'desinstalada')).toBeNull()
    expect(pickVoice(voices, null)).toBeNull()
  })

  it('etiqueta con nombre, idioma y calidad, sin inventar el sexo', () => {
    const voices = spanishVoices(system)
    expect(voiceLabel(voices[0]!)).toBe('Paulina · es-mx · mejorada')
    expect(voiceLabel(voices[3]!)).toBe('es-mx-x-mxa-local · es-mx')
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

  it('lee lo guardado con tolerancia', () => {
    expect(parseVoiceSettings(null)).toEqual({ voiceId: null, rate: 1, narratorPitch: DEFAULT_NARRATOR_PITCH })
    expect(parseVoiceSettings({ voiceId: '  ', rate: '2', narratorPitch: 12 })).toEqual({ voiceId: null, rate: 1, narratorPitch: 1.1 })
    expect(parseVoiceSettings({ voiceId: 'es-mx-x-mxa', rate: 1.2, narratorPitch: 0.8 })).toEqual({ voiceId: 'es-mx-x-mxa', rate: 1.2, narratorPitch: 0.8 })
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
