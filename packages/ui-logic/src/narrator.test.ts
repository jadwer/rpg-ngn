import { describe, expect, it } from 'vitest'
import { NARRATOR_IDLE, narratorLabel, narratorReducer, narratorsToFlag, nobodyNarrates, voiceLineSummary } from './narrator.js'
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

describe('narratorsToFlag', () => {
  const jaz = { memberId: 2, name: 'Jaz', characterId: 'zahira' }
  const armando = { memberId: 3, name: 'Armando', characterId: null }

  it('otro dispositivo narrando enciende la bandera', () => {
    expect(narratorsToFlag([jaz], 9, NARRATOR_IDLE).someoneNarrating).toBe(true)
  })

  it('uno mismo narrando no cuenta: ya lo sabe', () => {
    expect(narratorsToFlag([jaz], 2, NARRATOR_IDLE).someoneNarrating).toBe(false)
    expect(narratorsToFlag([], 2, NARRATOR_IDLE)).toBe(NARRATOR_IDLE)
  })

  it('conserva lo descartado por la mesa y no cambia el objeto si nada cambio', () => {
    const dismissed = { someoneNarrating: true, dismissed: true }
    expect(narratorsToFlag([jaz], 9, dismissed)).toBe(dismissed)
    expect(narratorsToFlag([], 9, dismissed)).toEqual({ someoneNarrating: false, dismissed: true })
  })

  it('nombra a quien narra por su personaje, su nombre o generico', () => {
    const nameOf = (id: string) => (id === 'zahira' ? 'Zahira' : id)
    expect(narratorLabel([jaz], 9, nameOf)).toBe('Zahira narra')
    expect(narratorLabel([armando], 9, nameOf)).toBe('Armando narra')
    expect(narratorLabel([{ memberId: 4, name: null, characterId: null }], 9, nameOf, 'teléfono')).toBe('Otro teléfono narra')
    expect(narratorLabel([jaz], 2, nameOf)).toBeNull()
  })
})
