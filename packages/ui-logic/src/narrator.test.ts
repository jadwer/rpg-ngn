import { describe, expect, it } from 'vitest'
import { NARRATOR_IDLE, narratorReducer, nobodyNarrates, voiceLineSummary } from './narrator.js'
import type { TtsState } from './tts.js'

const idle: TtsState = { status: 'idle', index: -1, total: 4 }
const speaking: TtsState = { status: 'speaking', index: 1, total: 4 }
const paused: TtsState = { status: 'paused', index: 1, total: 4 }
const done: TtsState = { status: 'done', index: -1, total: 4 }

describe('bandera de narrador', () => {
  it('se marca, se descarta y se restaura sin crear estados iguales', () => {
    const on = narratorReducer(NARRATOR_IDLE, { type: 'set', value: true })
    expect(on.someoneNarrating).toBe(true)
    expect(narratorReducer(on, { type: 'set', value: true })).toBe(on)
    const dismissed = narratorReducer(NARRATOR_IDLE, { type: 'dismiss' })
    expect(dismissed.dismissed).toBe(true)
    expect(narratorReducer(dismissed, { type: 'dismiss' })).toBe(dismissed)
    expect(narratorReducer(dismissed, { type: 'restore' })).toEqual(NARRATOR_IDLE)
    expect(narratorReducer(NARRATOR_IDLE, { type: 'restore' })).toBe(NARRATOR_IDLE)
  })

  it('avisa solo cuando nadie lee y la mesa no lo descarto', () => {
    expect(nobodyNarrates(NARRATOR_IDLE, false)).toBe(true)
    expect(nobodyNarrates(NARRATOR_IDLE, true)).toBe(false)
    expect(nobodyNarrates({ someoneNarrating: true, dismissed: false }, false)).toBe(false)
    expect(nobodyNarrates({ someoneNarrating: false, dismissed: true }, false)).toBe(false)
  })
})

describe('resumen de la linea de voz', () => {
  it('prioriza el error, luego la lectura en curso, luego quien narra', () => {
    expect(voiceLineSummary({ state: speaking, nativePause: true, error: 'sin voz', narrator: NARRATOR_IDLE, autoRead: null })).toEqual({ text: 'Voz: sin voz', warn: true })
    expect(voiceLineSummary({ state: speaking, nativePause: true, error: null, narrator: NARRATOR_IDLE, autoRead: null }).text).toBe('Leyendo 2 de 4')
    expect(voiceLineSummary({ state: paused, nativePause: true, error: null, narrator: NARRATOR_IDLE, autoRead: null }).text).toBe('En pausa, 2 de 4')
    expect(voiceLineSummary({ state: paused, nativePause: false, error: null, narrator: NARRATOR_IDLE, autoRead: null }).text).toBe('En pausa; Seguir salta al bloque 3')
    expect(voiceLineSummary({ state: idle, nativePause: true, error: null, narrator: { someoneNarrating: true, dismissed: false }, autoRead: null }).text).toBe('Otro teléfono narra')
    expect(voiceLineSummary({ state: idle, nativePause: true, error: null, narrator: { someoneNarrating: true, dismissed: false }, autoRead: null, device: 'dispositivo' }).text).toBe('Otro dispositivo narra')
  })

  it('con nadie narrando avisa en color; descartado, cuenta lo demas', () => {
    expect(voiceLineSummary({ state: idle, nativePause: true, error: null, narrator: NARRATOR_IDLE, autoRead: true })).toEqual({ text: 'Nadie narra en voz alta', warn: true })
    const quiet = { someoneNarrating: false, dismissed: true }
    expect(voiceLineSummary({ state: idle, nativePause: true, error: null, narrator: quiet, autoRead: true }).text).toBe('Leerá lo nuevo')
    expect(voiceLineSummary({ state: done, nativePause: true, error: null, narrator: quiet, autoRead: false }).text).toBe('Lectura terminada')
    expect(voiceLineSummary({ state: idle, nativePause: true, error: null, narrator: quiet, autoRead: null }).text).toBe('Voz lista')
  })
})
